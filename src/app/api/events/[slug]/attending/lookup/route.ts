/**
 * Public lookup for the "I'm attending" card: is this email on the event's
 * approved Luma guest list?
 *
 * POST with a JSON body only, never cached. The answer is `{found:true}` or
 * `{found:false}` and never carries a name or a count. Every miss (unknown
 * event, event no longer upcoming, no list, email not on the list, guest not
 * approved) returns the same bytes. The email is hashed and discarded; the
 * route logs nothing about it.
 *
 * Abuse limits: 30 lookups per 15 minutes per IP, and a not-found budget of
 * 300 per hour per event that only misses spend. In production the shared
 * Redis store is required: without it the route answers 503 rather than fall
 * back to a per-instance counter an attacker could sidestep.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getRedisClient, rateLimit } from "@/lib/rate-limit"
import { startOfTodayEAT } from "@/lib/event-dates"
import { hmacEmail, MAX_EMAIL_LENGTH, MissingHmacKeyError } from "@/lib/attending/hmac-email"
import { APPROVED_STATUS } from "@/lib/attending/parse-guest-csv"

const IP_LIMIT = { maxRequests: 30, windowInSeconds: 900 } as const
const EVENT_MISS_BUDGET = { maxRequests: 300, windowInSeconds: 3600 } as const
const UPCOMING_STATUSES = ["UPCOMING", "REGISTRATION_OPEN"]

const lookupSchema = z.object({ email: z.string().trim().min(3).max(MAX_EMAIL_LENGTH) }).strict()

/** One shared response shape so a miss is byte-identical whatever caused it. */
const NOT_FOUND_BODY = { found: false } as const
const NO_STORE = { "Cache-Control": "no-store" }

function respond(body: object, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } })
}

/** Client IP the way rate-limit.ts reads it: the platform-set header first. */
function clientIp(request: NextRequest): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")
  if (vercelIp) return vercelIp.split(",")[0].trim()
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown"
}

/** Event id when the event is open for the card (upcoming status, day not yet past), else null. */
async function findUpcomingEventId(slug: string): Promise<string | null> {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, status: true, date: true },
  })
  if (!event || !UPCOMING_STATUSES.includes(event.status)) return null
  return event.date >= startOfTodayEAT() ? event.id : null
}

async function isApprovedGuest(eventId: string, emailHmac: string): Promise<boolean> {
  const guest = await prisma.eventGuest.findUnique({
    where: { eventId_emailHmac: { eventId, emailHmac } },
    select: { approvalStatus: true },
  })
  return guest?.approvalStatus === APPROVED_STATUS
}

/** Spends one unit of the event's not-found budget. False means the budget is gone. */
async function spendMissBudget(request: NextRequest, eventId: string): Promise<boolean> {
  const result = await rateLimit(request, {
    ...EVENT_MISS_BUDGET,
    identifier: () => `attending-miss:${eventId}`,
  })
  return result.success
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === "production" && !getRedisClient()) {
    return respond({ error: "Unavailable" }, 503)
  }

  const ipLimit = await rateLimit(request, {
    ...IP_LIMIT,
    identifier: () => `attending:${clientIp(request)}`,
  })
  if (!ipLimit.success) {
    return respond({ error: "Too many requests" }, 429, { "Retry-After": ipLimit.headers["Retry-After"] ?? "900" })
  }

  const parsed = lookupSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return respond({ error: "Invalid request" }, 400)

  let emailHmac: string
  try {
    emailHmac = hmacEmail(parsed.data.email)
  } catch (error) {
    if (error instanceof MissingHmacKeyError) return respond({ error: "Unavailable" }, 503)
    throw error
  }

  const { slug } = await params
  const eventId = await findUpcomingEventId(slug)
  if (eventId && (await isApprovedGuest(eventId, emailHmac))) return respond({ found: true })

  if (eventId && !(await spendMissBudget(request, eventId))) {
    return respond({ error: "Too many requests" }, 429, { "Retry-After": "3600" })
  }
  return respond(NOT_FOUND_BODY)
}
