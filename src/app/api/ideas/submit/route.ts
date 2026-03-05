import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendIdeaSubmissionNotification } from "@/lib/email"
import { ProjectStage } from "@/generated/prisma"

const SEEKING_ROLES = ["COFOUNDER", "DEVELOPER", "DESIGNER", "MENTOR", "FUNDER"] as const

const ideaSchema = z.object({
  title: z.string().min(3).max(150).transform(zodSanitizeString),
  description: z.string().min(50).max(3000).transform(zodSanitizeMultilineText(3000)),
  stage: z.nativeEnum(ProjectStage),
  seekingRoles: z.array(z.enum(SEEKING_ROLES)).min(1),
  techStack: z.array(z.string().max(50).transform(zodSanitizeString)).max(10).optional(),
  timeline: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  contactName: z.string().min(2).max(100).transform(zodSanitizeString),
  contactEmail: z.string().email().transform(zodSanitizeEmail),
  linkedIn: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  github: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  website: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.IDEA_SUBMIT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many submissions. Please try again tomorrow." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = ideaSchema.safeParse(body)
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
    const submission = await prisma.ideaSubmission.create({
      data: {
        title: data.title,
        description: data.description,
        stage: data.stage,
        seekingRoles: data.seekingRoles,
        techStack: data.techStack ?? [],
        timeline: data.timeline,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        linkedIn: data.linkedIn,
        github: data.github,
        website: data.website,
      },
    })

    await sendIdeaSubmissionNotification({
      name: data.contactName,
      email: data.contactEmail,
      title: data.title,
      stage: data.stage,
    }).catch(console.error)

    return NextResponse.json(
      {
        success: true,
        message: "Idea submitted! We'll review it and reach out if we can help connect you with collaborators.",
        data: { id: submission.id },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[IDEAS] Failed to create submission:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit idea. Please try again." },
      { status: 500 }
    )
  }
}
