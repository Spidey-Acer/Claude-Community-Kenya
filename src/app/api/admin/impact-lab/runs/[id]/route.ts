import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  // participantsSnapshot is deliberately omitted — it holds every participant's
  // email + blockedTeammates (including non-consenting people) and is only
  // needed server-side for the final-teams export, never by the client.
  const run = await prisma.impactLabMatchRun.findUnique({
    where: { id },
    select: {
      id: true,
      cohort: true,
      name: true,
      notes: true,
      isFinal: true,
      settings: true,
      result: true,
      explanations: true,
      createdById: true,
      createdAt: true,
    },
  })
  if (!run) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: run })
}

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

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  notes: z.string().max(1000).nullable().optional(),
  isFinal: z.boolean().optional(),
  // Lets the Matching tab attach explanations to a run it auto-saved before
  // Claude had finished writing them. Filtered to the run's own teams.
  explanations: z.array(explanationSchema).max(200).optional(),
  // ISO 8601 with an explicit offset, or null to remove the deadline
  // (submissions stay open). z.string().datetime() rejects an offset-less
  // string like "2026-07-26T09:00" from a bare <input type="datetime-local">
  // value — accepting that would let `new Date(str)` parse it in the
  // server's timezone (UTC on Vercel), silently shifting an organiser's
  // intended EAT deadline by hours. The UI is responsible for converting to
  // an offset-bearing string before it ever reaches this endpoint.
  submissionsCloseAt: z.string().datetime().nullable().optional(),
})

/**
 * Update a run: rename/re-note, or mark it final. Marking final is an atomic
 * swap — the previous final in the cohort is unset in the same transaction, so
 * the "at most one final per cohort" rule can never be transiently violated.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = updateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const { name, notes, isFinal, submissionsCloseAt } = validation.data

  const closeAtUpdate =
    submissionsCloseAt === undefined
      ? {}
      : { submissionsCloseAt: submissionsCloseAt ? new Date(submissionsCloseAt) : null }

  // Explanations may only describe teams that exist in this run's frozen result.
  let explanationsUpdate: Record<string, unknown> | undefined
  if (validation.data.explanations) {
    const teams = (existing.result as { teams?: { id?: string }[] } | null)?.teams ?? []
    const teamIds = new Set(teams.map((t) => t.id))
    const kept = validation.data.explanations.filter((e) => teamIds.has(e.teamId))
    if (kept.length > 0) {
      explanationsUpdate = { explanations: JSON.parse(JSON.stringify(kept)) }
    }
  }

  if (isFinal === true) {
    // Approving a final run requires the `approve` permission, not just `edit`.
    const approveCheck = await checkApiPermission("impact-lab", "approve")
    if (!approveCheck.authorized) return approveCheck.response

    try {
      await prisma.$transaction([
        prisma.impactLabMatchRun.updateMany({
          where: { cohort: existing.cohort, isFinal: true, NOT: { id } },
          data: { isFinal: false },
        }),
        prisma.impactLabMatchRun.update({
          where: { id },
          data: {
            isFinal: true,
            ...(name !== undefined ? { name } : {}),
            ...(notes !== undefined ? { notes } : {}),
            ...explanationsUpdate,
            ...closeAtUpdate,
          },
        }),
      ])
    } catch (error) {
      // The partial unique index (one final per cohort) rejects a concurrent
      // mark-final race that the transaction alone can't stop under read-committed.
      if ((error as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { success: false, error: "Another run was just marked final. Refresh and try again." },
          { status: 409 }
        )
      }
      throw error
    }
  } else {
    await prisma.impactLabMatchRun.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(isFinal === false ? { isFinal: false } : {}),
        ...explanationsUpdate,
        ...closeAtUpdate,
      },
    })
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: isFinal === true ? "APPROVE" : "UPDATE",
    entity: "ImpactLabMatchRun",
    entityId: id,
    changes: {
      ...(name ? { name } : {}),
      ...(isFinal !== undefined ? { isFinal } : {}),
      ...(submissionsCloseAt !== undefined ? { submissionsCloseAt } : {}),
    },
    ...getRequestMetadata(request),
  })

  const updated = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const existing = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.impactLabMatchRun.delete({ where: { id } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "ImpactLabMatchRun",
    entityId: id,
    changes: { name: existing.name },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Run deleted" })
}
