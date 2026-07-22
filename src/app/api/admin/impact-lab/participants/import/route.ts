import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { participantDraftSchema } from "@/lib/impact-lab/participant-schema"

// A large import must finish in one function invocation — give it headroom
// beyond the default so a ~500-row upload doesn't time out mid-write.
export const maxDuration = 60

const importSchema = z.object({
  cohort: z.string().max(60).optional(),
  // Raw rows — validated individually so one bad row doesn't fail the batch.
  participants: z.array(z.unknown()).max(500),
})

/**
 * Bulk import participants. The client maps CSV columns to fields and splits
 * multi-value cells, then posts an array of drafts. Rows are validated
 * individually (per-row failures are reported, not fatal), deduped by email, and
 * written in a single findMany + $transaction so the whole import is one
 * round-trip pair regardless of size.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  // Key by user id, not IP — organisers share a venue NAT on event day.
  const limit = await rateLimit(request, {
    maxRequests: 6,
    windowInSeconds: 60,
    identifier: () => `impact-lab-import:${check.user.id}`,
  })
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "Too many imports. Please wait a minute." },
      { status: 429, headers: limit.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
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

  // Validate every row; dedupe by email (last occurrence wins) so a repeated
  // email in one file can't self-collide inside the transaction.
  const draftsByEmail = new Map<string, z.infer<typeof participantDraftSchema>>()
  parsed.data.participants.forEach((raw, i) => {
    const validation = participantDraftSchema.safeParse(raw)
    if (!validation.success) {
      errors.push({ row: i + 1, error: validation.error.issues[0]?.message ?? "Invalid row" })
      return
    }
    draftsByEmail.set(validation.data.email, validation.data)
  })

  const drafts = [...draftsByEmail.values()]
  const existing = await prisma.impactLabParticipant.findMany({
    where: { cohort, email: { in: drafts.map((d) => d.email) } },
    select: { id: true, email: true },
  })
  const idByEmail = new Map(existing.map((e) => [e.email, e.id]))

  let created = 0
  let updated = 0
  const ops = drafts.map((draft) => {
    const id = idByEmail.get(draft.email)
    if (id) {
      updated++
      return prisma.impactLabParticipant.update({ where: { id }, data: draft })
    }
    created++
    return prisma.impactLabParticipant.create({ data: { ...draft, cohort } })
  })

  await prisma.$transaction(ops)

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
