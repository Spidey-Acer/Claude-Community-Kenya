/**
 * Admin guest-list routes for the "I'm attending" card.
 *
 * POST   merge or replace the event's Luma guest list (permission events:edit)
 * DELETE wipe every guest row for the event          (permission events:delete)
 *
 * Status is normalised to approved or other. Emails are hashed here and the raw value is discarded in the same request:
 * only the HMAC is written, and neither the audit entry nor any response
 * carries a row, only counts. A missing ATTENDING_HMAC_KEY fails closed
 * before anything is stored.
 */
import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { hmacEmail, MissingHmacKeyError } from "@/lib/attending/hmac-email"
import { guestUploadSchema, normalizeApprovalStatus } from "@/lib/attending/guest-upload-schema"

/** Starting value from the spec; Peter set no number. Per user, per route. */
const ADMIN_LIMIT = { maxRequests: 10, windowInSeconds: 3600 } as const

type RouteContext = { params: Promise<{ id: string }> }
type Admin = { id: string; name: string; email: string }

interface HashedGuest {
  emailHmac: string
  approvalStatus: string
}

function fail(error: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ success: false, error }, { status, headers })
}

/** Hashes each row, last occurrence of an email wins. Throws MissingHmacKeyError. */
function hashGuests(rows: { email: string; status: string }[]): HashedGuest[] {
  const byHmac = new Map<string, HashedGuest>()
  for (const row of rows) {
    const emailHmac = hmacEmail(row.email)
    byHmac.set(emailHmac, { emailHmac, approvalStatus: normalizeApprovalStatus(row.status) })
  }
  return [...byHmac.values()]
}

/** Groups hashed guests by status so each status is one updateMany. */
function groupByStatus(guests: HashedGuest[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const guest of guests) {
    const list = groups.get(guest.approvalStatus) ?? []
    list.push(guest.emailHmac)
    groups.set(guest.approvalStatus, list)
  }
  return groups
}

/** Shared guards: CSRF, permission, per-user rate limit. Returns a response to send, or the admin. */
async function guard(
  request: NextRequest,
  action: "edit" | "delete",
  limiterName: string,
): Promise<{ response: NextResponse } | { admin: Admin }> {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return { response: csrfError }

  const check = await checkApiPermission("events", action)
  if (!check.authorized) return { response: check.response }

  const limit = await rateLimit(request, {
    ...ADMIN_LIMIT,
    identifier: () => `${limiterName}:${check.user.id}`,
  })
  if (!limit.success) {
    return { response: fail("Too many requests. Please try again later.", 429, limit.headers) }
  }
  return { admin: check.user }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const guarded = await guard(request, "edit", "attending-upload")
  if ("response" in guarded) return guarded.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Invalid request body", 400)
  }
  const parsed = guestUploadSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 400)

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
  if (!event) return fail("Not found", 404)

  let guests: HashedGuest[]
  try {
    guests = hashGuests(parsed.data.guests)
  } catch (error) {
    if (error instanceof MissingHmacKeyError) return fail("Guest list is not configured", 503)
    throw error
  }

  let result: Awaited<ReturnType<typeof writeGuests>>
  try {
    result = await writeGuests(id, parsed.data.mode, guests)
  } catch (error) {
    // One transaction: nothing was written. Error name only, never row data.
    console.error("attending guest write failed:", error instanceof Error ? error.name : "unknown")
    return fail("Could not save the guest list", 500)
  }
  await logAudit({
    userId: guarded.admin.id,
    userName: guarded.admin.name,
    action: "UPDATE",
    entity: "EventGuest",
    entityId: id,
    changes: { mode: parsed.data.mode, received: parsed.data.guests.length, ...result },
    ...getRequestMetadata(request),
  })
  return NextResponse.json({ success: true, mode: parsed.data.mode, ...result })
}

/** Writes in one transaction. Replace deletes first; merge never deletes. Counts only. */
async function writeGuests(eventId: string, mode: "merge" | "replace", guests: HashedGuest[]) {
  const importedAt = new Date()
  const groups = groupByStatus(guests)
  const wipe = mode === "replace" ? [prisma.eventGuest.deleteMany({ where: { eventId } })] : []
  const results = await prisma.$transaction([
    ...wipe,
    prisma.eventGuest.createMany({
      data: guests.map((guest) => ({ eventId, importedAt, ...guest })),
      skipDuplicates: true,
    }),
    // Rows that already existed take the new status; rows just created already match.
    ...[...groups].map(([approvalStatus, emailHmacs]) =>
      prisma.eventGuest.updateMany({
        where: { eventId, emailHmac: { in: emailHmacs } },
        data: { approvalStatus, importedAt },
      }),
    ),
  ])
  const deleted = wipe.length > 0 ? results[0].count : 0
  const created = results[wipe.length].count
  return { deleted, created, updated: guests.length - created }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const guarded = await guard(request, "delete", "attending-wipe")
  if ("response" in guarded) return guarded.response

  const { id } = await params
  // An unknown event id is a 404 with no audit entry, not a "deleted 0" success.
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
  if (!event) return fail("Not found", 404)

  const { count } = await prisma.eventGuest.deleteMany({ where: { eventId: id } })
  await logAudit({
    userId: guarded.admin.id,
    userName: guarded.admin.name,
    action: "DELETE",
    entity: "EventGuest",
    entityId: id,
    changes: { deleted: count },
    ...getRequestMetadata(request),
  })
  return NextResponse.json({ success: true, deleted: count })
}
