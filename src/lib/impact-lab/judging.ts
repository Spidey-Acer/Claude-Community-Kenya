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
  /** Mean of each judge's total, in the rubric's units. */
  average: number
  judgeCount: number
  /** Per-criterion mean of the raw scores, for the breakdown view. */
  criterionAverages: Record<string, number>
}

/**
 * Aggregate every judge's sheet into one standing per team.
 *
 * Averages judges rather than summing them, so a team seen by three judges is
 * not beaten by an identical team seen by four. Ordering is by average
 * descending, then teamId, so the result is deterministic — a tie must not
 * reorder itself between two loads of the leaderboard.
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
    const totals = sheets.map((s) => scoreTotal(s.sheet, rubric))
    const average = totals.reduce((a, b) => a + b, 0) / (totals.length || 1)

    const criterionAverages: Record<string, number> = {}
    for (const criterion of rubric.criteria) {
      const values = sheets
        .map((s) => s.sheet[criterion.key])
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
      criterionAverages[criterion.key] = values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : 0
    }

    rows.push({
      teamId,
      average: Math.round(average * 10) / 10,
      judgeCount: sheets.length,
      criterionAverages,
    })
  }

  return rows.sort((a, b) => b.average - a.average || a.teamId.localeCompare(b.teamId))
}

/**
 * The track a team belongs to, read from its name.
 *
 * Teams carry their track in the name they were assigned at the door — e.g.
 * "Table 12 — Kilimo (Agriculture)". There is no track column because there is
 * no team table at all, so the name is the only place it lives. Anything
 * unparseable becomes "Unassigned" rather than throwing: a malformed name must
 * not be able to hide a team from the track winners at 5 AM.
 */
export function trackOf(teamName: string): string {
  const dash = teamName.split(/[—–-]/)
  const tail = dash.length > 1 ? dash.slice(1).join("-").trim() : ""
  return tail || "Unassigned"
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
  nameById: Map<string, string>
): { winners: TrackWinner[]; champion: TrackWinner | null } {
  const best = new Map<string, TrackWinner>()

  for (const row of table) {
    if (row.judgeCount === 0) continue
    const teamName = nameById.get(row.teamId) ?? row.teamId
    const track = trackOf(teamName)
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
