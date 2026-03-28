import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeEmail } from "@/lib/input-sanitization"

const newsletterSchema = z.object({
  email: z.string().email().transform(zodSanitizeEmail),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.FORM)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = newsletterSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid email address." },
      { status: 400 }
    )
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: validation.data.email },
      update: {},
      create: { email: validation.data.email },
    })

    return NextResponse.json({
      success: true,
      message: "You're subscribed! We'll keep you posted on community updates.",
    })
  } catch (error) {
    console.error("[NEWSLETTER] Failed to subscribe:", error)
    return NextResponse.json(
      { success: false, error: "Failed to subscribe. Please try again." },
      { status: 500 }
    )
  }
}
