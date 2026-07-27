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
  low: number
  high: number
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
      low: range?.low ?? 0,
      high: range?.high ?? 0,
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
