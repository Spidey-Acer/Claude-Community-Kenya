/**
 * Solo placement: lets a registered participant submit without an organiser
 * matching step, for cohorts that opt in via `soloPlacement` in
 * `submission-requirements.ts`.
 *
 * A submission is keyed on (runId, teamId) and the submission route refuses
 * anyone who is not on a team in the cohort's final run. For a one-evening
 * build with no matching, this helper puts a registered participant who is on
 * no team into a new team of one in that final run, creating the run when the
 * cohort has none. A team of 2-4 submits once and names teammates in the
 * description, so nobody else is moved or merged.
 *
 * Concurrency: dozens of people can arrive in the same minute.
 *  - Existing run: `withRunLock` row-locks it, each request re-reads the fresh
 *    roster before appending, so no write is lost and nobody is placed twice.
 *  - No run yet: a transaction-scoped Postgres advisory lock keyed on the
 *    cohort serialises creation, so only one final run is ever made (the
 *    partial unique index on isFinal is the backstop). Losers fall through to
 *    the existing-run path.
 *
 * Team ids are `solo-<participantId>`: unique per participant and never
 * recycled (a numeric suffix is added if that id is somehow already taken).
 * Only the caller's own participant id is ever placed; the caller derives it
 * from the signed-in session.
 */

import { prisma } from "@/lib/prisma"
import { DEFAULT_SETTINGS } from "@/lib/matching"
import type { MatchParticipant, MatchResult, ScoreBreakdown } from "@/lib/matching"
import type { ImpactLabParticipant } from "@/generated/prisma/client"
import { extractFrozenTeams } from "./member"
import { toMatchParticipant } from "./mappers"
import { withRunLock, writeRunResult } from "./run-lock"
import { extractUnassignedIds, type TeamWithLeader } from "./roster"
import { findTeamFor } from "./submission-state"
import { submissionRequirementsForCohort } from "./submission-requirements"
import { resolveTrack, type Track } from "./tracks"

/** What `ensureSoloTeam` did, for callers that care and for tests. */
export type SoloPlacementOutcome =
  | "not_applicable" // cohort has not opted in; nothing was read or written
  | "already_placed" // caller is already on a team; nothing was written
  | "placed" // a team of one was added (or the run was created with it)
  | "skipped" // caller has no participant row, or the final run is unreadable

export interface SoloPlacementInput {
  cohort: string
  participantId: string
  /** The event's tracks, used to pick the team's trackKey from the person's interests. */
  tracks: Track[]
}

/** Solo teams carry no computed score; same convention as pre-formed teams. */
const ZERO_SCORE: ScoreBreakdown = { total: 0, dimensions: [], penalties: [], penaltyTotal: 0 }

const SOLO_RUN_NAME = "Open submissions (solo placement)"
const SOLO_RUN_NOTES =
  "Created automatically for a cohort with no organiser matching step: each " +
  "registered participant is placed in a team of one on first visit."

/** Pick a team id for this participant that no existing team uses. */
function uniqueTeamId(participantId: string, takenIds: Set<string>): string {
  const base = `solo-${participantId}`
  if (!takenIds.has(base)) return base
  let suffix = 2
  while (takenIds.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

/** A team of one satisfying `Team` and `extractFrozenTeams`. */
function buildSoloTeam(
  participant: ImpactLabParticipant,
  tracks: Track[],
  takenIds: Set<string>
): TeamWithLeader {
  const trackKey = resolveTrack(tracks, participant.interests)
  return {
    id: uniqueTeamId(participant.id, takenIds),
    name: `${participant.fullName}'s team`,
    memberIds: [participant.id],
    locked: true,
    leaderId: participant.id,
    score: ZERO_SCORE,
    ...(trackKey ? { trackKey } : {}),
  }
}

/** The cohort's final run, newest first (same lookup the member routes use). */
function findFinalRun(cohort: string) {
  return prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
}

/**
 * Create the cohort's final run holding just this team. Returns false when
 * another request created a final run first (caller then appends to it).
 */
async function createFinalRun(
  cohort: string,
  participant: ImpactLabParticipant,
  tracks: Track[]
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`impact-lab-solo-run:${cohort}`}))`
    const existing = await tx.impactLabMatchRun.findFirst({
      where: { cohort, isFinal: true },
      select: { id: true },
    })
    if (existing) return false

    const team = buildSoloTeam(participant, tracks, new Set())
    const settings = { ...DEFAULT_SETTINGS, tracks }
    const result: MatchResult = {
      teams: [team],
      unassignedIds: [],
      warnings: [],
      averageScore: 0,
      settingsUsed: settings,
    }
    await tx.impactLabMatchRun.create({
      data: {
        cohort,
        name: SOLO_RUN_NAME,
        notes: SOLO_RUN_NOTES,
        isFinal: true,
        settings: JSON.parse(JSON.stringify(settings)),
        result: JSON.parse(JSON.stringify(result)),
        participantsSnapshot: JSON.parse(JSON.stringify([toMatchParticipant(participant)])),
      },
    })
    return true
  })
}

/** Append a team of one to an existing run under its row lock. */
async function appendToRun(
  runId: string,
  participant: ImpactLabParticipant,
  tracks: Track[]
): Promise<SoloPlacementOutcome> {
  return withRunLock(runId, async (tx): Promise<SoloPlacementOutcome> => {
    const run = await tx.impactLabMatchRun.findUnique({
      where: { id: runId },
      select: { result: true, participantsSnapshot: true },
    })
    if (!run) return "skipped"
    const teams = extractFrozenTeams(run.result)
    if (!teams) return "skipped"
    // Re-checked under the lock: a concurrent request may have placed them.
    if (findTeamFor(teams, participant.id)) return "already_placed"

    const team = buildSoloTeam(participant, tracks, new Set(teams.map((t) => t.id)))
    const stillUnassigned = extractUnassignedIds(run.result).filter((id) => id !== participant.id)
    await writeRunResult(tx, runId, {
      ...(run.result as Record<string, unknown>),
      teams: [...teams, team],
      unassignedIds: stillUnassigned,
    })

    const snapshot = Array.isArray(run.participantsSnapshot)
      ? (run.participantsSnapshot as unknown as MatchParticipant[])
      : []
    if (!snapshot.some((p) => p.id === participant.id)) {
      await tx.impactLabMatchRun.update({
        where: { id: runId },
        data: {
          participantsSnapshot: JSON.parse(
            JSON.stringify([...snapshot, toMatchParticipant(participant)])
          ),
        },
      })
    }
    return "placed"
  })
}

/**
 * Ensure the participant is on a team in their cohort's final run, for
 * opted-in cohorts only. Idempotent; never moves anyone already on a team and
 * never edits another team. Every other cohort returns "not_applicable"
 * before touching the database.
 */
export async function ensureSoloTeam(input: SoloPlacementInput): Promise<SoloPlacementOutcome> {
  const { cohort, participantId, tracks } = input
  if (!submissionRequirementsForCohort(cohort).soloPlacement) return "not_applicable"

  let run = await findFinalRun(cohort)
  if (run) {
    const teams = extractFrozenTeams(run.result)
    if (!teams) return "skipped"
    if (findTeamFor(teams, participantId)) return "already_placed"
  }

  const participant = await prisma.impactLabParticipant.findFirst({
    where: { id: participantId, cohort },
  })
  if (!participant) return "skipped"

  if (!run) {
    if (await createFinalRun(cohort, participant, tracks)) return "placed"
    run = await findFinalRun(cohort)
    if (!run) return "skipped"
  }
  return appendToRun(run.id, participant, tracks)
}
