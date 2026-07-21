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
  const run = await prisma.impactLabMatchRun.findUnique({ where: { id } })
  if (!run) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: run })
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  notes: z.string().max(1000).nullable().optional(),
  isFinal: z.boolean().optional(),
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

  const { name, notes, isFinal } = validation.data

  if (isFinal === true) {
    // Approving a final run requires the `approve` permission, not just `edit`.
    const approveCheck = await checkApiPermission("impact-lab", "approve")
    if (!approveCheck.authorized) return approveCheck.response

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
        },
      }),
    ])
  } else {
    await prisma.impactLabMatchRun.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(isFinal === false ? { isFinal: false } : {}),
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
    changes: { ...(name ? { name } : {}), ...(isFinal !== undefined ? { isFinal } : {}) },
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
