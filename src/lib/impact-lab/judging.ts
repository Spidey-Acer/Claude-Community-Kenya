/**
 * Impact Lab judging — criteria, weights, and score arithmetic.
 *
 * Pure and dependency-free (no Prisma, no Next) so the arithmetic can be
 * asserted by a script, the same way the matching engine is.
 *
 * The criteria and weights are the ones published to builders in the program.
 * That matters more than it looks: teams spent the night optimising against
 * these five things, so judging on anything else — a revenue model nobody
 * asked them for, say — would score them on a brief they never received.
 */

export interface JudgingCriterion {
  key: string
  label: string
  /** Points this criterion contributes to a 100-point total. */
  weight: number
  /** What a judge is actually being asked to look at. */
  guidance: string
}

export const JUDGING_CRITERIA: readonly JudgingCriterion[] = [
  {
    key: "impact",
    label: "Impact on the named beneficiary",
    weight: 25,
    guidance:
      "Does this measurably help the specific person the team named? Not a market — a person.",
  },
  {
    key: "demo",
    label: "A working demo",
    weight: 25,
    guidance:
      "Did it actually run in front of you? Working software only — what is real versus stubbed.",
  },
  {
    key: "claude",
    label: "Use of AI",
    weight: 20,
    guidance:
      "How well did the team use AI to get further than they could have alone?",
  },
  {
    key: "clarity",
    label: "Beneficiary clarity",
    guidance:
      "Can they say who this helps and what that person struggles with today, in one sentence?",
    weight: 15,
  },
  {
    key: "presentation",
    label: "Presentation",
    weight: 15,
    guidance: "Was the three minutes clear, honest, and well used?",
  },
] as const

export const CRITERION_KEYS = JUDGING_CRITERIA.map((c) => c.key)

/** Anchors shown beside the 1–5 scale so judges calibrate the same way. */
export const SCORE_LABELS: Record<number, string> = {
  1: "Not shown / insufficient",
  2: "Attempted, unsatisfactory",
  3: "Neutral",
  4: "Good",
  5: "Outstanding",
}

export const MIN_SCORE = 1
export const MAX_SCORE = 5

export type ScoreSheet = Record<string, number>

/**
 * Weighted total out of 100.
 *
 * A score of 1 means "not shown" and therefore earns zero of that criterion's
 * weight — mapping 1 to a fifth of the points would hand marks to a team that
 * did not do the thing at all. So the scale is normalised (score - 1) / 4.
 *
 * Missing or out-of-range criteria contribute nothing rather than throwing:
 * a half-filled sheet during live demos should still produce a usable number.
 */
export function weightedTotal(sheet: ScoreSheet): number {
  let total = 0
  for (const criterion of JUDGING_CRITERIA) {
    const raw = sheet[criterion.key]
    if (typeof raw !== "number" || Number.isNaN(raw)) continue
    const clamped = Math.min(MAX_SCORE, Math.max(MIN_SCORE, raw))
    total += ((clamped - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * criterion.weight
  }
  return Math.round(total * 10) / 10
}

/** True when every criterion has a usable score — used to flag partial sheets. */
export function isComplete(sheet: ScoreSheet): boolean {
  return JUDGING_CRITERIA.every((c) => {
    const raw = sheet[c.key]
    return typeof raw === "number" && raw >= MIN_SCORE && raw <= MAX_SCORE
  })
}

export interface JudgeScore {
  judgeEmail: string
  teamId: string
  sheet: ScoreSheet
}

export interface TeamStanding {
  teamId: string
  /** Mean of each judge's weighted total. */
  average: number
  judgeCount: number
  /** Per-criterion mean of the raw 1–5 scores, for the breakdown view. */
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
export function standings(scores: JudgeScore[]): TeamStanding[] {
  const byTeam = new Map<string, JudgeScore[]>()
  for (const score of scores) {
    const list = byTeam.get(score.teamId)
    if (list) list.push(score)
    else byTeam.set(score.teamId, [score])
  }

  const rows: TeamStanding[] = []
  for (const [teamId, sheets] of byTeam) {
    const totals = sheets.map((s) => weightedTotal(s.sheet))
    const average = totals.reduce((a, b) => a + b, 0) / (totals.length || 1)

    const criterionAverages: Record<string, number> = {}
    for (const criterion of JUDGING_CRITERIA) {
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
