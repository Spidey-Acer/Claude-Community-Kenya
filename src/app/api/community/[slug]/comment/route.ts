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
      select: { id: true, status: true },
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

    await prisma.communityComment.create({
      data: {
        submissionId: submission.id,
        authorName: data.authorName,
        content: data.content,
        status: "PENDING",
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: "Your comment is pending approval.",
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
