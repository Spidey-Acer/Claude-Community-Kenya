import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendVolunteerApplicationNotification } from "@/lib/email"
import { VolunteerRole } from "@/generated/prisma/client"

const volunteerSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  phone: z.string().max(20).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  role: z.nativeEnum(VolunteerRole),
  experience: z.string().min(20).max(2000).transform(zodSanitizeMultilineText(2000)),
  availability: z.string().min(2).max(200).transform(zodSanitizeString),
  motivation: z.string().min(20).max(2000).transform(zodSanitizeMultilineText(2000)),
  linkedIn: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  github: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  twitter: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  portfolio: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.VOLUNTEER_APPLY)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many applications. Please try again tomorrow." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = volunteerSchema.safeParse(body)
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
    const application = await prisma.volunteerApplication.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        experience: data.experience,
        availability: data.availability,
        motivation: data.motivation,
        linkedIn: data.linkedIn,
        github: data.github,
        twitter: data.twitter,
        portfolio: data.portfolio,
      },
    })

    await sendVolunteerApplicationNotification({
      name: data.name,
      email: data.email,
      role: data.role,
    }).catch(console.error)

    return NextResponse.json(
      {
        success: true,
        message: "Volunteer application submitted! We'll review it and get back to you soon.",
        data: { id: application.id },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[VOLUNTEER] Failed to create application:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit application. Please try again." },
      { status: 500 }
    )
  }
}
