/**
 * DB-backed judging rubrics — validation, the freeze rule, and resolution.
 *
 * Rubrics were code constants (`judging-rubrics.ts`), which meant a second event
 * needed a developer to transcribe a panel's Google Form and deploy. This module
 * lets an organiser author one from the admin dashboard instead. The constants
 * remain the fallback and are what the live event runs on: a row here OVERRIDES
 * the constant for its cohort, in that direction only.
 *
 * `judging.ts` and `judging-rubrics.ts` are deliberately untouched — they are
 * pure and dependency-free so `scripts/verify-judging.ts` can assert the
 * arithmetic without a database. This module is the Prisma-aware layer above
 * them. `rubricForCohort` stays synchronous; `resolveRubric` is its async
 * counterpart, and route handlers call that.
 *
 * ── The freeze rule ──────────────────────────────────────────────────────────
 *
 * `ImpactLabScore.scores` holds raw integers per criterion key and the total is
 * derived at read time from the rubric. So editing a rubric retroactively
 * rewrites the meaning of every score already recorded against it: lowering a
 * `max` clamps stored values down, changing a `weight` reorders the leaderboard,
 * flipping `scoring` re-values every low score, and renaming a key orphans real
 * scores with no error anywhere. `scoreTotal` clamps and skips rather than
 * throwing — correct for a half-filled sheet mid-demo, catastrophic for rubric
 * editing, because it makes a destructive edit a silent one.
 *
 * Therefore: once any score exists for the cohort (or judging has closed),
 * STRUCTURE is immutable — `scoring`, and every criterion's `key`, `min`, `max`,
 * `weight`. PRESENTATION — label, guidance, score anchors, display order — stays
 * editable, because it carries no arithmetic and relabelling is a real need (see
 * docs/impact-lab/16, step 5).
 *
 * The frozen state is DERIVED from the scores, never stored as a flag: the
 * scores cannot be wrong about their own existence, a flag can.
 *
 * Full rationale: docs/impact-lab/17-rubric-builder.md
 */

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  rubricForCohort,
  type JudgingCriterion,
  type JudgingRubric,
  type ScoringMode,
} from "./judging-rubrics"

/** Longest pasted rubric the extraction route will read. */
export const MAX_PASTE_LENGTH = 20_000

/**
 * Criterion keys become JSON object keys in `ImpactLabScore.scores` and column
 * headers in the judging CSV. Constraining them here is cheaper than escaping
 * them at every place they surface.
 */
const CRITERION_KEY = /^[a-z][a-z0-9_]{0,39}$/

const criterionSchema = z.object({
  key: z
    .string()
    .regex(CRITERION_KEY, "Keys must be lowercase letters, digits and underscores, starting with a letter (max 40)."),
  label: z.string().trim().min(1, "Every criterion needs a label.").max(200),
  guidance: z.string().trim().max(2_000),
  min: z.number().int(),
  max: z.number().int().max(100, "A criterion cannot be scored above 100."),
  weight: z.number().positive("Weight must be greater than zero."),
})

/**
 * The only way a rubric enters or leaves the database.
 *
 * Cross-field invariants live in `superRefine` because they cannot be expressed
 * field-by-field. Note that `.superRefine` does NOT survive Zod → JSON Schema
 * conversion, which is why the extraction route uses a separate loose shape for
 * the model and runs this schema afterwards — see `extractionDraftSchema`.
 */
export const rubricInputSchema = z
  .object({
    label: z.string().trim().min(1, "The rubric needs a label.").max(200),
    scoring: z.enum(["normalized", "points"]),
    criteria: z.array(criterionSchema).min(1, "A rubric needs at least one criterion."),
    /**
     * Anchor text per score value. JSON object keys are always strings, so the
     * wire and storage form is string-keyed; `toJudgingRubric` converts to the
     * numeric keys `JudgingRubric` declares.
     */
    scoreLabels: z
      .record(z.string().regex(/^\d+$/, "Score anchors must be keyed by a whole number."), z.string().trim().min(1))
      .nullable()
      .optional(),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    for (const [i, c] of value.criteria.entries()) {
      if (seen.has(c.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["criteria", i, "key"],
          message: `Duplicate criterion key "${c.key}". Two criteria sharing a key share one stored score.`,
        })
      }
      seen.add(c.key)

      if (c.min >= c.max) {
        ctx.addIssue({
          code: "custom",
          path: ["criteria", i, "max"],
          message: `"${c.label || c.key}": max must be greater than min.`,
        })
      }

      // Points scoring adds the raw score, and the denominator is the sum of the
      // WEIGHTS. A weight that disagrees with its max makes the quoted total
      // disagree with the published rubric. Rejected rather than coerced: if the
      // two numbers differ, only whoever entered them knows which is right.
      if (value.scoring === "points" && c.weight !== c.max) {
        ctx.addIssue({
          code: "custom",
          path: ["criteria", i, "weight"],
          message: `"${c.label || c.key}": under points scoring the weight must equal the max (${c.max}), because the raw score IS the points. Got ${c.weight}.`,
        })
      }
    }

    // An anchor for a 7 on a 1-5 scale is never rendered to anyone; it is silent
    // evidence the rubric was mis-entered. Range is the union across criteria,
    // since a mixed-scale rubric legitimately anchors a wider span.
    for (const key of Object.keys(value.scoreLabels ?? {})) {
      const score = Number(key)
      const inRange = value.criteria.some((c) => score >= c.min && score <= c.max)
      if (!inRange) {
        ctx.addIssue({
          code: "custom",
          path: ["scoreLabels", key],
          message: `Score anchor ${score} falls outside every criterion's range, so no judge would ever see it.`,
        })
      }
    }
  })

export type RubricInput = z.infer<typeof rubricInputSchema>

/**
 * Non-fatal observations about an otherwise valid rubric.
 *
 * Under normalized scoring, weights that do not sum to 100 are the one thing
 * worth saying out loud but not worth blocking: an intentional 90 is a
 * legitimate rubric and a typo'd 90 is a bug, and nothing in code can tell them
 * apart. A human reading "weights sum to 90, not 100" can.
 */
export function rubricWarnings(input: RubricInput): string[] {
  const warnings: string[] = []
  if (input.scoring === "normalized") {
    const sum = weightSum(input)
    if (Math.abs(sum - 100) > 0.001) {
      warnings.push(
        `Weights sum to ${sum}, not 100. Totals will still be quoted out of 100, so a team scoring full marks everywhere would reach ${sum}. Intentional is fine; a typo is not.`
      )
    }
  }
  return warnings
}

/** Sum of every criterion's weight. */
export function weightSum(input: Pick<RubricInput, "criteria">): number {
  return Math.round(input.criteria.reduce((sum, c) => sum + c.weight, 0) * 100) / 100
}

/**
 * The denominator totals are quoted against — derived, never stored, matching
 * `totalOutOf()` in judging.ts. A stored value could disagree with the criteria
 * it claims to total.
 */
export function derivedTotalOutOf(input: RubricInput): number {
  return input.scoring === "points" ? weightSum(input) : 100
}

/** Stored row → the shape the judging engine consumes. */
export function toJudgingRubric(cohort: string, input: RubricInput): JudgingRubric {
  const scoreLabels: Record<number, string> | null = input.scoreLabels
    ? Object.fromEntries(Object.entries(input.scoreLabels).map(([k, v]) => [Number(k), v]))
    : null

  return {
    // Derived so it cannot collide with a code constant's id, and cannot be
    // edited into claiming another rubric's identity.
    id: `db-${cohort}`,
    label: input.label,
    scoring: input.scoring as ScoringMode,
    criteria: input.criteria as JudgingCriterion[],
    scoreLabels,
    totalOutOf: derivedTotalOutOf(input),
  }
}

/** A `JudgingRubric` (code constant or DB row) back into editable input form. */
export function toRubricInput(rubric: JudgingRubric): RubricInput {
  return {
    label: rubric.label,
    scoring: rubric.scoring,
    criteria: rubric.criteria.map((c) => ({
      key: c.key,
      label: c.label,
      guidance: c.guidance,
      min: c.min,
      max: c.max,
      weight: c.weight,
    })),
    scoreLabels: rubric.scoreLabels
      ? Object.fromEntries(Object.entries(rubric.scoreLabels).map(([k, v]) => [String(k), v]))
      : null,
  }
}

// ─── Resolution ──────────────────────────────────────────────────────────────

/**
 * The stored rubric for a cohort, or null when there is none — or when the row
 * on disk does not validate.
 *
 * Validating on READ is not belt-and-braces. A row written by an older schema, a
 * hand-edited database, or a bad migration could violate the points invariant,
 * and the resulting totals would quietly disagree with the rubric shown on
 * screen. Falling back to the code constant is the safe direction.
 *
 * Never throws. This sits in the judging path, and `rubricForCohort` promises a
 * judge mid-event never hits an error page; an unreadable row gets the same
 * treatment as an unknown cohort, for the same reason.
 */
export async function loadRubric(cohort: string): Promise<JudgingRubric | null> {
  let row: {
    label: string
    scoring: string
    criteria: unknown
    scoreLabels: unknown
  } | null = null

  try {
    row = await prisma.impactLabRubric.findUnique({
      where: { cohort },
      select: { label: true, scoring: true, criteria: true, scoreLabels: true },
    })
  } catch (error) {
    console.error(`[rubric-store] could not read the rubric for ${cohort}`, error)
    return null
  }

  if (!row) return null

  const parsed = rubricInputSchema.safeParse({
    label: row.label,
    scoring: row.scoring,
    criteria: row.criteria,
    scoreLabels: row.scoreLabels ?? null,
  })

  if (!parsed.success) {
    console.error(
      `[rubric-store] stored rubric for ${cohort} is invalid and was IGNORED — falling back to the code rubric. Fix the row.`,
      parsed.error.issues
    )
    return null
  }

  return toJudgingRubric(cohort, parsed.data)
}

/**
 * The rubric a cohort is judged on: the stored one when there is a valid one,
 * otherwise the code constant.
 *
 * This is the async counterpart to `rubricForCohort`, which stays synchronous on
 * purpose — it is a pure function over a constant map, `verify-judging.ts`
 * asserts on it directly, and making it async would pull Prisma into a module
 * whose whole value is not having it.
 */
export async function resolveRubric(cohort: string): Promise<JudgingRubric> {
  return (await loadRubric(cohort)) ?? rubricForCohort(cohort)
}

// ─── The freeze rule ─────────────────────────────────────────────────────────

export interface RubricFreezeState {
  /** True when criterion keys, min, max, weight and `scoring` are immutable. */
  frozen: boolean
  /** Scorecards a structural edit would silently rewrite. */
  scorecardCount: number
  /** Set once judging closed on the cohort's final run. */
  judgingClosedAt: string | null
}

/**
 * Whether this cohort's rubric structure is still editable.
 *
 * Derived from the scores themselves plus the final run's `judgingClosedAt`.
 * Judging being closed freezes the structure even at zero scores, because a
 * closed run's rubric is part of a published record.
 */
export async function rubricFreezeState(cohort: string): Promise<RubricFreezeState> {
  const [scorecardCount, run] = await Promise.all([
    prisma.impactLabScore.count({ where: { cohort } }),
    prisma.impactLabMatchRun.findFirst({
      where: { cohort, isFinal: true },
      orderBy: { createdAt: "desc" },
      select: { judgingClosedAt: true },
    }),
  ])

  return {
    frozen: scorecardCount > 0 || run?.judgingClosedAt != null,
    scorecardCount,
    judgingClosedAt: run?.judgingClosedAt?.toISOString() ?? null,
  }
}

/**
 * The arithmetic-bearing shape of a rubric, canonicalised for comparison.
 *
 * Criteria are sorted by key and reduced to the four numbers that affect a
 * total. Order is presentational — `scoreTotal`, `isComplete` and `standings`
 * all iterate `criteria` and never index into it — so sorting here is what makes
 * reordering a legal edit under the freeze while a changed max is not. A literal
 * `JSON.stringify(criteria)` would reject a label fix that moved a row.
 */
export function rubricStructure(input: RubricInput): string {
  const criteria = [...input.criteria]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((c) => `${c.key}:${c.min}-${c.max}@${c.weight}`)
  return `${input.scoring}|${criteria.join(",")}`
}

/** A human-readable diff of what a rejected structural edit would have changed. */
function describeStructuralChange(baseline: RubricInput, next: RubricInput): string[] {
  const reasons: string[] = []

  if (baseline.scoring !== next.scoring) {
    reasons.push(
      `scoring mode from "${baseline.scoring}" to "${next.scoring}" — this re-values every score already recorded`
    )
  }

  const before = new Map(baseline.criteria.map((c) => [c.key, c]))
  const after = new Map(next.criteria.map((c) => [c.key, c]))

  for (const [key, c] of before) {
    const updated = after.get(key)
    if (!updated) {
      reasons.push(`removed the criterion "${key}", orphaning every score stored under that key`)
      continue
    }
    if (updated.min !== c.min) reasons.push(`"${key}" min from ${c.min} to ${updated.min}`)
    if (updated.max !== c.max) reasons.push(`"${key}" max from ${c.max} to ${updated.max}`)
    if (updated.weight !== c.weight) reasons.push(`"${key}" weight from ${c.weight} to ${updated.weight}`)
  }
  for (const key of after.keys()) {
    if (!before.has(key)) {
      reasons.push(`added the criterion "${key}", which no existing scorecard has a value for`)
    }
  }

  return reasons
}

export interface FreezeVerdict {
  ok: boolean
  /** Populated when `ok` is false — one sentence, ready to show an organiser. */
  error?: string
  state: RubricFreezeState
}

/**
 * Whether `next` may be saved for this cohort.
 *
 * The baseline is the existing stored rubric, or — when there is none — the CODE
 * constant, which is what any existing scores were made against. That single
 * fallback gives the honest rule for free: a cohort that has already been scored
 * can only author a rubric whose structure matches the one its scores came from.
 * Import it to fix a label; you cannot use import as a back door to the maths.
 */
export async function checkRubricEditable(
  cohort: string,
  next: RubricInput
): Promise<FreezeVerdict> {
  const state = await rubricFreezeState(cohort)
  if (!state.frozen) return { ok: true, state }

  const stored = await loadRubric(cohort)
  const baseline = toRubricInput(stored ?? rubricForCohort(cohort))

  if (rubricStructure(baseline) === rubricStructure(next)) {
    // Presentation-only: labels, guidance, anchors, order. Always allowed.
    return { ok: true, state }
  }

  const reasons = describeStructuralChange(baseline, next)
  const cause =
    state.scorecardCount > 0
      ? `${state.scorecardCount} scorecard${state.scorecardCount === 1 ? " has" : "s have"} already been recorded for this cohort`
      : "judging has been closed for this cohort"

  return {
    ok: false,
    state,
    error: `Cannot change the rubric's structure: ${cause}. Totals are recalculated from the rubric every time anyone reads a score, so this edit would silently rewrite ${state.scorecardCount} scorecard${state.scorecardCount === 1 ? "" : "s"} — it would have changed ${reasons.join("; ")}. Labels, guidance, score anchors and the display order are still editable.${
      stored ? "" : " (Compared against the built-in rubric, which is what those scores were produced against.)"
    }`,
  }
}

/**
 * Whether the stored rubric may be deleted, reverting the cohort to its code
 * constant. Freeze-gated identically to a save: reverting swaps the arithmetic
 * back, which is the same retroactive hazard in the opposite direction.
 */
export async function checkRubricDeletable(cohort: string): Promise<FreezeVerdict> {
  const state = await rubricFreezeState(cohort)
  if (!state.frozen) return { ok: true, state }

  const cause =
    state.scorecardCount > 0
      ? `${state.scorecardCount} scorecard${state.scorecardCount === 1 ? " has" : "s have"} been recorded against it`
      : "judging has been closed for this cohort"

  return {
    ok: false,
    state,
    error: `Cannot revert to the built-in rubric: ${cause}. Deleting this rubric would recalculate every recorded total against a different set of criteria.`,
  }
}
