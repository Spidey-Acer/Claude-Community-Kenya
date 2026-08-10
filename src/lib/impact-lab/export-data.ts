/**
 * Impact Lab results export — data assembly.
 *
 * Pure and dependency-free (no Prisma, no Next, no exceljs/pdfkit) so the
 * joins that decide what the archived record says can be asserted with
 * fixtures. The Excel and PDF builders both render from the `ResultsExport`
 * this module produces, so the two artefacts cannot disagree with each other.
 *
 * Two honesty rules the whole export hangs on:
 *
 * 1. The published placing is NOT the score order. The judging panel
 *    deliberated and announced winners; the raw averages disagree. Every rank
 *    shown carries its basis ("announced" vs score order), and both orderings
 *    are presented as what they are — never one silently dressed as the other.
 * 2. Some teams were scored from their written submission because no judge
 *    reached their table. That basis travels with the score wherever the
 *    score appears. It is a note about how the score was produced, never an
 *    implication that the team failed to present.
 */

import {
  scoreTotal,
  standings,
  trackOf,
  trackWinners,
  type JudgingRubric,
  type ScoreSheet,
} from "./judging"
import type { RankedTeam, ResultsSnapshot, ResultsTrackWinner } from "./results"

// ─── Source rows (what the loader hands in) ──────────────────────────────────

/** A team as frozen in the final run's `result` JSON. */
export interface SourceTeam {
  id: string
  name: string
  memberIds: string[]
  leaderId?: string | null
}

export interface SourceParticipant {
  id: string
  fullName: string
  email: string
  primaryRole: string
  institution: string | null
  checkedIn: boolean
}

export interface SourceSubmission {
  teamId: string
  projectName: string
  pitch: string
  problemTackled: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
}

export interface SourceScore {
  teamId: string
  judgeEmail: string
  judgeName: string
  sheet: ScoreSheet
  feedback: string | null
  writeupOnly: boolean
}

/**
 * An APPROVED community review for one team — the organiser-read text that
 * also reaches the team's dashboard and results email. The loader must gate
 * rows through `publishableReview` (@/lib/impact-lab/reviews) before handing
 * them in; an unapproved draft never enters an artefact that leaves the
 * building. Where a team has one of these, it is the canonical written text
 * about that project — any machine-written fallback analysis must be skipped
 * for that team, and the two must never share a label (this is the
 * community's signed feedback; an analysis is not).
 */
export interface SourceReview {
  teamId: string
  text: string
}

export interface ExportSource {
  cohort: string
  publishedAt: string | null
  snapshot: ResultsSnapshot | null
  teams: SourceTeam[]
  participants: SourceParticipant[]
  submissions: SourceSubmission[]
  scores: SourceScore[]
  /** Approved community reviews only — see SourceReview. */
  reviews: SourceReview[]
}

// ─── Assembled export ────────────────────────────────────────────────────────

export interface ExportMember {
  fullName: string
  email: string
  primaryRole: string
  institution: string | null
  isLeader: boolean
  checkedIn: boolean
}

export interface ExportJudgeScore {
  judgeName: string
  judgeEmail: string
  /** Raw 1–5 by criterion key; null where the judge left a criterion blank. */
  criteria: Record<string, number | null>
  /** This judge's weighted total /100 — `weightedTotal`, never re-derived. */
  weightedTotal: number
  /** True when scored from the written submission, not a live demo. */
  writeupOnly: boolean
  feedback: string | null
}

export type ExportSubmission = Omit<SourceSubmission, "teamId">

/** How a team's shown placing was arrived at. Mirrors `ResultBasis`. */
export type PlacingBasis = "announced" | "demo" | "submission"

export interface ExportTeam {
  teamId: string
  teamName: string
  /** The bit before the dash — "Table 12" — for the table column. */
  tableLabel: string
  track: string
  members: ExportMember[]
  submission: ExportSubmission | null
  judgeScores: ExportJudgeScore[]
  /** Mean of judges' weighted totals /100. Null when never scored. */
  average: number | null
  /** Lowest judge's weighted total /100. Null when never scored. */
  scoreLow: number | null
  /** Highest judge's weighted total /100. Null when never scored. */
  scoreHigh: number | null
  judgeCount: number
  /** Per-criterion mean of the raw 1–5 scores. Empty when never scored. */
  criterionAverages: Record<string, number>
  /**
   * The published placing (announced winners first, then score order), from
   * the immutable `resultsSnapshot`. Null before publication or for teams
   * outside the published ranking.
   */
  finalRank: number | null
  /** Basis of `finalRank` — "announced" for the panel's podium picks. */
  finalRankBasis: PlacingBasis | null
  /** Position by raw weighted average alone. Null when never scored. */
  scoreRank: number | null
  /** True when every score this team holds came from its written submission. */
  scoredFromWriteup: boolean
  isTrackWinner: boolean
  isChampion: boolean
  /**
   * The approved community review, signed "Claude Community Kenya", or null
   * when none is approved yet. When present this is the canonical written
   * text about the project in both artefacts.
   */
  communityReview: string | null
}

export interface ExportWinner {
  rank: number
  teamName: string
  projectName: string
}

export interface ExportTrackWinner {
  track: string
  teamName: string
  projectName: string
  /** Mirrors `ResultsTrackWinner["basis"]` — see that type for what each means. */
  basis: ResultsTrackWinner["basis"]
}

/** One judge's footprint across the night — coverage, not judgement. */
export interface ExportJudgeSummary {
  judgeName: string
  judgeEmail: string
  /** Total scorecards this judge recorded. */
  sheets: number
  liveSheets: number
  writeupSheets: number
  /** Scorecards on which this judge left a written note. */
  feedbackCount: number
  /** Mean of this judge's weighted totals /100 — how they used the scale. */
  meanWeightedTotal: number
}

/** One track's shape: participation, outcome, and who led it. */
export interface ExportTrackSummary {
  track: string
  teamsFormed: number
  teamsSubmitted: number
  teamsScored: number
  /** Mean of scored teams' averages /100. Null when nothing was scored. */
  meanAverage: number | null
  winnerTeamName: string | null
  winnerProjectName: string | null
  winnerBasis: ResultsTrackWinner["basis"] | null
}

/** How many scored teams were seen by exactly `judgeCount` judges. */
export interface ExportCoverageBucket {
  judgeCount: number
  teams: number
}

export interface ExportSummary {
  participantsRegistered: number
  participantsCheckedIn: number
  teamsFormed: number
  teamsSubmitted: number
  teamsScored: number
  teamsScoredFromWriteup: number
  judges: number
  scorecards: number
  /** Mean of team averages across scored teams, /100. Null if none scored. */
  meanTeamAverage: number | null
  tracks: number
}

export interface ResultsExport {
  cohort: string
  generatedAt: Date
  /**
   * The rubric this cohort was judged on. Carried on the export itself so the
   * Excel and PDF renderers never fall back to a hardcoded default — every
   * criteria loop, column count, and denominator in this document is driven
   * by this rubric, not by the Impact Lab constant.
   */
  rubric: JudgingRubric
  /** Whether the announced result has been published (snapshot present). */
  published: boolean
  publishedAt: string | null
  /** The podium as announced in the room. Empty before publication. */
  announced: ExportWinner[]
  trackWinners: ExportTrackWinner[]
  /** Ordered: published placing first, then score order, then name. */
  teams: ExportTeam[]
  /** Cohort participants who ended up on no frozen team. */
  unassignedParticipants: ExportMember[]
  /** One row per judge, ordered by sheet count descending then name. */
  judgeSummaries: ExportJudgeSummary[]
  /** One row per track, ordered by track name. */
  trackSummaries: ExportTrackSummary[]
  /** Coverage distribution over scored teams, ordered by judge count. */
  coverage: ExportCoverageBucket[]
  summary: ExportSummary
}

// ─── Snapshot guard ──────────────────────────────────────────────────────────

/**
 * Structural guard over the stored `resultsSnapshot` JSON. Like
 * `extractFrozenTeams`, a drifted or legacy shape degrades to "not published"
 * rather than throwing halfway through generating a file.
 */
export function parseResultsSnapshot(value: unknown): ResultsSnapshot | null {
  if (typeof value !== "object" || value === null) return null
  const snap = value as Partial<ResultsSnapshot>
  if (typeof snap.publishedAt !== "string") return null
  if (!Array.isArray(snap.overall) || !Array.isArray(snap.ranking)) return null
  if (!Array.isArray(snap.trackWinners)) return null
  const rowsOk = snap.ranking.every(
    (row: unknown) =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as RankedTeam).teamId === "string" &&
      typeof (row as RankedTeam).rank === "number"
  )
  return rowsOk ? (snap as ResultsSnapshot) : null
}

// ─── Assembly ────────────────────────────────────────────────────────────────

/** "Table 12 — Kilimo (Agriculture)" → "Table 12". */
export function tableLabelOf(teamName: string): string {
  const head = teamName.split(/[—–-]/)[0]?.trim()
  return head || teamName
}

function toMember(p: SourceParticipant, leaderId: string | null | undefined): ExportMember {
  return {
    fullName: p.fullName,
    email: p.email,
    primaryRole: p.primaryRole,
    institution: p.institution,
    isLeader: p.id === leaderId,
    checkedIn: p.checkedIn,
  }
}

function toJudgeScore(score: SourceScore, rubric: JudgingRubric): ExportJudgeScore {
  const criteria: Record<string, number | null> = {}
  for (const criterion of rubric.criteria) {
    const raw = score.sheet[criterion.key]
    criteria[criterion.key] =
      typeof raw === "number" && !Number.isNaN(raw) ? raw : null
  }
  return {
    judgeName: score.judgeName,
    judgeEmail: score.judgeEmail,
    criteria,
    weightedTotal: scoreTotal(score.sheet, rubric),
    writeupOnly: score.writeupOnly,
    feedback: score.feedback?.trim() ? score.feedback.trim() : null,
  }
}

/**
 * Assemble everything the Excel and PDF builders render.
 *
 * All ranking arithmetic is `standings`/`scoreTotal`/`trackWinners` from
 * `./judging` — this module joins and labels, it never re-derives a number
 * that decides who won. `rubric` must be the one this cohort was actually
 * judged on (resolve it with `resolveRubric` before calling this — it stays
 * pure and dependency-free, like `./judging`, so the caller owns the DB
 * lookup) or every criterion, total, and ranking below is scored against the
 * wrong event.
 */
export function buildResultsExport(
  source: ExportSource,
  rubric: JudgingRubric,
  now: Date = new Date()
): ResultsExport {
  const participantById = new Map(source.participants.map((p) => [p.id, p]))
  const submissionByTeam = new Map(source.submissions.map((s) => [s.teamId, s]))
  const reviewByTeam = new Map(source.reviews.map((r) => [r.teamId, r.text]))

  const scoresByTeam = new Map<string, SourceScore[]>()
  for (const score of source.scores) {
    const list = scoresByTeam.get(score.teamId)
    if (list) list.push(score)
    else scoresByTeam.set(score.teamId, [score])
  }

  const table = standings(
    source.scores.map((s) => ({ judgeEmail: s.judgeEmail, teamId: s.teamId, sheet: s.sheet })),
    rubric
  )
  const standingByTeam = new Map(table.map((t) => [t.teamId, t]))
  // `standings` is already sorted by average desc, id — position is score rank.
  const scoreRankByTeam = new Map(table.map((t, i) => [t.teamId, i + 1]))

  const snapshot = source.snapshot
  const finalRankByTeam = new Map<string, RankedTeam>(
    (snapshot?.ranking ?? []).map((row) => [row.teamId, row])
  )

  const nameById = new Map(source.teams.map((t) => [t.id, t.name]))

  // Winners: the published snapshot is the record once it exists. Before
  // publication, fall back to score order — labelled as such via basis.
  let announced: ExportWinner[] = []
  let exportTrackWinners: ExportTrackWinner[] = []
  let championTeamId: string | null = null
  const trackWinnerTeamIds = new Set<string>()

  const projectNameOf = (teamId: string): string =>
    submissionByTeam.get(teamId)?.projectName ?? nameById.get(teamId) ?? teamId

  if (snapshot) {
    announced = snapshot.overall.map((w) => ({
      rank: w.rank,
      teamName: nameById.get(w.teamId) ?? w.teamId,
      projectName: w.projectName,
    }))
    championTeamId = snapshot.overall.find((w) => w.rank === 1)?.teamId ?? null
    exportTrackWinners = snapshot.trackWinners.map((w) => ({
      track: w.track,
      teamName: nameById.get(w.teamId) ?? w.teamId,
      projectName: w.projectName,
      basis: w.basis,
    }))
    for (const w of snapshot.trackWinners) trackWinnerTeamIds.add(w.teamId)
  } else {
    const { winners, champion } = trackWinners(table, nameById)
    championTeamId = champion?.teamId ?? null
    exportTrackWinners = winners.map((w) => ({
      track: w.track,
      teamName: w.teamName,
      projectName: projectNameOf(w.teamId),
      basis: "score",
    }))
    for (const w of winners) trackWinnerTeamIds.add(w.teamId)
  }

  const teams: ExportTeam[] = source.teams.map((team) => {
    const standing = standingByTeam.get(team.id)
    const judgeScores = (scoresByTeam.get(team.id) ?? []).map((s) => toJudgeScore(s, rubric))
    const snapshotRow = finalRankByTeam.get(team.id)
    const submission = submissionByTeam.get(team.id)

    // The snapshot's basis is authoritative once published; before that, the
    // scores themselves say whether every one came from the writeup.
    const scoredFromWriteup = snapshotRow
      ? snapshotRow.basis === "submission"
      : judgeScores.length > 0 && judgeScores.every((s) => s.writeupOnly)

    return {
      teamId: team.id,
      teamName: team.name,
      tableLabel: tableLabelOf(team.name),
      track: trackOf(team.name),
      members: team.memberIds
        .map((id) => participantById.get(id))
        .filter((p): p is SourceParticipant => p !== undefined)
        .map((p) => toMember(p, team.leaderId)),
      submission: submission
        ? {
            projectName: submission.projectName,
            pitch: submission.pitch,
            problemTackled: submission.problemTackled,
            description: submission.description,
            worksVsMocked: submission.worksVsMocked,
            claudeUsage: submission.claudeUsage,
            repoUrl: submission.repoUrl,
            demoUrl: submission.demoUrl,
            videoUrl: submission.videoUrl,
            slidesUrl: submission.slidesUrl,
          }
        : null,
      judgeScores,
      average: standing?.average ?? null,
      // Range across judges — presentation of totals `weightedTotal` already
      // produced, not new score arithmetic.
      scoreLow: judgeScores.length
        ? Math.min(...judgeScores.map((s) => s.weightedTotal))
        : null,
      scoreHigh: judgeScores.length
        ? Math.max(...judgeScores.map((s) => s.weightedTotal))
        : null,
      judgeCount: standing?.judgeCount ?? 0,
      criterionAverages: standing?.criterionAverages ?? {},
      finalRank: snapshotRow?.rank ?? null,
      finalRankBasis: snapshotRow?.basis ?? null,
      scoreRank: scoreRankByTeam.get(team.id) ?? null,
      scoredFromWriteup,
      isTrackWinner: trackWinnerTeamIds.has(team.id),
      isChampion: team.id === championTeamId,
      communityReview: reviewByTeam.get(team.id) ?? null,
    }
  })

  teams.sort(
    (a, b) =>
      (a.finalRank ?? Number.MAX_SAFE_INTEGER) - (b.finalRank ?? Number.MAX_SAFE_INTEGER) ||
      (a.scoreRank ?? Number.MAX_SAFE_INTEGER) - (b.scoreRank ?? Number.MAX_SAFE_INTEGER) ||
      a.teamName.localeCompare(b.teamName)
  )

  const assignedIds = new Set(source.teams.flatMap((t) => t.memberIds))
  const unassignedParticipants = source.participants
    .filter((p) => !assignedIds.has(p.id))
    .map((p) => toMember(p, null))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  // ── Judge summaries: each judge's footprint across the night ─────────────
  const byJudge = new Map<string, SourceScore[]>()
  for (const score of source.scores) {
    const list = byJudge.get(score.judgeEmail)
    if (list) list.push(score)
    else byJudge.set(score.judgeEmail, [score])
  }
  const judgeSummaries: ExportJudgeSummary[] = [...byJudge.values()]
    .map((sheets) => {
      const totals = sheets.map((s) => scoreTotal(s.sheet, rubric))
      return {
        judgeName: sheets[0].judgeName,
        judgeEmail: sheets[0].judgeEmail,
        sheets: sheets.length,
        liveSheets: sheets.filter((s) => !s.writeupOnly).length,
        writeupSheets: sheets.filter((s) => s.writeupOnly).length,
        feedbackCount: sheets.filter((s) => s.feedback?.trim()).length,
        meanWeightedTotal: totals.length
          ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
          : 0,
      }
    })
    .sort((a, b) => b.sheets - a.sheets || a.judgeName.localeCompare(b.judgeName))

  // ── Track summaries: participation and outcome per track ─────────────────
  const winnerByTrack = new Map(exportTrackWinners.map((w) => [w.track, w]))
  const byTrack = new Map<string, ExportTeam[]>()
  for (const team of teams) {
    const list = byTrack.get(team.track)
    if (list) list.push(team)
    else byTrack.set(team.track, [team])
  }
  const trackSummaries: ExportTrackSummary[] = [...byTrack.entries()]
    .map(([track, trackTeams]) => {
      const scored = trackTeams.filter((t) => t.average !== null)
      const winner = winnerByTrack.get(track)
      return {
        track,
        teamsFormed: trackTeams.length,
        teamsSubmitted: trackTeams.filter((t) => t.submission !== null).length,
        teamsScored: scored.length,
        meanAverage: scored.length
          ? Math.round(
              (scored.reduce((sum, t) => sum + (t.average ?? 0), 0) / scored.length) * 10
            ) / 10
          : null,
        winnerTeamName: winner?.teamName ?? null,
        winnerProjectName: winner?.projectName ?? null,
        winnerBasis: winner?.basis ?? null,
      }
    })
    .sort((a, b) => a.track.localeCompare(b.track))

  // ── Coverage: how many judges actually reached each scored team ──────────
  const coverageCounts = new Map<number, number>()
  for (const team of teams) {
    if (team.judgeCount === 0) continue
    coverageCounts.set(team.judgeCount, (coverageCounts.get(team.judgeCount) ?? 0) + 1)
  }
  const coverage: ExportCoverageBucket[] = [...coverageCounts.entries()]
    .map(([judgeCount, count]) => ({ judgeCount, teams: count }))
    .sort((a, b) => a.judgeCount - b.judgeCount)

  const scoredTeams = teams.filter((t) => t.average !== null)
  const meanTeamAverage = scoredTeams.length
    ? Math.round(
        (scoredTeams.reduce((sum, t) => sum + (t.average ?? 0), 0) / scoredTeams.length) * 10
      ) / 10
    : null

  return {
    cohort: source.cohort,
    generatedAt: now,
    rubric,
    published: snapshot !== null,
    publishedAt: snapshot?.publishedAt ?? source.publishedAt,
    announced,
    trackWinners: exportTrackWinners,
    teams,
    unassignedParticipants,
    judgeSummaries,
    trackSummaries,
    coverage,
    summary: {
      participantsRegistered: source.participants.length,
      participantsCheckedIn: source.participants.filter((p) => p.checkedIn).length,
      teamsFormed: source.teams.length,
      teamsSubmitted: source.submissions.length,
      teamsScored: scoredTeams.length,
      teamsScoredFromWriteup: teams.filter((t) => t.scoredFromWriteup).length,
      judges: new Set(source.scores.filter((s) => !s.writeupOnly).map((s) => s.judgeEmail)).size,
      scorecards: source.scores.length,
      meanTeamAverage,
      tracks: new Set(teams.map((t) => t.track)).size,
    },
  }
}
