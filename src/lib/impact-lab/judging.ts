/**
 * Impact Lab judging — score arithmetic over a rubric.
 *
 * Pure and dependency-free (no Prisma, no Next) so the arithmetic can be
 * asserted by a script, the same way the matching engine is.
 *
 * The criteria themselves now live in `judging-rubrics.ts`, one rubric per
 * event: this system runs more than one hackathon and they do not share a
 * rubric or even a scale. Every function here takes the rubric it is scoring
 * against. The parameter defaults to the Impact Lab rubric so that a caller
 * which has not yet been made cohort-aware keeps its existing behaviour
 * exactly — but a caller that touches a second event MUST pass the rubric,
 * because the default will quietly score Afretec teams on Claude Community
 * Kenya's criteria.
 */

import {
  IMPACT_LAB_RUBRIC,
  maxPoints,
  type JudgingRubric,
} from "./judging-rubrics"

export type { JudgingCriterion, JudgingRubric, ScoringMode } from "./judging-rubrics"
export {
  IMPACT_LAB_RUBRIC,
  AFRETEC_RUBRIC,
  ALL_RUBRICS,
  rubricForCohort,
  maxPoints,
} from "./judging-rubrics"

/**
 * The Impact Lab criteria, for callers that are single-event by nature (its
 * results email, its exports). Cohort-aware callers should read
 * `rubricForCohort(cohort).criteria` instead.
 */
export const JUDGING_CRITERIA = IMPACT_LAB_RUBRIC.criteria

export const CRITERION_KEYS = JUDGING_CRITERIA.map((c) => c.key)

/** Anchors shown beside the Impact Lab 1–5 scale so judges calibrate the same way. */
export const SCORE_LABELS: Record<number, string> = {
  ...(IMPACT_LAB_RUBRIC.scoreLabels ?? {}),
}

export const MIN_SCORE = 1
export const MAX_SCORE = 5

export type ScoreSheet = Record<string, number>

/**
 * A sheet's total, in the units the rubric quotes totals in.
 *
 * Two arithmetics, because the two rubrics mean different things by their
 * lowest score:
 *
 * - `"normalized"` (Impact Lab): a 1 means "not shown" and therefore earns
 *   zero of that criterion's weight. Mapping 1 to a fifth of the points would
 *   hand marks to a team that did not do the thing at all. Hence
 *   (score − min) / (max − min), out of 100.
 * - `"points"` (Afretec): the panel published a points rubric, so the raw
 *   score IS the points and a 1 out of 10 is worth one point. Out of the sum
 *   of the maxima (50).
 *
 * Missing or out-of-range criteria contribute nothing rather than throwing: a
 * half-filled sheet during live demos should still produce a usable number.
 */
export function scoreTotal(
  sheet: ScoreSheet,
  rubric: JudgingRubric = IMPACT_LAB_RUBRIC
): number {
  let total = 0
  for (const criterion of rubric.criteria) {
    const raw = sheet[criterion.key]
    if (typeof raw !== "number" || Number.isNaN(raw)) continue
    const clamped = Math.min(criterion.max, Math.max(criterion.min, raw))
    if (rubric.scoring === "points") {
      total += clamped
    } else {
      const span = criterion.max - criterion.min
      // A single-value scale cannot be normalised; award full weight for the
      // only score available rather than dividing by zero.
      total += span === 0 ? criterion.weight : ((clamped - criterion.min) / span) * criterion.weight
    }
  }
  return Math.round(total * 10) / 10
}

/**
 * Back-compatible alias for `scoreTotal` against the Impact Lab rubric.
 *
 * Kept because "weighted total" is the wrong name for a points rubric, and
 * renaming every call site at once during a live event is not a trade worth
 * making. New cohort-aware code should call `scoreTotal(sheet, rubric)`.
 */
export function weightedTotal(
  sheet: ScoreSheet,
  rubric: JudgingRubric = IMPACT_LAB_RUBRIC
): number {
  return scoreTotal(sheet, rubric)
}

/** True when every criterion has a usable score — used to flag partial sheets. */
export function isComplete(
  sheet: ScoreSheet,
  rubric: JudgingRubric = IMPACT_LAB_RUBRIC
): boolean {
  return rubric.criteria.every((c) => {
    const raw = sheet[c.key]
    return typeof raw === "number" && raw >= c.min && raw <= c.max
  })
}

export interface JudgeScore {
  judgeEmail: string
  teamId: string
  sheet: ScoreSheet
}

export interface TeamStanding {
  teamId: string
  /**
   * The team's aggregate, in the rubric's units.
   *
   * Built criterion by criterion — each criterion is averaged across the
   * judges who actually scored it, and the rubric's weighting is applied to
   * those means — NOT by averaging whole judge totals. See `standings` for
   * why the difference matters.
   */
  average: number
  /** How many judges recorded any sheet at all for this team. */
  judgeCount: number
  /** Per-criterion mean of the raw scores, for the breakdown view. */
  criterionAverages: Record<string, number>
  /**
   * How many judges scored each criterion. Always has an entry for every
   * criterion in the rubric, `0` for one nobody reached — that zero is what
   * tells an organiser a criterion's mean is missing rather than low.
   */
  criterionJudgeCounts: Record<string, number>
}

/**
 * Aggregate every judge's sheet into one standing per team.
 *
 * Averages judges rather than summing them, so a team seen by three judges is
 * not beaten by an identical team seen by four. Ordering is by average
 * descending, then teamId, so the result is deterministic — a tie must not
 * reorder itself between two loads of the leaderboard.
 *
 * The averaging is CRITERION-WISE, not total-wise: each criterion is meaned
 * across the judges who scored that criterion, and the rubric's weighting is
 * applied to those means. Averaging whole totals instead makes a judge who
 * filled in two criteria of five contribute an implicit zero for the other
 * three, which drags a team's mean down by an amount that has nothing to do
 * with its work. Half-filled sheets are the norm at a live event — a judge is
 * pulled to the next table mid-scorecard — so the difference decides winners.
 *
 * A criterion no judge scored contributes 0 (it is simply absent from the
 * mean sheet), which is the same as the old behaviour and the same as an
 * unfilled criterion on a single sheet.
 */
export function standings(
  scores: JudgeScore[],
  rubric: JudgingRubric = IMPACT_LAB_RUBRIC
): TeamStanding[] {
  const byTeam = new Map<string, JudgeScore[]>()
  for (const score of scores) {
    const list = byTeam.get(score.teamId)
    if (list) list.push(score)
    else byTeam.set(score.teamId, [score])
  }

  const rows: TeamStanding[] = []
  for (const [teamId, sheets] of byTeam) {
    // The mean sheet: one entry per criterion at least one judge scored, at
    // the unrounded mean of their raw values. Scoring it through `scoreTotal`
    // — rather than re-deriving the weighting here — keeps a single
    // implementation of "what is a sheet worth" for both rubric modes.
    const meanSheet: ScoreSheet = {}
    const criterionAverages: Record<string, number> = {}
    const criterionJudgeCounts: Record<string, number> = {}

    for (const criterion of rubric.criteria) {
      const values = sheets
        .map((s) => s.sheet[criterion.key])
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
      criterionJudgeCounts[criterion.key] = values.length
      if (values.length === 0) {
        criterionAverages[criterion.key] = 0
        continue
      }
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      meanSheet[criterion.key] = mean
      criterionAverages[criterion.key] = Math.round(mean * 10) / 10
    }

    rows.push({
      teamId,
      // Rounded once, at the end, from the unrounded means — rounding each
      // criterion first and weighting the rounded values would drift.
      average: scoreTotal(meanSheet, rubric),
      judgeCount: sheets.length,
      criterionAverages,
      criterionJudgeCounts,
    })
  }

  return rows.sort((a, b) => b.average - a.average || a.teamId.localeCompare(b.teamId))
}

/**
 * The track a team belongs to, read from its name — the LAST-RESORT fallback.
 *
 * Hand-imported and legacy teams were named "Table 12 — Kilimo (Agriculture)",
 * with the track after the dash, and for those this is the only place the
 * track lives. Teams the matcher builds do NOT look like that: it names them
 * "${track.label} ${n}" (e.g. "Elimu: Mwalimu wa Grade 10 7") and records the
 * track properly in `Team.trackKey`. Parsing such a name yields nothing, so
 * every matcher-built team would land in "Unassigned" and collapse the track
 * winners into one. Prefer `resolveTeamTrack` — it reads `trackKey` first and
 * only falls back here.
 *
 * Anything unparseable becomes "Unassigned" rather than throwing: a malformed
 * name must not be able to hide a team from the track winners at 5 AM.
 */
export function trackOf(teamName: string): string {
  const dash = teamName.split(/[—–-]/)
  const tail = dash.length > 1 ? dash.slice(1).join("-").trim() : ""
  return tail || "Unassigned"
}

/** The minimum a team has to carry for its track to be resolvable. */
export interface TrackedTeam {
  name: string
  /** Written by `runMatchingByTrack` — the authoritative track for a matched team. */
  trackKey?: string | null
  /** An organiser-assigned track label frozen into the run JSON, if any. */
  track?: string | null
}

/**
 * Track key → human label, from an event's parsed `tracks`.
 *
 * Structurally typed rather than importing `Track`, so this module stays
 * dependency-free and the verification scripts can import it without pulling
 * in the event schema.
 */
export function trackLabelIndex(
  tracks: readonly { key: string; label: string }[]
): Map<string, string> {
  return new Map(tracks.map((t) => [t.key, t.label]))
}

/**
 * The track label to show and group a team by.
 *
 * Order of preference, strongest evidence first:
 *
 * 1. `trackKey` — what the matcher actually partitioned the team into,
 *    resolved to the event's own label. An unknown key degrades to the key
 *    itself, which is still a stable grouping, unlike "Unassigned".
 * 2. `track` — an organiser's label frozen into the run JSON (e.g.
 *    backfilled from a registration file).
 * 3. `trackOf(name)` — the legacy "Table 12 — Track" naming.
 */
export function resolveTeamTrack(
  team: TrackedTeam,
  labelByKey: Map<string, string>
): string {
  const key = team.trackKey?.trim()
  if (key) return labelByKey.get(key) ?? key
  const assigned = team.track?.trim()
  if (assigned) return assigned
  return trackOf(team.name)
}

export interface TrackWinner {
  track: string
  teamId: string
  teamName: string
  average: number
  judgeCount: number
}

/**
 * Top team per track, plus the overall champion.
 *
 * The program promises track winners AND an overall champion, so both are
 * derived here rather than left to be eyeballed off a leaderboard at 5:30 AM.
 * Teams nobody scored are excluded — a zero from "not judged" would otherwise
 * be indistinguishable from a zero that was earned.
 */
export function trackWinners(
  table: TeamStanding[],
  nameById: Map<string, string>,
  /**
   * teamId → resolved track label, built with `resolveTeamTrack` by a caller
   * that has the frozen teams and the event's tracks. Omitted only by callers
   * with nothing but names to go on, which fall back to parsing the name and
   * therefore see every matcher-built team as "Unassigned".
   */
  trackById?: Map<string, string>
): { winners: TrackWinner[]; champion: TrackWinner | null } {
  const best = new Map<string, TrackWinner>()

  for (const row of table) {
    if (row.judgeCount === 0) continue
    const teamName = nameById.get(row.teamId) ?? row.teamId
    const track = trackById?.get(row.teamId) ?? trackOf(teamName)
    const candidate: TrackWinner = {
      track,
      teamId: row.teamId,
      teamName,
      average: row.average,
      judgeCount: row.judgeCount,
    }
    const current = best.get(track)
    // `table` arrives already sorted by average desc then id, so the first
    // sighting of a track is its winner; keep it and ignore the rest.
    if (!current) best.set(track, candidate)
  }

  const winners = [...best.values()].sort((a, b) => a.track.localeCompare(b.track))
  const champion =
    winners.length === 0
      ? null
      : winners.reduce((top, w) =>
          w.average > top.average || (w.average === top.average && w.teamId < top.teamId)
            ? w
            : top
        )

  return { winners, champion }
}

/** Highest total achievable under a rubric — the denominator to quote against. */
export function totalOutOf(rubric: JudgingRubric = IMPACT_LAB_RUBRIC): number {
  return rubric.scoring === "points" ? maxPoints(rubric) : 100
}

/** The wire shape of a rubric — every field a client needs to render it, nothing DB-internal. */
export interface SerializedRubric {
  id: string
  label: string
  scoring: JudgingRubric["scoring"]
  totalOutOf: number
  scoreLabels: Readonly<Record<number, string>> | null
  criteria: {
    key: string
    label: string
    guidance: string
    min: number
    max: number
    weight: number
  }[]
}

/**
 * A rubric projected field-by-field for the wire — the shape every
 * cohort-aware route sends a client so it can render that cohort's own
 * criteria, scales and denominator instead of a hardcoded rubric.
 *
 * Projected rather than spread, so an internal field added to `JudgingRubric`
 * later cannot silently widen this contract. `totalOutOf` is the derived
 * value, not the declared one, so it can never disagree with the criteria a
 * client is actually rendering.
 */
export function serializeRubric(rubric: JudgingRubric): SerializedRubric {
  return {
    id: rubric.id,
    label: rubric.label,
    scoring: rubric.scoring,
    totalOutOf: totalOutOf(rubric),
    scoreLabels: rubric.scoreLabels,
    criteria: rubric.criteria.map((c) => ({
      key: c.key,
      label: c.label,
      guidance: c.guidance,
      min: c.min,
      max: c.max,
      weight: c.weight,
    })),
  }
}
