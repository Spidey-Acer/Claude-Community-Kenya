import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { runMatching, type MatchResult } from "@/lib/matching"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { toMatchParticipant } from "@/lib/impact-lab/mappers"
import { resolveSettings } from "@/lib/impact-lab/settings"

const saveSchema = z.object({
  cohort: z.string().max(60).optional(),
  name: z.string().min(1).max(120),
  notes: z.string().max(1000).optional(),
  settings: z.unknown().optional(),
})

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = searchParams.get("cohort") ?? DEFAULT_COHORT

  const runs = await prisma.impactLabMatchRun.findMany({
    where: { cohort },
    orderBy: { createdAt: "desc" },
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

  const cohort = validation.data.cohort ?? DEFAULT_COHORT

  let settings
  try {
    settings = resolveSettings(validation.data.settings)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid settings" }, { status: 400 })
  }

  const participants = await prisma.impactLabParticipant.findMany({ where: { cohort } })
  const mapped = participants.map(toMatchParticipant)
  const result = runMatching(mapped, settings)

  // JSON.parse(JSON.stringify(...)) yields plain JSON values for Prisma's Json columns.
  const run = await prisma.impactLabMatchRun.create({
    data: {
      cohort,
      name: validation.data.name,
      notes: validation.data.notes ?? null,
      settings: JSON.parse(JSON.stringify(settings)),
      result: JSON.parse(JSON.stringify(result)),
      participantsSnapshot: JSON.parse(JSON.stringify(mapped)),
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
