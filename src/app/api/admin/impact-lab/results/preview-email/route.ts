import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiPermission } from "@/lib/rbac"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { buildResultsInputFromRun, loadTeamFeedback } from "@/lib/impact-lab/results-input"
import { buildSnapshot, isResultsSnapshot, type ResultsInput, type ResultsSnapshot } from "@/lib/impact-lab/results"
import {
  placementFor,
  placementTitle,
  placingsFollowScores,
  resultCardUrl,
  type Placement,
} from "@/lib/impact-lab/result-card"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
import { APP_URL, impactLabResultsEmail, resultsOrdinal } from "@/lib/email"

/**
 * The one-line sentence an organiser reads before confirming a publish or a
 * correction — "ElimuTayari will be told: Runner-up, 3rd overall." This is
 * the fix for Impact Lab 02 (3 September 2026): three teams were ticked, the
 * panel's actual per-track calls, and published as an overall 1-2-3 naming a
 * team that had won nothing — caught two days later by reading the PDF. A
 * plain sentence, read before the click, is meant to be the thing that makes
 * an operator stop.
 *
 * Built from the same `Placement` the email itself renders from
 * (`placementFor`/`placementTitle`), so this sentence and the email an
 * organiser is being warned about can never disagree with each other.
 */
export function announcementHeadline(
  placement: Placement | null,
  mode: "podium" | "tracks" | "champion"
): string {
  if (!placement) return "Not part of the published result."
  if (placement.kind === "participant") return "Took part — not scored in the finals."
  const title = placementTitle(placement)
  // No overall podium exists in "tracks" mode, and in "champion" mode a
  // non-champion track winner has no overall placing either — only the
  // champion itself does (`placement.announced`, set from `snapshot.overall`,
  // which holds only the champion in this mode). Both phrase by track
  // position, never "Nth overall", so neither can imply a podium that was
  // never announced.
  if (mode === "tracks" || (mode === "champion" && !placement.announced)) {
    return title === "Built"
      ? `Finished ${resultsOrdinal(placement.position)} of ${placement.of} in the ${placement.track} track.`
      : `${title} of the ${placement.track} track.`
  }
  return placement.announced
    ? `${title} — ${resultsOrdinal(placement.overallRank)} overall.`
    : `Finished ${resultsOrdinal(placement.position)} of ${placement.of} in the ${placement.track} track (by score).`
}

/**
 * Render one team's real results email. Preview only — never sends, never
 * writes. There is no path from here to Resend and no path to a database
 * write; a reviewer can grep this file for `sendEmail` or a `.create`/
 * `.update` call and find neither.
 *
 * This exists because the batch send's own "send to one address" test
 * (`notify/route.ts`) deliberately fabricates the "your team" scorecard —
 * SAMPLE_CARD there, on purpose, so a mistyped test address can never leak a
 * real team's private numbers to a stranger. That leaves nobody able to
 * check whether a *specific* team's email renders that team's *actual*
 * numbers correctly, and publishing (which is irreversible) happens before
 * any email is ever seen. A preview rendered in the organiser's own browser
 * has no address to mistype, so it carries none of the risk SAMPLE_CARD
 * exists to avoid — and the organiser already has this data through the rest
 * of the admin panel.
 *
 * Built with the exact `impactLabResultsEmail()` template `notify/route.ts`
 * sends with — not a second renderer. Two implementations of "what does this
 * email look like" is exactly how a preview and a real send drift apart.
 *
 * Works both before and after publishing:
 *  - After publish, the team's card is read straight off the frozen
 *    `resultsSnapshot` — the same data `notify/route.ts` sends from — so
 *    this is guaranteed to match what already went out or is about to.
 *  - Before publish, there is no snapshot yet, so this computes the same
 *    `ResultsInput` `publish/route.ts` would (via the shared
 *    `buildResultsInputFromRun` helper) and runs it through the same
 *    `buildSnapshot`, INCLUDING the announced winners the organiser has
 *    selected, passed in `?announced=`.
 *
 *    Those ids are not decoration: they decide the overall placing and which
 *    team leads each track. Without them this endpoint rendered the score-only
 *    ranking — so the preview named a different champion and two different
 *    track winners than the email it claimed to be previewing, under a banner
 *    promising publishing would freeze exactly what was on screen. A preview
 *    that can disagree with the send is worse than no preview, because it is
 *    trusted.
 * `data.published` tells the caller which path rendered the response, so the
 * UI can say so on screen.
 *
 * Pre-publish, `?announcementMode=podium|tracks` (default `podium`) is
 * threaded into the same `ResultsInput` `publish/route.ts` and
 * `results/correct/route.ts` build from `announcedTeamIds` — a tracks-mode
 * proposal previewed under the podium default would show a headline no team
 * is actually about to receive. `data.headline` is the one-line sentence the
 * publish and correction dialogs read back before confirming (see
 * `announcementHeadline` above) — computed from the same `Placement` the
 * email itself renders from, never a second description of it.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  // `resolveRubric`, not the code constant: an organiser-authored rubric for
  // this cohort must score this preview the same way it scores the live
  // judging screen and the eventual publish.
  const rubric = await resolveRubric(cohort)
  // The event's tracks, so a team's track label comes from the track it was
  // matched into rather than from parsing its name (see `resolveTeamTrack`).
  const event = await getEventByCohort(cohort)
  const teamId = (request.nextUrl.searchParams.get("teamId") ?? "").trim()
  if (teamId === "" || teamId.length > 64) {
    return NextResponse.json(
      { success: false, error: "Provide a team to preview." },
      { status: 400 }
    )
  }

  // Comma-separated team ids. Capped and de-duplicated: this only ever feeds
  // a render, but an unbounded list from a query string has no business
  // reaching the snapshot builder. Capped at 20 to match `publish/route.ts`
  // and `results/correct/route.ts`'s own `announcedTeamIds` limit — a
  // 3-team cap (the old podium-only limit) would silently truncate a
  // tracks-mode proposal with more than three tracks.
  const announcedParam = (request.nextUrl.searchParams.get("announced") ?? "").trim()
  const requestedAnnounced = announcedParam === ""
    ? []
    : [...new Set(
        announcedParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "" && id.length <= 64)
      )].slice(0, 20)
  // Champion mode's second id list — the announced track winners. Same
  // parsing and cap as `announced` above; empty (and ignored by
  // `buildSnapshot`) in every other mode.
  const trackWinnersParam = (request.nextUrl.searchParams.get("announcedTrackWinnerIds") ?? "").trim()
  const requestedTrackWinners = trackWinnersParam === ""
    ? []
    : [...new Set(
        trackWinnersParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "" && id.length <= 64)
      )].slice(0, 20)
  const modeParam = request.nextUrl.searchParams.get("announcementMode")
  const announcementMode: "podium" | "tracks" | "champion" =
    modeParam === "tracks" ? "tracks" : modeParam === "champion" ? "champion" : "podium"

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsSnapshot: true, resultsPublishedAt: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort." },
      { status: 409 }
    )
  }

  const published = Boolean(
    run.resultsPublishedAt && run.resultsSnapshot && isResultsSnapshot(run.resultsSnapshot)
  )

  let snapshot: ResultsSnapshot
  let teamName: string
  let recipientCount: number
  let table: number | null

  if (published) {
    // isResultsSnapshot already narrowed the shape above; Prisma's JsonValue
    // return type doesn't structurally overlap with ResultsSnapshot, so the
    // cast has to go through `unknown`.
    snapshot = run.resultsSnapshot as unknown as ResultsSnapshot

    const teams = extractFrozenTeams(run.result) ?? []
    const team = teams.find((t) => t.id === teamId)
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found in this run." },
        { status: 404 }
      )
    }
    teamName = team.name
    table = team.table ?? null
    recipientCount = team.memberIds.length
  } else {
    const { input: inputBase, teams, submittedTeamIds, scoredTeamIds } =
      await buildResultsInputFromRun(prisma, run.id, run.result, rubric, event?.tracks ?? [])

    const team = teams.find((t) => t.id === teamId)
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found in this run." },
        { status: 404 }
      )
    }
    if (!submittedTeamIds.has(teamId)) {
      return NextResponse.json(
        {
          success: false,
          error: "This team has no submission, so it will not receive a results email.",
        },
        { status: 409 }
      )
    }
    if (!scoredTeamIds.has(teamId)) {
      return NextResponse.json(
        { success: false, error: "This team has not been scored yet — there is nothing to preview." },
        { status: 409 }
      )
    }

    const input: ResultsInput = {
      ...inputBase,
      publishedAt: new Date().toISOString(),
      announcementMode,
      // Filter to scored teams — the same eligibility the admin picker
      // enforces (`ResultsTab.tsx`'s `eligibleWinners`), so a stale selection
      // left in the form cannot preview a winner the panel never actually
      // scored.
      announcedTeamIds: requestedAnnounced.filter((id) => scoredTeamIds.has(id)),
      announcedTrackWinnerIds: requestedTrackWinners.filter((id) => scoredTeamIds.has(id)),
    }
    snapshot = buildSnapshot(input)
    teamName = team.name
    table = team.table ?? null
    recipientCount = team.memberIds.length
  }

  const card = snapshot.perTeam[teamId]
  const rankingRow = snapshot.ranking.find((r) => r.teamId === teamId)
  if (!card || !rankingRow) {
    return NextResponse.json(
      { success: false, error: "This team has no score yet — there is nothing to preview." },
      { status: 409 }
    )
  }

  // Same feedback loader and gates as the batch send: judge notes quoted
  // under the judge's name, community review only once approved. The preview
  // therefore shows exactly what would go out — an unapproved draft is
  // absent here precisely because it would be absent from the real send.
  const feedback = (await loadTeamFeedback(prisma, run.id, [teamId])).get(teamId)

  // The published snapshot's own recorded mode wins once it exists — a
  // published run is never re-read through the query string's mode, only a
  // pre-publish proposal is. See `ResultsSnapshot.announcementMode`.
  const effectiveMode = published ? (snapshot.announcementMode ?? "podium") : announcementMode
  const placement = placementFor(snapshot, teamId)

  const dashboardUrl = `${APP_URL}/dashboard/impact-lab`
  const built = impactLabResultsEmail({
    // The batch send personalises this per recipient; a team's email is
    // otherwise identical across its members, so "there" previews the
    // shared content rather than picking one teammate to stand in for all
    // of them — matching the same choice notify/route.ts's own test send
    // makes for SAMPLE_CARD.
    fullName: "there",
    projectName: rankingRow.projectName,
    teamName,
    table,
    eventName: event?.name ?? "Impact Lab",
    placement,
    announcementMode: effectiveMode,
    panelOverrodeScores: !placingsFollowScores(snapshot),
    // The real card URL, so the organiser can click through from the preview.
    // Before publish the page 404s (the run is not published yet) — the link
    // is still the one the send will carry.
    shareUrl: resultCardUrl(APP_URL, run.id, teamId),
    rank: card.rank,
    criterionAverages: card.criterionAverages,
    low: card.low,
    high: card.high,
    basis: card.basis,
    overall: snapshot.overall,
    trackWinners: snapshot.trackWinners,
    dashboardUrl,
    judgeNotes: feedback?.judgeNotes ?? [],
    communityReview: feedback?.review ?? null,
    rubric,
  })

  return NextResponse.json({
    success: true,
    data: {
      html: built.html,
      subject: built.subject,
      teamName,
      projectName: rankingRow.projectName,
      recipientCount,
      published,
      // The publish/correction dialogs' pre-confirm sentence — see
      // `announcementHeadline`'s own doc comment for why it exists.
      headline: announcementHeadline(placement, effectiveMode),
    },
  })
}
