/**
 * Impact Lab results — the published snapshot.
 *
 * Pure and dependency-free (no Prisma, no Next) so the rules that decide what
 * 93 builders are told can be asserted by a script.
 *
 * Two rules carry all the weight:
 *
 * 1. The three winners announced in the room hold ranks 1-3, whatever the
 *    arithmetic says. The panel watched every demo and deliberated; no
 *    combination of the recorded scores reproduces their decision, and the
 *    announcement is already public. Recomputing it would contradict what
 *    people were told to their faces.
 * 2. Everyone else ranks below them by score. Scores order the list but are
 *    never printed in it — publishing them would place a 76.9 at 4th above a
 *    75.3 at 1st, which is the contradiction this ranking exists to remove.
 *    A team's own numbers live on its own private card.
 */

import { trackOf, type TeamStanding } from "./judging"
import { REVIEW_SIGNATURE, type TeamJudgeNote } from "./reviews"

/** How a team's placing was arrived at. */
export type ResultBasis = "announced" | "demo" | "submission"

export interface RankedTeam {
  rank: number
  teamId: string
  projectName: string
  track: string
  /** Orders the ranking. Never rendered in the public table. */
  average: number
  basis: ResultBasis
}

export interface AnnouncedWinner {
  rank: number
  teamId: string
  projectName: string
}

export interface ResultsTrackWinner {
  track: string
  teamId: string
  projectName: string
  /** "announced" when an overall winner leads the track, else "score". */
  basis: "announced" | "score"
}

/** Served only to members of that team. */
export interface TeamCard {
  rank: number
  criterionAverages: Record<string, number>
  /** `null` when no range was recorded — distinct from an earned zero. */
  low: number | null
  /** `null` when no range was recorded — distinct from an earned zero. */
  high: number | null
  basis: "demo" | "submission"
}

export interface ResultsSnapshot {
  publishedAt: string
  overall: AnnouncedWinner[]
  trackWinners: ResultsTrackWinner[]
  ranking: RankedTeam[]
  perTeam: Record<string, TeamCard>
}

export interface ResultsInput {
  publishedAt: string
  /** Announced winners in announced order. Empty is legal; three is the case. */
  announcedTeamIds: string[]
  standings: TeamStanding[]
  teams: Map<string, { projectName: string; track: string }>
  /** Teams scored from the written submission rather than a live demo. */
  writeupOnly: Set<string>
  /** Lowest and highest weighted total across that team's judges. */
  range: Map<string, { low: number; high: number }>
}

const UNKNOWN_TRACK = "Unassigned"

function metaOf(
  input: ResultsInput,
  teamId: string
): { projectName: string; track: string } {
  const meta = input.teams.get(teamId)
  if (meta) return meta
  // A team present in standings but absent from the run JSON should not be able
  // to crash publication; it appears with its id rather than vanishing.
  return { projectName: teamId, track: UNKNOWN_TRACK }
}

/**
 * Announced winners first in announced order, then everyone else by average
 * descending. Ties break by teamId so two loads never reorder themselves.
 */
export function buildRanking(input: ResultsInput): RankedTeam[] {
  const announced = new Set(input.announcedTeamIds)
  const byTeam = new Map(input.standings.map((s) => [s.teamId, s]))

  const rows: RankedTeam[] = []

  for (const teamId of input.announcedTeamIds) {
    const meta = metaOf(input, teamId)
    rows.push({
      rank: rows.length + 1,
      teamId,
      projectName: meta.projectName,
      track: meta.track || trackOf(meta.projectName),
      average: byTeam.get(teamId)?.average ?? 0,
      basis: "announced",
    })
  }

  const rest = input.standings
    .filter((s) => !announced.has(s.teamId))
    .sort((a, b) => b.average - a.average || a.teamId.localeCompare(b.teamId))

  for (const s of rest) {
    const meta = metaOf(input, s.teamId)
    rows.push({
      rank: rows.length + 1,
      teamId: s.teamId,
      projectName: meta.projectName,
      track: meta.track || trackOf(meta.projectName),
      average: s.average,
      basis: input.writeupOnly.has(s.teamId) ? "submission" : "demo",
    })
  }

  return rows
}

/**
 * One winner per track. An announced overall winner leads its own track — so
 * the champion never appears to lose its own category on the same page that
 * crowns it. Tracks with no announced winner go to their highest-ranked team.
 */
export function buildTrackWinners(ranking: RankedTeam[]): ResultsTrackWinner[] {
  const best = new Map<string, ResultsTrackWinner>()

  // `ranking` is already ordered with announced winners first, so the first
  // sighting of a track is its winner.
  for (const row of ranking) {
    if (best.has(row.track)) continue
    best.set(row.track, {
      track: row.track,
      teamId: row.teamId,
      projectName: row.projectName,
      basis: row.basis === "announced" ? "announced" : "score",
    })
  }

  return [...best.values()].sort((a, b) => a.track.localeCompare(b.track))
}

/** A ranking row as participants may receive it. */
export type PublicRankedTeam = Omit<RankedTeam, "average">

/**
 * The ranking with scores removed, for anything that crosses the wire to a
 * participant.
 *
 * `average` orders the ranking and must stay in the stored snapshot — the
 * ordering has to be reproducible from what was published. But sending it to a
 * browser would let anyone with devtools read every team's score off a page
 * that shows none, which is the contradiction the announced-winner override
 * exists to remove. Strip it here, once, rather than trusting each route to
 * remember.
 *
 * Built field-by-field rather than destructure-and-omit: this project's
 * eslint config runs `@typescript-eslint/no-unused-vars` with no
 * `varsIgnorePattern`, so a discarded `average` binding — even underscore-
 * prefixed — would still surface as a lint warning.
 */
export function toPublicRanking(ranking: RankedTeam[]): PublicRankedTeam[] {
  return ranking.map((row) => ({
    rank: row.rank,
    teamId: row.teamId,
    projectName: row.projectName,
    track: row.track,
    basis: row.basis,
  }))
}

/**
 * The two streams of written feedback a team may receive, kept apart by
 * construction (see @/lib/impact-lab/reviews): a judge's own quoted words
 * under that judge's name, and the community's review under the community's.
 */
export interface TeamFeedback {
  /** Notes a judge actually wrote, quoted (spelling/casing corrected only). */
  judgeNotes: TeamJudgeNote[]
  /** The approved community review, or null when none is approved yet. */
  review: string | null
}

/** The community review as one participant receives it — text plus signer. */
export interface TeamReviewPayload {
  text: string
  /** Always REVIEW_SIGNATURE — carried in-band so the label crosses the wire with the words. */
  signedBy: string
}

/** The published result as one participant may receive it. Flat member shape — no `data` wrapper. */
export interface MemberResultsPayload {
  success: true
  published: boolean
  results?: {
    publishedAt: string
    overall: AnnouncedWinner[]
    trackWinners: ResultsTrackWinner[]
    ranking: PublicRankedTeam[]
  }
  yourTeam?: {
    teamId: string
    projectName: string
    card: TeamCard
    /** Present only when a judge left a note on this team. */
    judgeNotes?: TeamJudgeNote[]
    /** Present only when the organiser has approved this team's review. */
    review?: TeamReviewPayload
  }
}

/**
 * The published result as one participant may receive it.
 *
 * Lives here rather than inline in the route so the privacy properties can be
 * asserted: the snapshot holds every team's private card and a score on every
 * ranking row, and neither may cross the wire. Building the payload by naming
 * each field — never by spreading the snapshot — means a field added to the
 * snapshot later does not leak by default.
 *
 * `viewerTeamId` is the caller's own team, or `null` when it could not be
 * resolved (not registered, not on a team in the frozen run, or a stale id).
 * `yourTeam` is omitted from the returned object entirely in that case, and
 * also when the resolved team has no card or no ranking row — never set to
 * `null` or an empty object, so `"yourTeam" in payload` is the true test of
 * whether a card was attached.
 */
export function buildMemberPayload(
  snapshot: ResultsSnapshot,
  viewerTeamId: string | null,
  /**
   * Written feedback for the viewer's own team ONLY — the caller must never
   * pass another team's. It rides inside `yourTeam`, so a viewer with no
   * resolvable team can receive none of it by construction.
   */
  feedback?: TeamFeedback
): MemberResultsPayload {
  const payload: MemberResultsPayload = {
    success: true,
    published: true,
    results: {
      publishedAt: snapshot.publishedAt,
      overall: snapshot.overall,
      trackWinners: snapshot.trackWinners,
      ranking: toPublicRanking(snapshot.ranking),
    },
  }

  const card = viewerTeamId ? snapshot.perTeam[viewerTeamId] : undefined
  const rankingRow = viewerTeamId
    ? snapshot.ranking.find((r) => r.teamId === viewerTeamId)
    : undefined

  if (viewerTeamId && card && rankingRow) {
    payload.yourTeam = {
      teamId: viewerTeamId,
      projectName: rankingRow.projectName,
      card,
    }
    if (feedback && feedback.judgeNotes.length > 0) {
      payload.yourTeam.judgeNotes = feedback.judgeNotes
    }
    if (feedback && feedback.review !== null) {
      payload.yourTeam.review = { text: feedback.review, signedBy: REVIEW_SIGNATURE }
    }
  }

  return payload
}

/**
 * Cheap duck-typed shape check on a stored `resultsSnapshot` JSON value before
 * it is cast to `ResultsSnapshot`. Not full schema validation — just enough
 * that a malformed or legacy-shaped snapshot fails cleanly wherever it is
 * read (the notify route, the email preview route) rather than throwing an
 * unhandled exception mid-request (e.g. on `snapshot.perTeam[id]` for a
 * `perTeam` that isn't actually an object).
 */
export function isResultsSnapshot(value: unknown): value is ResultsSnapshot {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.overall) &&
    Array.isArray(v.trackWinners) &&
    Array.isArray(v.ranking) &&
    typeof v.perTeam === "object" &&
    v.perTeam !== null
  )
}

export function buildSnapshot(input: ResultsInput): ResultsSnapshot {
  const ranking = buildRanking(input)
  const standingById = new Map(input.standings.map((s) => [s.teamId, s]))

  const perTeam: Record<string, TeamCard> = {}
  for (const row of ranking) {
    const standing = standingById.get(row.teamId)
    const range = input.range.get(row.teamId)
    perTeam[row.teamId] = {
      rank: row.rank,
      criterionAverages: standing?.criterionAverages ?? {},
      low: range?.low ?? null,
      high: range?.high ?? null,
      basis: input.writeupOnly.has(row.teamId) ? "submission" : "demo",
    }
  }

  return {
    publishedAt: input.publishedAt,
    overall: input.announcedTeamIds.map((teamId, i) => ({
      rank: i + 1,
      teamId,
      projectName: metaOf(input, teamId).projectName,
    })),
    trackWinners: buildTrackWinners(ranking),
    ranking,
    perTeam,
  }
}
