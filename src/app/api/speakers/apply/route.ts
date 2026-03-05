import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendSpeakerApplicationNotification } from "@/lib/email"
import { SpeakerCategory } from "@/generated/prisma/client"

const speakerSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  phone: z.string().max(20).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  topic: z.string().min(5).max(200).transform(zodSanitizeString),
  abstract: z.string().min(50).max(2000).transform(zodSanitizeMultilineText(2000)),
  bio: z.string().min(30).max(1000).transform(zodSanitizeMultilineText(1000)),
  category: z.nativeEnum(SpeakerCategory),
  preferredEvent: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  preferredCity: z.enum(["Nairobi", "Mombasa", "Either"]).optional(),
  linkedIn: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  github: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  portfolio: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  website: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.SPEAKER_APPLY)
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

  const validation = speakerSchema.safeParse(body)
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
    const application = await prisma.speakerApplication.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        topic: data.topic,
        abstract: data.abstract,
        bio: data.bio,
        category: data.category,
        preferredEvent: data.preferredEvent,
        preferredCity: data.preferredCity,
        linkedIn: data.linkedIn,
        github: data.github,
        portfolio: data.portfolio,
        website: data.website,
      },
    })

    await sendSpeakerApplicationNotification({
      name: data.name,
      email: data.email,
      topic: data.topic,
      category: data.category,
    }).catch(console.error)

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully! We'll review it and get back to you within 5 business days.",
        data: { id: application.id },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[SPEAKERS] Failed to create application:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit application. Please try again." },
      { status: 500 }
    )
  }
}
