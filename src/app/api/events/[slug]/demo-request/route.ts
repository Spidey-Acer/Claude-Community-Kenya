import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { getSessionUserId } from "@/lib/auth-helpers"

const demoRequestSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  projectTitle: z.string().min(3).max(200).transform(zodSanitizeString),
  description: z.string().min(20).max(2000).transform(zodSanitizeMultilineText(2000)),
  estimatedTime: z.enum(["5", "10", "15", "20"]),
  demoUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  repoUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.DEMO_REQUEST)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many demo requests. Please try again tomorrow." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  const { slug } = await params

  const event = await prisma.event.findUnique({ where: { slug }, select: { id: true, status: true } })
  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
  }
  if (!["UPCOMING", "REGISTRATION_OPEN"].includes(event.status)) {
    return NextResponse.json(
      { success: false, error: "Demo requests are only accepted for upcoming events." },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = demoRequestSchema.safeParse(body)
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
    const demoRequest = await prisma.demoRequest.create({
      data: {
        userId,
        eventId: event.id,
        name: data.name,
        email: data.email,
        projectTitle: data.projectTitle,
        description: data.description,
        estimatedTime: data.estimatedTime,
        demoUrl: data.demoUrl,
        repoUrl: data.repoUrl,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: "Demo request submitted! We'll review it and confirm your slot within 3 business days.",
        data: { id: demoRequest.id },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[DEMO_REQUEST] Failed to create:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit demo request. Please try again." },
      { status: 500 }
    )
  }
}
