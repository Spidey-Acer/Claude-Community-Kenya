/**
 * Impact Lab results — the DB-backed half of building a `ResultsInput`.
 *
 * `results.ts` stays pure (no Prisma, no Next) so its ranking rules can be
 * asserted by a script. Everything that actually reads the database — the
 * frozen teams, the submissions, the score sheets, the per-team score
 * range — lives here instead, so `publish/route.ts` and
 * `results/preview-email/route.ts` compute those inputs from one place.
 * Two independent reimplementations of "what does this run's data look
 * like as a ResultsInput" is exactly how a preview and a real send drift
 * apart.
 */

import type { Prisma } from "@/generated/prisma/client"
import { extractFrozenTeams } from "./member"
import { standings, trackOf, weightedTotal, type JudgeScore, type ScoreSheet } from "./judging"
import type { ResultsInput } from "./results"
import type { Team } from "@/lib/matching"

/** Accepts either the top-level Prisma client or a `$transaction` callback's `tx`. */
type Db = Prisma.TransactionClient

export interface RunResultsData {
  /** Everything `buildSnapshot` needs except `publishedAt` and `announcedTeamIds` — those are caller-supplied, not read from the run. */
  input: Pick<ResultsInput, "standings" | "teams" | "writeupOnly" | "range">
  /** Teams frozen into this run's `result` JSON at match time. */
  teams: Team[]
  teamIds: Set<string>
  /** Teams with a submission — the population publish emails and this preview may show. */
  submittedTeamIds: Set<string>
  /** Teams with at least one judge score. */
  scoredTeamIds: Set<string>
  /** What an organiser recognises a team by: its submitted project name, falling back to the internal team name, then the raw id. */
  displayName: (teamId: string) => string
}

/**
 * Reads a run's teams, submissions and scores, and shapes them into the
 * inputs `buildSnapshot` needs — minus `publishedAt` and `announcedTeamIds`,
 * which are decided by the caller (publish takes them from the request body;
 * a pre-publish preview has no announced winners yet).
 */
export async function buildResultsInputFromRun(db: Db, runId: string, runResult: unknown): Promise<RunResultsData> {
  const teams = extractFrozenTeams(runResult) ?? []
  const nameById = new Map(teams.map((t) => [t.id, t.name]))
  const teamIds = new Set(teams.map((t) => t.id))

  const [submissions, scoreRows] = await Promise.all([
    db.impactLabSubmission.findMany({
      where: { runId },
      select: { teamId: true, projectName: true },
    }),
    db.impactLabScore.findMany({
      where: { runId },
      select: { teamId: true, judgeEmail: true, scores: true, writeupOnly: true },
    }),
  ])

  const submittedTeamIds = new Set(submissions.map((s) => s.teamId))
  const scoredTeamIds = new Set(scoreRows.map((s) => s.teamId))
  const projectNameById = new Map(submissions.map((s) => [s.teamId, s.projectName]))
  const displayName = (id: string): string => projectNameById.get(id) ?? nameById.get(id) ?? id

  const judgeScores: JudgeScore[] = scoreRows.map((s) => ({
    judgeEmail: s.judgeEmail,
    teamId: s.teamId,
    sheet: (s.scores ?? {}) as ScoreSheet,
  }))
  const table = standings(judgeScores)

  const rowsByTeam = new Map<string, typeof scoreRows>()
  for (const row of scoreRows) {
    const list = rowsByTeam.get(row.teamId)
    if (list) list.push(row)
    else rowsByTeam.set(row.teamId, [row])
  }

  const writeupOnly = new Set<string>()
  const range = new Map<string, { low: number; high: number }>()
  for (const [teamId, rows] of rowsByTeam) {
    if (rows.every((r) => r.writeupOnly)) writeupOnly.add(teamId)

    const totals = rows.map((r) => weightedTotal((r.scores ?? {}) as ScoreSheet))
    range.set(teamId, { low: Math.min(...totals), high: Math.max(...totals) })
  }

  const teamsMeta = new Map<string, { projectName: string; track: string }>()
  for (const submission of submissions) {
    const teamName = nameById.get(submission.teamId) ?? ""
    teamsMeta.set(submission.teamId, {
      projectName: submission.projectName,
      track: trackOf(teamName),
    })
  }

  return {
    input: { standings: table, teams: teamsMeta, writeupOnly, range },
    teams,
    teamIds,
    submittedTeamIds,
    scoredTeamIds,
    displayName,
  }
}
