// POST /api/events/[slug]/contributions — submit a problem statement to a
// Conversations event's open contribution window.
// GET  /api/events/[slug]/contributions — public read of moderated
// contributions only (APPROVED + FEATURED). Never returns PENDING/REJECTED
// rows or ipHash.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.
//
// Route param is [slug], not [id] — see the note in the sibling
// questions/route.ts for why.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { contributionSubmissionSchema } from "@/lib/events/participation-schemas"
import { hashSubmitterIp } from "@/lib/events/ip-hash"
import type { SubmissionModerationStatus } from "@/generated/prisma/client"

/** Combined daily cap per hashed IP, across questions + contributions. */
const DAILY_SUBMISSION_CAP = 10
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Public contributions GET never returns more than this many rows. */
const MAX_PUBLIC_CONTRIBUTIONS = 100

const PUBLIC_STATUSES: SubmissionModerationStatus[] = ["APPROVED", "FEATURED"]

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
 * 24 hours, enforced independently of the per-route rate limit.
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

  const rateLimitResult = await rateLimit(request, RateLimits.CONTRIBUTION_SUBMIT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many contributions submitted. Please try again tomorrow." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  // Honeypot: same silent-success shape and status a real submitter gets —
  // see questions/route.ts for why the response must not differ.
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

  const validation = contributionSubmissionSchema.safeParse(rawBody)
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

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      conversationsPage: { select: { contributionsOpen: true, tableQuestions: true } },
    },
  })
  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
  }
  if (!event.conversationsPage) {
    return NextResponse.json(
      { success: false, error: "This event has no Conversations page" },
      { status: 404 }
    )
  }
  if (!event.conversationsPage.contributionsOpen) {
    return NextResponse.json(
      { success: false, error: "Contributions are closed for this event" },
      { status: 403 }
    )
  }

  const tableQuestions = event.conversationsPage.tableQuestions
  const validKeys = Array.isArray(tableQuestions)
    ? tableQuestions
        .map((q) => (typeof q === "object" && q !== null && "key" in q ? (q as { key: unknown }).key : null))
        .filter((key): key is string => typeof key === "string")
    : []
  if (!validKeys.includes(data.questionKey)) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: { questionKey: "Not one of this event's table questions." },
      },
      { status: 400 }
    )
  }

  let ipHash: string
  try {
    ipHash = hashSubmitterIp(getSubmitterIp(request))
  } catch (error) {
    console.error("[EVENT_CONTRIBUTIONS] Failed to hash submitter IP:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit contribution. Please try again." },
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
    await prisma.eventContribution.create({
      data: {
        eventId: event.id,
        questionKey: data.questionKey,
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
    console.error("[EVENT_CONTRIBUTIONS] Failed to create:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit contribution. Please try again." },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const event = await prisma.event.findUnique({ where: { slug }, select: { id: true } })
  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
  }

  const rows = await prisma.eventContribution.findMany({
    where: { eventId: event.id, status: { in: PUBLIC_STATUSES } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      questionKey: true,
      body: true,
      submitterName: true,
      county: true,
      status: true,
      createdAt: true,
    },
  })

  // FEATURED first, newest first within each tier. A flat array sorted this
  // way still satisfies "FEATURED first within each questionKey group" once
  // the client filters by questionKey, because filtering preserves relative
  // order — no per-group query needed.
  const featured = rows.filter((r) => r.status === "FEATURED")
  const approved = rows.filter((r) => r.status === "APPROVED")
  const ordered = [...featured, ...approved].slice(0, MAX_PUBLIC_CONTRIBUTIONS)

  return NextResponse.json({ success: true, data: ordered })
}
