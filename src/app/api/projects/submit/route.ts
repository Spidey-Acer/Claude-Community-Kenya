import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendProjectSubmissionNotification } from "@/lib/email"

const PROJECT_STATUSES = ["in-development", "live", "in-production"] as const

const projectSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  builder: z.string().min(2).max(100).transform(zodSanitizeString),
  description: z.string().min(30).max(2000).transform(zodSanitizeMultilineText(2000)),
  status: z.enum(PROJECT_STATUSES),
  stack: z.array(z.string().max(50).transform(zodSanitizeString)).min(1).max(15),
  demoUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  repoUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  contactName: z.string().min(2).max(100).transform(zodSanitizeString),
  contactEmail: z.string().email().transform(zodSanitizeEmail),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.PROJECT_SUBMIT)
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

  const validation = projectSchema.safeParse(body)
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
    const project = await prisma.project.create({
      data: {
        name: data.name,
        builder: data.builder,
        description: data.description,
        stack: data.stack,
        status: data.status,
        demoUrl: data.demoUrl,
        repoUrl: data.repoUrl,
        featured: false,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
      },
    })

    await sendProjectSubmissionNotification({
      name: data.contactName,
      email: data.contactEmail,
      projectName: data.name,
      status: data.status,
    }).catch(console.error)

    return NextResponse.json(
      {
        success: true,
        message: "Project submitted! We'll review it and feature it on the Projects page.",
        data: { id: project.id },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[PROJECTS] Failed to create submission:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit project. Please try again." },
      { status: 500 }
    )
  }
}
