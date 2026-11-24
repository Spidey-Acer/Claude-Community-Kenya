import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { guestRetentionCutoff } from "@/lib/attending/retention"

/**
 * Daily purge of the attending-card guest list: deletes every guest row whose
 * event was dated more than 2 days ago. The retention clock follows
 * Event.date, so an edited date moves the deadline with it. That also means a
 * multi-day event's list is purged two days after its START date, not its end.
 *
 * Fails closed like the other crons: no CRON_SECRET configured means 500, a
 * missing or wrong Authorization header means 401, and nothing is deleted in
 * either case. Logs a count only.
 */
/** Constant-time bearer check; a different length is a mismatch, never compared. */
function hasValidBearer(header: string | null, secret: string): boolean {
  if (header === null) return false
  const given = Buffer.from(header)
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    )
  }
  if (!hasValidBearer(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = guestRetentionCutoff(new Date())
  const { count } = await prisma.eventGuest.deleteMany({
    where: { event: { date: { lt: cutoff } } },
  })
  return NextResponse.json({ success: true, deleted: count })
}
