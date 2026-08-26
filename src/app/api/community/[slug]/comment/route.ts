import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import {
  zodSanitizeString,
  zodSanitizeMultilineText,
  containsPromptInjection,
} from "@/lib/input-sanitization"
import { getSessionUserId } from "@/lib/auth-helpers"
import { resolveCommentStatus } from "@/lib/showcase/comment-status"

const commentSchema = z.object({
  authorName: z.string().max(100).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  content: z.string().min(5).max(1000).transform(zodSanitizeMultilineText(1000)),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.COMMUNITY_COMMENT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many comments. Please try again later." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  const { slug } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = commentSchema.safeParse(body)
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

  try {
    const submission = await prisma.communitySubmission.findUnique({
      where: { slug },
      select: { id: true, status: true, type: true },
    })

    if (!submission || submission.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

    if (containsPromptInjection(data.content)) {
      console.warn("[COMMUNITY] Potential prompt injection detected in comment for:", slug)
    }

    // The verified flag is read from the database, never from the request —
    // the client has no say in whether its own comment skips moderation.
    const userId = await getSessionUserId()
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { emailVerified: true, firstName: true, lastName: true },
        })
      : null

    const status = resolveCommentStatus({
      userId,
      emailVerified: user?.emailVerified ?? false,
    })

    await prisma.communityComment.create({
      data: {
        submissionId: submission.id,
        userId,
        authorName: user ? `${user.firstName} ${user.lastName}`.trim() : data.authorName,
        content: data.content,
        status,
      },
    })

    // A publicly visible comment on a showcase post is activity — the "hot"
    // ranking decays from lastActivityAt. Held-for-moderation comments don't
    // count until a moderator approves them (accepted gap: approval in the
    // admin panel doesn't currently bump it).
    if (submission.type === "SHOWCASE" && status === "APPROVED") {
      await prisma.communitySubmission.update({
        where: { id: submission.id },
        data: { lastActivityAt: new Date() },
      })
    }

    return NextResponse.json(
      {
        success: true,
        published: status === "APPROVED",
        message:
          status === "APPROVED"
            ? "Comment posted."
            : "Your comment is pending approval.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[COMMUNITY] Failed to create comment:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit comment. Please try again." },
      { status: 500 }
    )
  }
}
