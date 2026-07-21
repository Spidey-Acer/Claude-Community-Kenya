import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { participantDraftSchema } from "@/lib/impact-lab/participant-schema"

const importSchema = z.object({
  cohort: z.string().max(60).optional(),
  // Raw rows — validated individually so one bad row doesn't fail the batch.
  participants: z.array(z.unknown()).max(500),
})

/**
 * Bulk import participants. The client maps CSV columns to fields and splits
 * multi-value cells, then posts an array of drafts. Each row is validated and
 * upserted on (cohort, email); per-row failures are reported, not fatal.
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
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const cohort = parsed.data.cohort ?? DEFAULT_COHORT
  const errors: { row: number; error: string }[] = []
  let created = 0
  let updated = 0

  for (let i = 0; i < parsed.data.participants.length; i++) {
    const validation = participantDraftSchema.safeParse(parsed.data.participants[i])
    if (!validation.success) {
      errors.push({ row: i + 1, error: validation.error.issues[0]?.message ?? "Invalid row" })
      continue
    }

    const existing = await prisma.impactLabParticipant.findUnique({
      where: { cohort_email: { cohort, email: validation.data.email } },
    })

    if (existing) {
      await prisma.impactLabParticipant.update({
        where: { id: existing.id },
        data: validation.data,
      })
      updated++
    } else {
      await prisma.impactLabParticipant.create({
        data: { ...validation.data, cohort },
      })
      created++
    }
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabParticipant",
    entityId: cohort,
    changes: { imported: created, updated, failed: errors.length },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({
    success: true,
    data: { created, updated, failed: errors.length, errors },
  })
}
