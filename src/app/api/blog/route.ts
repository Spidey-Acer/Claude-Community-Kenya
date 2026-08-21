import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { toSlug } from "@/lib/utils"

/**
 * Token-authenticated blog intake for agents (the CCK MCP server).
 *
 * Deliberately narrower than /api/admin/blog: this route can only ever create a
 * DRAFT. `status`, `featured`, `publishedAt` and `authorId` are hard-coded here
 * and ignored if supplied, so possessing the write token buys the ability to
 * queue a post for review, never to publish to the public site. Publishing
 * stays a human action in /admin.
 *
 * Auth is a bearer token in the Authorization header, compared in constant time.
 * The token lives in BLOG_WRITE_TOKEN on the deployment; if it is unset the
 * route is closed rather than open.
 */

const blogIntakeSchema = z.object({
  title: z.string().min(3).max(200).transform(zodSanitizeString),
  excerpt: z.string().min(10).max(500).transform(zodSanitizeString),
  content: z.string().min(50).max(50000).transform(zodSanitizeMultilineText()),
  author: z.string().min(2).max(100).transform(zodSanitizeString),
  tags: z.array(z.string().max(50).transform(zodSanitizeString)).max(10).default([]),
  readingTime: z.number().int().min(1).max(120).optional(),
})

/** Constant-time compare that does not leak length via early return. */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    // Still burn a comparison so timing does not distinguish wrong-length tokens.
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  const expected = process.env.BLOG_WRITE_TOKEN
  if (!expected) {
    // Closed by default: an unset token means the feature is off, not open.
    return NextResponse.json(
      { success: false, error: "Blog intake is not configured." },
      { status: 503 }
    )
  }

  const header = request.headers.get("authorization") ?? ""
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!provided || !tokenMatches(provided, expected)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const limited = await rateLimit(request, RateLimits.COMMUNITY_SUBMIT)
  if (!limited.success) {
    return NextResponse.json(
      { success: false, error: "Too many drafts. Try again later." },
      { status: 429, headers: limited.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = blogIntakeSchema.safeParse(body)
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
  const slug = toSlug(data.title) + "-" + Date.now().toString(36)

  try {
    const post = await prisma.blogPost.create({
      data: {
        slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        author: data.author,
        tags: data.tags,
        readingTime: data.readingTime ?? null,
        // Not accepted from input, on purpose. See the file comment.
        status: "DRAFT",
        featured: false,
        publishedAt: null,
        authorId: null,
      },
      select: { id: true, slug: true, title: true, status: true },
    })

    return NextResponse.json(
      {
        success: true,
        data: post,
        message: "Draft created. Publish it from /admin/blog.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[BLOG_INTAKE] Failed to create draft:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create draft." },
      { status: 500 }
    )
  }
}
