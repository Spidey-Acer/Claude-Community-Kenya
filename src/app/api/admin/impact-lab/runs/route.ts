import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { runMatchingByTrack, type MatchResult } from "@/lib/matching"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { toMatchParticipant } from "@/lib/impact-lab/mappers"
import { resolveSettings } from "@/lib/impact-lab/settings"
import { resultSignature } from "@/lib/impact-lab/signature"

const explanationSchema = z.object({
  teamId: z.string().max(40),
  summary: z.string().max(4000),
  strengths: z.array(z.string().max(1000)).max(20),
  weaknesses: z.array(z.string().max(1000)).max(20),
  suggestedProjectDirection: z.string().max(2000).optional(),
  suggestedInternalRoles: z.record(z.string().max(40), z.string().max(200)).optional(),
  warnings: z.array(z.string().max(1000)).max(20),
  source: z.enum(["deterministic", "ai"]),
})

// The reviewed result as displayed by the Matching tab — a structural mirror of
// the engine's MatchResult, validated field by field before it may be frozen.
const dimensionSchema = z.object({
  key: z.string().max(40),
  raw: z.number(),
  weight: z.number(),
  weighted: z.number(),
})
const scoreSchema = z.object({
  total: z.number().min(0).max(100),
  dimensions: z.array(dimensionSchema).max(10),
  penalties: z.array(z.object({ reason: z.string().max(300), points: z.number() })).max(10),
  penaltyTotal: z.number(),
})
const teamSchema = z.object({
  id: z.string().max(40),
  name: z.string().max(120),
  memberIds: z.array(z.string().max(40)).min(1).max(20),
  locked: z.boolean(),
  score: scoreSchema,
  // Set only when the run partitioned by track — preserved so a frozen,
  // reviewed result keeps the pill the Matching tab showed for it.
  trackKey: z.string().max(40).optional(),
})
const resultSchema = z.object({
  teams: z.array(teamSchema).max(200),
  unassignedIds: z.array(z.string().max(40)).max(1000),
  warnings: z.array(z.string().max(600)).max(200),
  averageScore: z.number(),
  settingsUsed: z.unknown(),
})

const saveSchema = z.object({
  cohort: z.string().max(60).optional(),
  name: z.string().min(1).max(120),
  notes: z.string().max(1000).optional(),
  settings: z.unknown().optional(),
  // The result the organiser reviewed on screen. When present it is frozen
  // as-is (after structural + constraint validation) — participants editing
  // their profiles between Generate and Save can no longer block the save.
  result: resultSchema.optional(),
  // Legacy fallback only (no `result` in the payload): signature of the
  // reviewed result; the server recomputes and refuses on mismatch.
  expectedSignature: z.string().max(64).optional(),
  // The explanations the organiser reviewed (Claude or deterministic). Stored
  // with the run so the member reveal shows the same wording; optional because
  // an organiser may save without ever clicking Explain.
  explanations: z.array(explanationSchema).max(200).optional(),
})

/**
 * Constraint checks on a client-submitted result: every referenced participant
 * must exist in the cohort, nobody may be assigned twice, and no team may pair
 * participants who blocked each other. Returns an error string or null.
 */
function validateReviewedResult(
  result: z.infer<typeof resultSchema>,
  rowsById: Map<string, { email: string; blockedTeammates: string[] }>
): string | null {
  const seen = new Set<string>()
  for (const team of result.teams) {
    for (const id of team.memberIds) {
      if (!rowsById.has(id)) {
        return "The reviewed teams reference a participant who no longer exists. Regenerate and try again."
      }
      if (seen.has(id)) {
        return "The reviewed teams assign a participant to two teams. Regenerate and try again."
      }
      seen.add(id)
    }
    const members = team.memberIds.map((id) => rowsById.get(id)!)
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (
          members[i].blockedTeammates.includes(members[j].email) ||
          members[j].blockedTeammates.includes(members[i].email)
        ) {
          return "The reviewed teams place a blocked pair together. Regenerate and try again."
        }
      }
    }
  }
  for (const id of result.unassignedIds) {
    if (seen.has(id)) {
      return "A participant is both assigned and unassigned. Regenerate and try again."
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = await resolveAdminCohort(searchParams.get("cohort"))

  // Only the fields the summary needs — skip the heavy participantsSnapshot and
  // settings JSONB (the list computes three numbers from `result`).
  const runs = await prisma.impactLabMatchRun.findMany({
    where: { cohort },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      notes: true,
      isFinal: true,
      createdAt: true,
      result: true,
    },
  })

  // Surface a lightweight summary; the full result lives on the detail route.
  const data = runs.map((run) => {
    const result = run.result as unknown as MatchResult
    return {
      id: run.id,
      name: run.name,
      notes: run.notes,
      isFinal: run.isFinal,
      createdAt: run.createdAt,
      teamCount: result.teams?.length ?? 0,
      averageScore: result.averageScore ?? 0,
      unassignedCount: result.unassignedIds?.length ?? 0,
    }
  })

  return NextResponse.json({ success: true, data })
}

/**
 * Save the current match as a frozen run. The result is recomputed server-side
 * from the cohort + settings so a saved run is always a legitimate output of the
 * engine, and the participants are snapshotted for reproducibility.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = saveSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const cohort = await resolveAdminCohort(validation.data.cohort)

  let settings
  try {
    settings = resolveSettings(validation.data.settings)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid settings" }, { status: 400 })
  }
  const event = await getEventByCohort(cohort)
  settings = { ...settings, tracks: event?.tracks ?? [] }

  const participants = await prisma.impactLabParticipant.findMany({ where: { cohort } })
  const mapped = participants.map(toMatchParticipant)

  let result: MatchResult
  if (validation.data.result) {
    // Freeze exactly what the organiser reviewed. Recomputing here used to
    // 409 whenever ANY participant edited their profile between Generate and
    // Save — with a live cohort editing constantly, that dead-ended every
    // save. Constraint validation replaces bit-exact recompute.
    const rowsById = new Map(
      participants.map((p) => [p.id, { email: p.email, blockedTeammates: p.blockedTeammates }])
    )
    const constraintError = validateReviewedResult(validation.data.result, rowsById)
    if (constraintError) {
      return NextResponse.json({ success: false, error: constraintError }, { status: 409 })
    }
    result = validation.data.result as MatchResult
  } else {
    // Legacy path (older clients): recompute and refuse on signature drift.
    result = runMatchingByTrack(mapped, settings)
    if (
      validation.data.expectedSignature &&
      resultSignature(result) !== validation.data.expectedSignature
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Participants changed since these teams were generated. Regenerate before saving.",
        },
        { status: 409 }
      )
    }
  }

  // Only keep explanations that describe teams actually in the recomputed
  // result — a stale teamId (from a different generate) must not be frozen.
  const resultTeamIds = new Set(result.teams.map((t) => t.id))
  const explanations = (validation.data.explanations ?? []).filter((e) =>
    resultTeamIds.has(e.teamId)
  )

  // JSON.parse(JSON.stringify(...)) yields plain JSON values for Prisma's Json columns.
  const run = await prisma.impactLabMatchRun.create({
    data: {
      cohort,
      name: validation.data.name,
      notes: validation.data.notes ?? null,
      settings: JSON.parse(JSON.stringify(settings)),
      result: JSON.parse(JSON.stringify(result)),
      participantsSnapshot: JSON.parse(JSON.stringify(mapped)),
      explanations: explanations.length > 0 ? explanations : undefined,
      createdById: check.user.id || null,
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabMatchRun",
    entityId: run.id,
    changes: { name: run.name, cohort },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: run }, { status: 201 })
}
