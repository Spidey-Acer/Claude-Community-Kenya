import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendVolunteerApplicationNotification } from "@/lib/email"
import { VolunteerRole } from "@/generated/prisma/client"
import { getSessionUserId } from "@/lib/auth-helpers"

/**
 * Profile links arrive as people actually type them ("github.com/name") — add
 * the https:// scheme when it's missing, then validate as a URL. Empty strings
 * count as absent so an untouched optional field never fails validation.
 */
const lenientUrl = z
  .string()
  .max(300)
  .optional()
  .transform((v) => {
    const trimmed = v?.trim()
    if (!trimmed) return undefined
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  })
  .pipe(z.string().url().optional())
  .transform((v) => (v ? zodSanitizeUrl(v) : undefined))

const volunteerSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  phone: z.string().max(20).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  role: z.nativeEnum(VolunteerRole),
  city: z.string().max(60).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  experience: z.string().min(20).max(2000).transform(zodSanitizeMultilineText(2000)),
  availability: z.string().min(2).max(200).transform(zodSanitizeString),
  motivation: z.string().min(20).max(2000).transform(zodSanitizeMultilineText(2000)),
  linkedIn: lenientUrl,
  github: lenientUrl,
  twitter: lenientUrl,
  portfolio: lenientUrl,
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

  const userId = await getSessionUserId()

  try {
    const application = await prisma.volunteerApplication.create({
      data: {
        userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        city: data.city,
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
