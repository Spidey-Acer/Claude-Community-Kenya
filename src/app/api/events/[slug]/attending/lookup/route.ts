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
 * A request that is not application/json (415) or carries a foreign Origin
 * header (403) is refused before any budget is spent. Abuse limits, each spent atomically by ONE consume call before any guest
 * lookup, on every request hit or miss: 20 per hour per client (IPv4 address or IPv6 /64) and 600 per hour per
 * event slug (so unknown and non-upcoming events are charged too). If either is
 * spent the answer is the same 429 whatever the email is, and no lookup runs.
 * Nothing reads a counter and acts on it later. In production the shared Redis
 * store is required: without it the route answers 503 rather than fall back to
 * a per-instance counter an attacker could sidestep.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { SITE_CONFIG } from "@/lib/constants"
import { prisma } from "@/lib/prisma"
import { getRedisClient, rateLimit } from "@/lib/rate-limit"
import { startOfTodayEAT } from "@/lib/event-dates"
import { hmacEmail, MAX_EMAIL_LENGTH, MissingHmacKeyError } from "@/lib/attending/hmac-email"
import { ipBucketKey } from "@/lib/attending/ip-bucket"
import { APPROVED_STATUS } from "@/lib/attending/parse-guest-csv"

const IP_LIMIT = { maxRequests: 20, windowInSeconds: 3600 } as const
const EVENT_LIMIT = { maxRequests: 600, windowInSeconds: 3600 } as const
const RETRY_AFTER_SECONDS = "3600"
const UPCOMING_STATUSES = ["UPCOMING", "REGISTRATION_OPEN"]

const lookupSchema = z.object({ email: z.string().trim().min(3).max(MAX_EMAIL_LENGTH) }).strict()

/** One shared response shape so a miss is byte-identical whatever caused it. */
const NOT_FOUND_BODY = { found: false } as const
const NO_STORE = { "Cache-Control": "no-store" }

function respond(body: object, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } })
}

/** Origins a browser may legitimately call from: this deployment's own, and the canonical site. */
function allowedOrigins(request: NextRequest): string[] {
  return [request.nextUrl.origin, new URL(SITE_CONFIG.url).origin]
}

/**
 * Rejects a request that is not JSON (415) or that a browser sent from a foreign
 * origin (403). No Origin header (curl, server-side callers) is judged on
 * Content-Type alone. Runs before any budget is spent.
 */
function rejectBadShape(request: NextRequest): NextResponse | null {
  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()
  if (contentType !== "application/json") return respond({ error: "Unsupported media type" }, 415)
  const origin = request.headers.get("origin")
  if (origin !== null && !allowedOrigins(request).includes(origin)) {
    return respond({ error: "Forbidden" }, 403)
  }
  return null
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

/** The one 429 every spent limit answers with, identical whatever the email is. */
function limitSpentResponse() {
  return respond({ error: "Too many requests" }, 429, { "Retry-After": RETRY_AFTER_SECONDS })
}

/** One atomic consume. True when the unit was granted. */
async function consume(
  request: NextRequest,
  limit: { maxRequests: number; windowInSeconds: number },
  identifier: string,
): Promise<boolean> {
  const result = await rateLimit(request, { ...limit, identifier: () => identifier })
  return result.success
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === "production" && !getRedisClient()) {
    return respond({ error: "Unavailable" }, 503)
  }

  const badShape = rejectBadShape(request)
  if (badShape) return badShape

  const { slug } = await params
  if (!(await consume(request, IP_LIMIT, `attending:${ipBucketKey(clientIp(request))}`))) return limitSpentResponse()
  if (!(await consume(request, EVENT_LIMIT, `attending:event:${slug.slice(0, 100)}`))) {
    // Slug only: never the email, its hash or the IP.
    console.warn(JSON.stringify({ event: "attending-budget-exhausted", slug: slug.slice(0, 100) }))
    return limitSpentResponse()
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

  const eventId = await findUpcomingEventId(slug)
  if (eventId && (await isApprovedGuest(eventId, emailHmac))) return respond({ found: true })
  return respond(NOT_FOUND_BODY)
}
