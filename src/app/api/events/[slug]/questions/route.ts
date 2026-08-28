// POST /api/events/[slug]/questions — submit a question to an event's open
// EventQuestionSession (Conversations Live "Ask Anthropic's team" Q&A).
// No auth: honeypot + CSRF + rate limit + a per-IP daily cap across both
// submission types stand in for it. Nothing here is ever returned by a
// public GET — questions are for the live session, not a public wall.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.
//
// Route param is [slug], not [id]: Next.js requires every dynamic segment at
// the same path level to share one param name, and
// src/app/api/events/[slug]/demo-request/route.ts already claims "slug" for
// api/events/*. Looked up the same way demo-request does.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { questionSubmissionSchema } from "@/lib/events/participation-schemas"
import { hashSubmitterIp } from "@/lib/events/ip-hash"

/** Combined daily cap per hashed IP, across questions + contributions. */
const DAILY_SUBMISSION_CAP = 150 // shared NAT: one venue IP is a whole room
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Derives the request's originating IP the same way src/lib/rate-limit.ts
 * does, so the daily-cap hash and the rate limiter key off the same address.
 */
function getSubmitterIp(request: NextRequest): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")
  if (vercelIp) return vercelIp.split(",")[0]
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIp || "unknown"
}

/**
 * Counts this IP's submissions across both submission models in the last
 * 24 hours, enforced independently of the per-route rate limit (which is
 * per-route and resets separately for questions vs contributions).
 */
async function countRecentSubmissions(ipHash: string): Promise<number> {
  const since = new Date(Date.now() - ONE_DAY_MS)
  const [questionCount, contributionCount] = await Promise.all([
    prisma.eventQuestion.count({ where: { ipHash, createdAt: { gte: since } } }),
    prisma.eventContribution.count({ where: { ipHash, createdAt: { gte: since } } }),
  ])
  return questionCount + contributionCount
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.QUESTION_SUBMIT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many questions submitted. Please try again tomorrow." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  // Honeypot: a filled `website` field means a bot filled every input it
  // could find. Report the same success shape and status a real submitter
  // gets, silently, without writing — a differing response would let a bot
  // fingerprint the trap.
  if (
    typeof rawBody === "object" &&
    rawBody !== null &&
    "website" in rawBody &&
    typeof (rawBody as Record<string, unknown>).website === "string" &&
    (rawBody as Record<string, unknown>).website !== ""
  ) {
    return NextResponse.json(
      { success: true, data: { status: "pending_review" } },
      { status: 201 }
    )
  }

  const validation = questionSubmissionSchema.safeParse(rawBody)
  if (!validation.success) {
    const details: Record<string, string> = {}
    for (const issue of validation.error.issues) {
      const key = issue.path[0]
      if (key && !details[String(key)]) details[String(key)] = issue.message
    }
    return NextResponse.json(
      { success: false, error: "Validation failed", details },
      { status: 400 }
    )
  }

  const data = validation.data
  const { slug } = await params

  const event = await prisma.event.findUnique({ where: { slug }, select: { id: true } })
  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
  }

  // Newest-first: if two sessions are ever open at once, this must resolve
  // to the same session queries.ts's getOpenQuestionSession shows on the
  // public page, or a submission could land in a session nobody sees.
  const session = await prisma.eventQuestionSession.findFirst({
    where: { eventId: event.id, isOpen: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!session) {
    return NextResponse.json(
      { success: false, error: "No open question session for this event" },
      { status: 404 }
    )
  }

  let ipHash: string
  try {
    ipHash = hashSubmitterIp(getSubmitterIp(request))
  } catch (error) {
    console.error("[EVENT_QUESTIONS] Failed to hash submitter IP:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit question. Please try again." },
      { status: 500 }
    )
  }

  const recentCount = await countRecentSubmissions(ipHash)
  if (recentCount >= DAILY_SUBMISSION_CAP) {
    return NextResponse.json(
      { success: false, error: "Daily submission limit reached. Please try again tomorrow." },
      { status: 429 }
    )
  }

  try {
    await prisma.eventQuestion.create({
      data: {
        sessionId: session.id,
        body: data.body,
        submitterName: data.submitterName,
        county: data.county,
        ipHash,
      },
    })

    return NextResponse.json(
      { success: true, data: { status: "pending_review" } },
      { status: 201 }
    )
  } catch (error) {
    console.error("[EVENT_QUESTIONS] Failed to create:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit question. Please try again." },
      { status: 500 }
    )
  }
}
