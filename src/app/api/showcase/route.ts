import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import {
  zodSanitizeString,
  zodSanitizeMultilineText,
  zodSanitizeUrl,
  containsPromptInjection,
} from "@/lib/input-sanitization"
import { toSlug } from "@/lib/utils"
import { isNeedKey, MAX_MEDIA_PER_POST } from "@/lib/showcase/constants"
import { publicUrl } from "@/lib/gallery/r2"

/**
 * POST /api/showcase — publish a showcase post.
 *
 * Verified members publish straight to APPROVED, matching the comment rule:
 * an email round-trip is the bar, and a queue nobody drains is the same as no
 * showcase at all. Reports are the backstop, not pre-moderation.
 */

const mediaSchema = z.object({
  key: z.string().min(1).max(300),
  url: z.string().url(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  kind: z.enum(["image", "gif", "mp4"]),
  posterUrl: z.string().url().optional(),
  alt: z.string().max(500).optional(),
})

const bodySchema = z.object({
  title: z.string().min(5).max(150).transform(zodSanitizeString),
  shortDescription: z.string().min(20).max(300).transform(zodSanitizeString),
  fullDescription: z.string().min(50).max(5000).transform(zodSanitizeMultilineText(5000)),
  url: z.string().url().optional().transform(v => (v ? zodSanitizeUrl(v) : undefined)),
  repoUrl: z.string().url().optional().transform(v => (v ? zodSanitizeUrl(v) : undefined)),
  tags: z.array(z.string().max(30).transform(zodSanitizeString)).max(10).default([]),
  coverImageUrl: z.string().url().optional(),
  media: z.array(mediaSchema).max(MAX_MEDIA_PER_POST).default([]),
  eventId: z.string().optional(),
  needs: z.array(z.string()).max(10).default([]).refine(
    values => values.every(isNeedKey),
    { message: "Unknown need" },
  ),
  builtWith: z
    .object({
      models: z.array(z.string().max(60).transform(zodSanitizeString)).max(10).default([]),
      skills: z.array(z.string().max(60).transform(zodSanitizeString)).max(20).default([]),
      mcps: z.array(z.string().max(60).transform(zodSanitizeString)).max(20).default([]),
      tokensPerRun: z.number().int().positive().max(100_000_000).optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.COMMUNITY_SUBMIT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many posts today. Please try again tomorrow." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Sign in to post to the showcase." },
      { status: 401 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, active: true, firstName: true, lastName: true },
  })
  if (!user?.active || !user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "Verify your email address to post to the showcase." },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = bodySchema.safeParse(body)
  if (!validation.success) {
    const details: Record<string, string> = {}
    for (const issue of validation.error.issues) {
      const key = issue.path[0]
      if (key && !details[String(key)]) details[String(key)] = issue.message
    }
    return NextResponse.json(
      { success: false, error: "Validation failed", details },
      { status: 400 },
    )
  }

  const data = validation.data

  // Media descriptors arrive from the browser, so nothing in them is evidence.
  // Two things have to be re-established server-side:
  //
  //   1. The key must sit under this member's own pending prefix — the prefix
  //      finalize writes and the only place they are allowed to claim from.
  //      Without this a member could publish another member's not-yet-posted
  //      upload by guessing or replaying its key.
  //   2. The URL is re-derived from that key rather than taken as given.
  //      `z.string().url()` accepts any URL on the internet, so a fabricated
  //      descriptor could otherwise hang an arbitrary external image inside an
  //      APPROVED post — and there is no queue in front of it to catch that.
  //
  // Width, height and kind stay as supplied. They are layout hints for an
  // object we have now confirmed is ours, and re-sniffing would mean a second
  // round trip to R2 for something finalize already checked.
  const pendingPrefix = `showcase/pending/${userId}/`

  if (data.media.some(item => !item.key.startsWith(pendingPrefix))) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: { media: "Unknown upload" } },
      { status: 400 },
    )
  }

  const media = data.media.map(item => ({
    ...item,
    url: publicUrl(item.key),
    posterUrl: item.posterUrl?.startsWith(publicUrl(pendingPrefix)) ? item.posterUrl : undefined,
  }))

  // The cover has to be one of the images just verified, not a free-text URL.
  if (data.coverImageUrl && !media.some(item => item.url === data.coverImageUrl)) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: { coverImageUrl: "Cover image must be one of the uploaded files" },
      },
      { status: 400 },
    )
  }

  const slug = toSlug(data.title) + "-" + Date.now().toString(36)

  if (containsPromptInjection([data.title, data.shortDescription, data.fullDescription].join(" "))) {
    console.warn("[SHOWCASE] Potential prompt injection detected in post:", slug)
  }

  // An unknown eventId is a client bug, and silently dropping it would lose
  // the provenance the post was written to claim.
  if (data.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true },
    })
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: { eventId: "Unknown event" } },
        { status: 400 },
      )
    }
  }

  try {
    await prisma.communitySubmission.create({
      data: {
        userId,
        type: "SHOWCASE",
        title: data.title,
        slug,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        url: data.url,
        repoUrl: data.repoUrl,
        tags: data.tags,
        coverImageUrl: data.coverImageUrl,
        media,
        eventId: data.eventId,
        needs: data.needs,
        builtWith: data.builtWith ?? undefined,
        submitterName: `${user.firstName} ${user.lastName}`.trim(),
        status: "APPROVED",
        lastActivityAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: { slug } }, { status: 201 })
  } catch (error) {
    console.error("[SHOWCASE] Failed to create post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to publish. Please try again." },
      { status: 500 },
    )
  }
}
