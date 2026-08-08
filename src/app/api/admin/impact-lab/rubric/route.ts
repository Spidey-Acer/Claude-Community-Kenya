import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { safeCohort } from "@/lib/impact-lab/constants"
import { rubricForCohort } from "@/lib/impact-lab/judging-rubrics"
import {
  checkRubricDeletable,
  checkRubricEditable,
  derivedTotalOutOf,
  loadRubric,
  rubricFreezeState,
  rubricInputSchema,
  rubricWarnings,
  toRubricInput,
  weightSum,
} from "@/lib/impact-lab/rubric-store"

/**
 * The rubric an organiser authors for a cohort.
 *
 * Rubrics used to be code constants, so a panel that emailed its own rubric the
 * afternoon of the event needed a developer and a deploy. This route lets an
 * organiser author one instead. The constants remain the fallback: absence of a
 * row means the constant stands, and DELETE reverts to it.
 *
 * The one thing to understand before changing anything here: score totals are
 * DERIVED from the rubric at read time, so a structural edit retroactively
 * rewrites every score already recorded. `checkRubricEditable` is the control,
 * not a warning — see lib/impact-lab/rubric-store.ts and
 * docs/impact-lab/17-rubric-builder.md.
 *
 * `edit`, not `view`, on every write: MODERATOR (the role a code-gated judge
 * signs in as) holds `view` only, and a judge must never be able to edit the
 * rubric they are scoring against.
 */

/**
 * This code can ship before `impact_lab_rubrics` exists — applying a migration
 * against production is a human's decision, and `loadRubric` deliberately
 * degrades to the code constant so every judging surface keeps working until
 * then. Writes cannot degrade, so they say what is missing instead of throwing a
 * bare 500 at an organiser who would have no way to interpret it.
 *
 * Prisma reports a missing table as P2021.
 */
function tableMissingResponse(error: unknown): NextResponse | null {
  const code = (error as { code?: unknown })?.code
  if (code !== "P2021") return null
  console.error("[impact-lab/rubric] impact_lab_rubrics does not exist", error)
  return NextResponse.json(
    {
      success: false,
      error:
        "The rubric table has not been created in this database yet. Apply migration 20260808120000_impact_lab_rubrics, then try again. Judging is unaffected — it is still using the built-in rubric.",
      code: "RUBRIC_TABLE_MISSING",
    },
    { status: 503 }
  )
}

/** GET — the live rubric for a cohort, its source, and its frozen state. */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))

  const [stored, state] = await Promise.all([loadRubric(cohort), rubricFreezeState(cohort)])
  const rubric = stored ?? rubricForCohort(cohort)
  const input = toRubricInput(rubric)

  const row = stored
    ? await prisma.impactLabRubric.findUnique({
        where: { cohort },
        select: { source: true, updatedByEmail: true, updatedAt: true },
      })
    : null

  return NextResponse.json({
    success: true,
    data: {
      rubric: input,
      /** "database" when an organiser authored it, "built-in" for the constant. */
      source: stored ? "database" : "built-in",
      /** The built-in rubric this cohort falls back to, named so the UI can say so. */
      builtInLabel: rubricForCohort(cohort).label,
      provenance: row
        ? {
            source: row.source,
            updatedByEmail: row.updatedByEmail,
            updatedAt: row.updatedAt.toISOString(),
          }
        : null,
      totalOutOf: derivedTotalOutOf(input),
      weightSum: weightSum(input),
      warnings: rubricWarnings(input),
      ...state,
    },
  })
}

/** PUT — validate, freeze-check, upsert. The only write path for a rubric. */
export async function PUT(request: NextRequest) {
  try {
    return await handlePut(request)
  } catch (error) {
    const missing = tableMissingResponse(error)
    if (missing) return missing
    throw error
  }
}

async function handlePut(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const rl = await rateLimit(request, {
    maxRequests: 40,
    windowInSeconds: 300,
    identifier: () => `impact-lab-rubric:${check.user.id}`,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = rubricInputSchema.safeParse(
    body && typeof body === "object" ? (body as { rubric?: unknown }).rubric : null
  )
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "This rubric is not valid yet.",
        // Field paths so the form can put each message beside the input that
        // caused it, rather than one banner listing everything.
        issues: parsed.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        })),
      },
      { status: 400 }
    )
  }

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const rubric = parsed.data

  const verdict = await checkRubricEditable(cohort, rubric)
  if (!verdict.ok) {
    return NextResponse.json(
      { success: false, error: verdict.error, code: "RUBRIC_FROZEN", ...verdict.state },
      { status: 409 }
    )
  }

  const source =
    typeof body === "object" && body !== null && (body as { source?: unknown }).source === "extracted"
      ? "extracted"
      : "manual"

  await prisma.impactLabRubric.upsert({
    where: { cohort },
    create: {
      cohort,
      label: rubric.label,
      scoring: rubric.scoring,
      criteria: rubric.criteria,
      scoreLabels: rubric.scoreLabels ?? undefined,
      source,
      createdByEmail: check.user.email,
      updatedByEmail: check.user.email,
    },
    update: {
      label: rubric.label,
      scoring: rubric.scoring,
      criteria: rubric.criteria,
      // `Prisma.DbNull` clears the column; plain `undefined` would leave the old
      // anchors behind on a rubric the organiser just decided should have none,
      // and a bare `null` is rejected for a nullable Json column.
      scoreLabels: rubric.scoreLabels ?? Prisma.DbNull,
      source,
      updatedByEmail: check.user.email,
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ImpactLabRubric",
    entityId: cohort,
    changes: {
      cohort,
      action: "save",
      label: rubric.label,
      scoring: rubric.scoring,
      criteria: rubric.criteria.map((c) => `${c.key}:${c.min}-${c.max}@${c.weight}`),
      source,
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({
    success: true,
    data: {
      saved: true,
      totalOutOf: derivedTotalOutOf(rubric),
      weightSum: weightSum(rubric),
      warnings: rubricWarnings(rubric),
      ...verdict.state,
    },
  })
}

/** DELETE — revert the cohort to its built-in rubric. Freeze-gated like PUT. */
export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request)
  } catch (error) {
    const missing = tableMissingResponse(error)
    if (missing) return missing
    throw error
  }
}

async function handleDelete(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))

  const existing = await prisma.impactLabRubric.findUnique({
    where: { cohort },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "This cohort already uses its built-in rubric." },
      { status: 404 }
    )
  }

  const verdict = await checkRubricDeletable(cohort)
  if (!verdict.ok) {
    return NextResponse.json(
      { success: false, error: verdict.error, code: "RUBRIC_FROZEN", ...verdict.state },
      { status: 409 }
    )
  }

  await prisma.impactLabRubric.delete({ where: { cohort } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "ImpactLabRubric",
    entityId: cohort,
    changes: { cohort, action: "revert-to-built-in" },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: { reverted: true } })
}
