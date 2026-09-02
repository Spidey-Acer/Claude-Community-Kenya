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
import {
  resolveTeamTrack,
  scoreTotal,
  standings,
  trackLabelIndex,
  type JudgeScore,
  type JudgingRubric,
  type ScoreSheet,
} from "./judging"
import type { ResultsInput, TeamFeedback } from "./results"
import { presentableJudgeNote, publishableReview } from "./reviews"
import type { Team, Track } from "@/lib/matching"

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
 *
 * `rubric` must be the cohort's own — resolved via `resolveRubric(cohort)` by
 * the caller, never defaulted here. Every total and standing below is scored
 * against it, and this cohort's rubric may not be Impact Lab's.
 *
 * `tracks` is the event's own track list (already parsed by
 * `getEventByCohort`). It is a caller argument rather than a lookup here
 * because this function may run inside a `$transaction`, and reaching for the
 * module-level Prisma client mid-transaction opens a second connection. Pass
 * `[]` for an event with no tracks — team track labels then fall back to the
 * frozen `track` field and the team name, exactly as before.
 */
export async function buildResultsInputFromRun(
  db: Db,
  runId: string,
  runResult: unknown,
  rubric: JudgingRubric,
  tracks: readonly Track[]
): Promise<RunResultsData> {
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
  const table = standings(judgeScores, rubric)

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

    const totals = rows.map((r) => scoreTotal((r.scores ?? {}) as ScoreSheet, rubric))
    range.set(teamId, { low: Math.min(...totals), high: Math.max(...totals) })
  }

  // How the team was actually matched (`trackKey`) wins over an organiser's
  // frozen label, which in turn wins over parsing the team name — see
  // `resolveTeamTrack`. Parsing the name last matters: the matcher names teams
  // "${label} ${n}", which has no track to parse out, so name-first put every
  // team in "Unassigned" and produced a single track winner for the event.
  // The submission form's own free-text track field is deliberately not
  // consulted: it is the team's self-report, not the organiser's assignment.
  const labelByKey = trackLabelIndex(tracks)
  const teamById = new Map(teams.map((t) => [t.id, t as Team & { track?: string }]))
  const teamsMeta = new Map<string, { projectName: string; track: string }>()
  for (const submission of submissions) {
    const team = teamById.get(submission.teamId)
    teamsMeta.set(submission.teamId, {
      projectName: submission.projectName,
      track: resolveTeamTrack(team ?? { name: "" }, labelByKey),
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

/**
 * Written feedback per team for one run, as it may be shown to that team:
 * judge notes quoted through `presentableJudgeNote` (spelling/casing
 * corrections only — the stored record is never altered) and the community
 * review gated through `publishableReview` (approved rows only).
 *
 * One loader for every sender/previewer of the results email, for the same
 * reason `buildResultsInputFromRun` exists: two implementations of "what
 * feedback does this team get" is how a preview and a real send drift apart.
 */
export async function loadTeamFeedback(
  db: Db,
  runId: string,
  teamIds: string[]
): Promise<Map<string, TeamFeedback>> {
  const [scoreRows, reviewRows] = await Promise.all([
    db.impactLabScore.findMany({
      where: { runId, teamId: { in: teamIds }, feedback: { not: null } },
      select: { teamId: true, judgeName: true, feedback: true },
    }),
    db.impactLabTeamReview.findMany({
      where: { runId, teamId: { in: teamIds } },
      select: { teamId: true, text: true, approvedAt: true },
    }),
  ])

  const reviewByTeam = new Map(reviewRows.map((r) => [r.teamId, r]))
  const feedback = new Map<string, TeamFeedback>()
  for (const teamId of teamIds) {
    feedback.set(teamId, {
      judgeNotes: [],
      review: publishableReview(reviewByTeam.get(teamId)),
    })
  }
  for (const row of scoreRows) {
    const text = presentableJudgeNote(row.feedback)
    if (text === null) continue
    feedback.get(row.teamId)?.judgeNotes.push({ judgeName: row.judgeName, text })
  }
  return feedback
}
