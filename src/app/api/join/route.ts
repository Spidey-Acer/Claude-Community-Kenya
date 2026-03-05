import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendJoinApplicationNotification } from "@/lib/email"

const joinSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  github: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  experience: z.string().min(10).max(2000).transform(zodSanitizeMultilineText(2000)),
  interests: z.array(z.string().max(50).transform(zodSanitizeString)).min(1).max(10),
  reason: z.string().min(20).max(2000).transform(zodSanitizeMultilineText(2000)),
  heardFrom: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.JOIN)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many submissions. Please try again later." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = joinSchema.safeParse(body)
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
    // Check for duplicate email
    const existing = await prisma.joinApplication.findFirst({
      where: { email: data.email },
      orderBy: { createdAt: "desc" },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An application with this email already exists." },
        { status: 409 }
      )
    }

    const application = await prisma.joinApplication.create({
      data: {
        name: data.name,
        email: data.email,
        github: data.github,
        experience: data.experience,
        interests: data.interests,
        reason: data.reason,
        heardFrom: data.heardFrom,
      },
    })

    await sendJoinApplicationNotification({ name: data.name, email: data.email }).catch(console.error)

    return NextResponse.json(
      {
        success: true,
        message: "Application received! Check your email for next steps.",
        data: { id: application.id },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[JOIN] Failed to create application:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit application. Please try again." },
      { status: 500 }
    )
  }
}
