/**
 * Pure decisions behind the judges' in-app brief.
 *
 * The brief is the reference sheet a judge reads on a phone between demos:
 * tonight's flow, how to score, the live rubric, the tracks and the panel
 * rules. Everything here is dependency-free so it can be asserted without a
 * DOM or a database — `JudgeBrief.tsx` owns the rendering and the one place
 * `sessionStorage` is touched.
 */

/** The two panels on the judge screen. */
export type JudgeTab = "brief" | "score"

/** Key the remembered tab is stored under, per browser session. */
export const JUDGE_TAB_STORAGE_KEY = "cck.judge.tab"

/** Narrowing guard for a value read back out of `sessionStorage`. */
export function isJudgeTab(value: unknown): value is JudgeTab {
  return value === "brief" || value === "score"
}

/**
 * Which panel opens when the judge screen mounts.
 *
 * A remembered choice always wins: a judge who tapped "Score" meant it, and
 * having the app second-guess them mid-event would be worse than useless.
 * With nothing remembered, a judge who has not scored anything yet is arriving
 * for the first time and should land on the brief; one with scores already in
 * is mid-event and wants the scorecard.
 *
 * @param stored Raw value from `sessionStorage`, or null when absent/unreadable.
 * @param hasScored Whether this judge already has a score for any team.
 */
export function resolveJudgeTab(stored: string | null, hasScored: boolean): JudgeTab {
  if (isJudgeTab(stored)) return stored
  return hasScored ? "score" : "brief"
}

/**
 * One-line descriptions for the Impact Lab criteria, used only when the live
 * rubric supplies no guidance for that criterion.
 *
 * The stored-rubric schema allows an empty `guidance`, and a criterion with no
 * description is a rubric row a judge cannot calibrate against. Keyed by
 * criterion key rather than label, because labels are editable presentation
 * under the rubric freeze rule and keys are not.
 */
export const FALLBACK_CRITERION_DESCRIPTIONS: Readonly<Record<string, string>> = {
  impact: "Would this move one real person's week?",
  demo: "Software, not slides. A small flow that runs end to end beats a big one stitched together.",
  claude: "Where does Claude sit and is it doing real work?",
  clarity:
    "Can they name exactly who this is for and what that person struggles with today?",
  presentation: "Honest, within time, you understood the person and the tool.",
}

/**
 * The description shown beside a criterion in the brief: the rubric's own
 * guidance when it has one, else the Impact Lab fallback, else nothing.
 *
 * Never invents text for an unknown key — a second event's rubric with blank
 * guidance shows a bare criterion rather than Impact Lab wording that would
 * describe the wrong thing.
 */
export function criterionDescription(key: string, guidance: string | undefined): string {
  const live = guidance?.trim()
  if (live) return live
  return FALLBACK_CRITERION_DESCRIPTIONS[key] ?? ""
}

/**
 * One rubric row as the judge-events endpoint sends it. Declared here rather
 * than in a component so the picker and the brief agree on the wire shape
 * without importing from each other.
 */
export interface JudgeBriefCriterion {
  key: string
  label: string
  /** Points at full marks. */
  weight: number
  /** The rubric's own description. May be empty — see `criterionDescription`. */
  guidance: string
}
