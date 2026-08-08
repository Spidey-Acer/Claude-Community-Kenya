/**
 * Judging rubrics, one per event.
 *
 * The judging engine was built around a single hardcoded rubric: five criteria,
 * every one scored 1–5, weights summing to 100. That held for as long as this
 * system ran one event. It does not survive the second one.
 *
 * The Afretec/C4DLab hackathon panel supplied its own rubric: eight criteria
 * with *different maxima* (10, 10, 8, 4, 4, 4, 6, 4) totalling 50 points. Two
 * things about it break the old assumptions:
 *
 *  1. The scale is per-criterion, not global. `MAX_SCORE = 5` cannot describe
 *     a criterion scored out of 10.
 *  2. The arithmetic is different in kind. The Impact Lab rubric NORMALISES —
 *     a 1 means "not shown" and earns zero of that criterion's weight, by
 *     deliberate design. A points rubric out of 50 does not work that way: a 1
 *     out of 10 is worth one point. Running the normalising formula over the
 *     Afretec rubric would silently under-score every team, worst for the teams
 *     scored lowest.
 *
 * So a rubric declares its own criteria, scales, and how a raw sheet becomes a
 * total. Pure and dependency-free, like the engine that consumes it.
 */

/** One thing a judge scores, and the scale they score it on. */
export interface JudgingCriterion {
  key: string
  label: string
  /** What a judge is actually being asked to look at. */
  guidance: string
  /** Lowest selectable score. */
  min: number
  /** Highest selectable score. */
  max: number
  /**
   * Points this criterion contributes at full marks. Under `"points"` scoring
   * this equals `max`, because the raw score *is* the points.
   */
  weight: number
}

/**
 * How a raw sheet becomes a total.
 *
 * `"normalized"` — (score − min) / (max − min) × weight. The bottom of the
 * scale earns nothing. Use when the scale is a judgement of quality and the
 * lowest rung means "absent".
 *
 * `"points"` — the raw score is the points. Use when the panel published a
 * points rubric and expects totals quoted out of the sum of the maxima.
 */
export type ScoringMode = "normalized" | "points"

export interface JudgingRubric {
  /** Stable id, for storing alongside a score if that is ever needed. */
  id: string
  /** Shown to judges so they know which rubric is on screen. */
  label: string
  scoring: ScoringMode
  criteria: readonly JudgingCriterion[]
  /**
   * Anchor text per score value, so judges calibrate the same way. Null when
   * the scale is too long to anchor usefully — a 1–10 scale with ten labels is
   * noise, and the panel's own rubric anchors it in the criterion guidance.
   */
  scoreLabels: Readonly<Record<number, string>> | null
  /** The denominator a total is quoted against. */
  totalOutOf: number
}

// ─── Impact Lab (Claude Community Kenya) ─────────────────────────────────────

/**
 * The original rubric, unchanged in behaviour.
 *
 * These are the criteria and weights published to builders in the program.
 * That matters more than it looks: teams spent the night optimising against
 * these five things, so judging on anything else would score them on a brief
 * they never received.
 */
export const IMPACT_LAB_RUBRIC: JudgingRubric = {
  id: "impact-lab-v1",
  label: "Impact Lab",
  scoring: "normalized",
  totalOutOf: 100,
  scoreLabels: {
    1: "Not shown / insufficient",
    2: "Attempted, unsatisfactory",
    3: "Neutral",
    4: "Good",
    5: "Outstanding",
  },
  criteria: [
    {
      key: "impact",
      label: "Impact on the named beneficiary",
      guidance:
        "Does this measurably help the specific person the team named? Not a market — a person.",
      min: 1,
      max: 5,
      weight: 25,
    },
    {
      key: "demo",
      label: "A working demo",
      guidance:
        "Did it actually run in front of you? Working software only — what is real versus stubbed.",
      min: 1,
      max: 5,
      weight: 25,
    },
    {
      key: "claude",
      label: "Use of AI",
      guidance:
        "How well did the team use AI to get further than they could have alone?",
      min: 1,
      max: 5,
      weight: 20,
    },
    {
      key: "clarity",
      label: "Beneficiary clarity",
      guidance:
        "Can they say who this helps and what that person struggles with today, in one sentence?",
      min: 1,
      max: 5,
      weight: 15,
    },
    {
      key: "presentation",
      label: "Presentation",
      guidance: "Was the three minutes clear, honest, and well used?",
      min: 1,
      max: 5,
      weight: 15,
    },
  ],
}

// ─── Afretec Pre-Incubation Kickoff Hackathon (C4DLab, UoN) ──────────────────

/**
 * Supplied by the Afretec judging panel, transcribed from their Google Form.
 *
 * Scales are per-criterion and deliberately uneven — the panel weighted problem
 * definition and value proposition at 10 each and everything else below that.
 * The maxima sum to 50, which is the denominator totals are quoted against.
 * Guidance text is the panel's own wording, condensed only where the form
 * repeated itself; do not rewrite it to match house voice, because judges were
 * briefed on these words.
 */
export const AFRETEC_RUBRIC: JudgingRubric = {
  id: "afretec-2026-08",
  label: "Afretec Pre-Incubation Kickoff Hackathon",
  scoring: "points",
  totalOutOf: 50,
  scoreLabels: null,
  criteria: [
    {
      key: "problem",
      label: "Problem Definition & User Insight",
      guidance:
        "Clear articulation of a specific, high-value problem affecting a clearly defined user segment. Understanding of user context, including how the problem is currently addressed. Evidence of validation through user engagement or credible data justifying relevance, urgency and scale.",
      min: 1,
      max: 10,
      weight: 10,
    },
    {
      key: "value",
      label: "Value Proposition, Ideation Depth & Solution Clarity",
      guidance:
        "A clear, compelling explanation of the solution and how it addresses the problem. Evidence of thoughtful ideation, including alternatives explored before converging. The value proposition is specific, differentiated, and clearly better than existing alternatives.",
      min: 1,
      max: 10,
      weight: 10,
    },
    {
      key: "prototype",
      label: "Prototype Development",
      guidance:
        "Evidence of a prototype — digital, physical, experience or process-based — demonstrating the core functionality or logic. Reflects meaningful progress beyond concept and is appropriate to the timeframe, prioritising usability and clarity over complexity.",
      min: 1,
      max: 8,
      weight: 8,
    },
    {
      key: "testing",
      label: "User Testing, Learning & Iteration",
      guidance:
        "Evidence the prototype has been tested with some users, what was learned, and how those insights informed changes, refinements or pivots. Emphasis on the quality of learning, not just the act of testing.",
      min: 1,
      max: 4,
      weight: 4,
    },
    {
      key: "market",
      label: "Market Opportunity & Customer Understanding",
      guidance:
        "Indication of the target market and customer segment. Understanding of demand, potential market, and pathways to reach and acquire users.",
      min: 1,
      max: 4,
      weight: 4,
    },
    {
      key: "feasibility",
      label: "Feasibility, Risk & System Fit",
      guidance:
        "Whether the solution can be implemented within existing technical, regulatory and operational constraints. Awareness of risks — regulatory, infrastructure, adoption — and thinking on how they may be addressed.",
      min: 1,
      max: 4,
      weight: 4,
    },
    {
      key: "team",
      label: "Team Readiness & Execution Potential",
      guidance:
        "Evidence the team has the capability to keep developing the solution beyond the hackathon. Complementary skills, and awareness of gaps in knowledge and skills for design and development.",
      min: 1,
      max: 6,
      weight: 6,
    },
    {
      key: "presentation",
      label: "Presentation & Clarity",
      guidance:
        "The presentation is clear, well-structured and professional. Slides and delivery effectively communicate the idea.",
      min: 1,
      max: 4,
      weight: 4,
    },
  ],
}

// ─── Resolution ──────────────────────────────────────────────────────────────

/**
 * Cohort → rubric. A cohort absent from this map judges on the Impact Lab
 * rubric, which is the right default: it is what every existing score in the
 * database was produced against.
 */
const RUBRIC_BY_COHORT: Readonly<Record<string, JudgingRubric>> = {
  "afretec-hackathon-2026-08": AFRETEC_RUBRIC,
}

/** Every rubric this system knows how to score against. */
export const ALL_RUBRICS: readonly JudgingRubric[] = [
  IMPACT_LAB_RUBRIC,
  AFRETEC_RUBRIC,
]

/**
 * The rubric a cohort is judged on.
 *
 * Never throws on an unknown cohort — a judge mid-event must not hit an error
 * page because a slug was typed differently somewhere. An unknown cohort gets
 * the Impact Lab rubric, which is also what its stored scores were made with.
 */
export function rubricForCohort(cohort: string): JudgingRubric {
  return RUBRIC_BY_COHORT[cohort] ?? IMPACT_LAB_RUBRIC
}

/** Sum of every criterion's full marks. Equals `totalOutOf` for points rubrics. */
export function maxPoints(rubric: JudgingRubric): number {
  return rubric.criteria.reduce((sum, c) => sum + c.weight, 0)
}
