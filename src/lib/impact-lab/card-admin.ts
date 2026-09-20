/**
 * The organiser's view of every team's share card for one cohort, before
 * or after publish.
 *
 * After publish the cards are read off the frozen `resultsSnapshot`, exactly
 * as `findResultCardBySlug` reads them for the public page. Before publish
 * there is no snapshot, so this computes the one `publish/route.ts` would
 * (`buildResultsInputFromRun` + `buildSnapshot`), including the announced
 * winners the organiser has selected, passed as a `CardProposal` — the same
 * shape and caps `preview-email/route.ts` reads off its query string, for
 * the same reason: without them a pre-publish preview names a different
 * champion than the publish will.
 *
 * Read-only. No Resend, no writes; a reviewer can grep this file for
 * `.create`/`.update`/`sendEmail` and find none.
 */

import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEventByCohort } from "./event-store"
import { extractFrozenTeams } from "./member"
import { cardPlacingLine, isChampion, placementFor, toPublicResultCard, type PublicResultCard } from "./result-card"
import { buildSnapshot, isResultsSnapshot, type ResultsInput, type ResultsSnapshot } from "./results"
import { buildResultsInputFromRun } from "./results-input"
import { resolveRubric } from "./rubric-store"

const FALLBACK_EVENT_NAME = "Impact Lab"

/** How the organiser has said the results will be announced — pre-publish only. */
export interface CardProposal {
  announcementMode: "podium" | "tracks" | "champion"
  announcedTeamIds: string[]
  announcedTrackWinnerIds: string[]
}

/** The order the admin Cards tab lists teams in. */
export type CardGroup = "champion" | "winner" | "runner-up" | "third" | "built"
export const CARD_GROUPS: CardGroup[] = ["champion", "winner", "runner-up", "third", "built"]

export interface AdminCardTeam {
  teamId: string
  teamName: string
  card: PublicResultCard
  /** The caps line the card prints, e.g. "DELIGHT WINNER". */
  placingLine: string
  group: CardGroup
}

export type AdminCards =
  | { ok: true; runId: string; published: boolean; teams: AdminCardTeam[] }
  | { ok: false; status: number; error: string }

/**
 * Comma-separated ids, de-duplicated, capped at 20 — the same parsing
 * `preview-email/route.ts` applies to its `announced` and
 * `announcedTrackWinnerIds` parameters and the same cap `publish/route.ts`
 * enforces on the body.
 */
function parseIdList(raw: string | null): string[] {
  const value = (raw ?? "").trim()
  if (value === "") return []
  return [...new Set(value.split(",").map((id) => id.trim()).filter((id) => id !== "" && id.length <= 64))].slice(0, 20)
}

/** The pre-publish proposal off a query string; ignored once a run is published. */
export function cardProposalFromSearchParams(params: NextRequest["nextUrl"]["searchParams"]): CardProposal {
  const modeParam = params.get("announcementMode")
  return {
    announcementMode: modeParam === "tracks" ? "tracks" : modeParam === "champion" ? "champion" : "podium",
    announcedTeamIds: parseIdList(params.get("announced")),
    announcedTrackWinnerIds: parseIdList(params.get("announcedTrackWinnerIds")),
  }
}

function groupFor(card: PublicResultCard): CardGroup {
  if (card.champion) return "champion"
  if (card.title === "Winner") return "winner"
  if (card.title === "Runner-up") return "runner-up"
  if (card.title === "Third place") return "third"
  return "built"
}

export async function loadAdminCards(cohort: string, proposal: CardProposal): Promise<AdminCards> {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsSnapshot: true, resultsPublishedAt: true },
  })
  if (!run) return { ok: false, status: 409, error: "No final run for this cohort." }

  const event = await getEventByCohort(cohort)
  const teams = extractFrozenTeams(run.result) ?? []
  const published = Boolean(run.resultsPublishedAt && isResultsSnapshot(run.resultsSnapshot))

  let snapshot: ResultsSnapshot
  if (published) {
    // isResultsSnapshot narrowed the shape above; Prisma's JsonValue does not
    // structurally overlap ResultsSnapshot, so the cast goes through unknown.
    snapshot = run.resultsSnapshot as unknown as ResultsSnapshot
  } else {
    const rubric = await resolveRubric(cohort)
    const { input: inputBase, submittedTeamIds, scoredTeamIds } = await buildResultsInputFromRun(
      prisma,
      run.id,
      run.result,
      rubric,
      event?.tracks ?? []
    )
    // Announced teams are ranked whatever their score rows say; everyone
    // else who submitted but was never scored is published as a participant
    // — the same split `publish/route.ts` makes.
    const announced = new Set([
      ...proposal.announcedTeamIds,
      ...(proposal.announcementMode === "champion" ? proposal.announcedTrackWinnerIds : []),
    ])
    const input: ResultsInput = {
      ...inputBase,
      publishedAt: new Date().toISOString(),
      announcementMode: proposal.announcementMode,
      announcedTeamIds: proposal.announcedTeamIds.filter((id) => scoredTeamIds.has(id)),
      announcedTrackWinnerIds: proposal.announcedTrackWinnerIds.filter((id) => scoredTeamIds.has(id)),
      unrankedTeamIds: [...submittedTeamIds].filter((id) => !scoredTeamIds.has(id) && !announced.has(id)).sort(),
    }
    snapshot = buildSnapshot(input)
  }

  // Frozen roster order for members, as the public card keeps it.
  const memberIds = [...new Set(teams.flatMap((t) => t.memberIds))]
  const participants = await prisma.impactLabParticipant.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, fullName: true },
  })
  const nameById = new Map(participants.map((p) => [p.id, p.fullName]))

  const cards: AdminCardTeam[] = []
  for (const team of teams) {
    const placement = placementFor(snapshot, team.id)
    if (!placement) continue
    const projectName =
      snapshot.ranking.find((r) => r.teamId === team.id)?.projectName ??
      (snapshot.unranked ?? []).find((u) => u.teamId === team.id)?.projectName
    if (!projectName) continue
    const card = toPublicResultCard({
      eventName: event?.name ?? FALLBACK_EVENT_NAME,
      eventDates: event?.dates ?? "",
      projectName,
      placement,
      champion: isChampion(snapshot, team.id),
      memberFullNames: team.memberIds.flatMap((id) => {
        const name = nameById.get(id)
        return name ? [name] : []
      }),
    })
    cards.push({ teamId: team.id, teamName: team.name, card, placingLine: cardPlacingLine(card), group: groupFor(card) })
  }

  cards.sort((a, b) => CARD_GROUPS.indexOf(a.group) - CARD_GROUPS.indexOf(b.group) || a.card.projectName.localeCompare(b.card.projectName))
  return { ok: true, runId: run.id, published, teams: cards }
}
