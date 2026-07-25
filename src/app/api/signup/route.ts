import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeEmail, zodSanitizeString } from "@/lib/input-sanitization"
import { sendEmailVerificationEmail } from "@/lib/email"
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/email-verification"

const VERIFICATION_TTL_HOURS = 24

const signupSchema = z.object({
  firstName: z.string().min(1).max(60).transform(zodSanitizeString),
  lastName: z.string().min(1).max(60).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // Stricter limit than the form preset — signup abuse can poison the user table.
  const rateLimitResult = await rateLimit(request, RateLimits.AUTH)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many signup attempts. Please try again later." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      { success: false, error: firstIssue?.message ?? "Invalid input" },
      { status: 400 }
    )
  }

  const { firstName, lastName, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Don't leak whether email is registered — return a generic success-shaped
    // message so account-enumeration attacks don't get a clean signal.
    return NextResponse.json({
      success: true,
      message: "If that email is available, your account is being created.",
    })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  // With verification off, no token is minted and no mail is sent — the quota
  // stays available for password resets. See @/lib/email-verification.
  if (!REQUIRE_EMAIL_VERIFICATION) {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: "MEMBER",
        active: true,
        emailVerified: true,
      },
    })
    return NextResponse.json({
      success: true,
      message: "Account created. You can sign in now.",
    })
  }

  const verificationToken = crypto.randomBytes(32).toString("hex")
  const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60_000)

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: "MEMBER",
      active: true,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.claudekenya.org"
  const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`

  // Awaited on purpose: on serverless, returning the response freezes the
  // function and kills an in-flight fire-and-forget send — the email silently
  // never leaves. Signup still succeeds if delivery fails (sendEmail catches
  // internally); the user can resend from the dashboard.
  const sent = await sendEmailVerificationEmail({
    to: created.email,
    firstName: created.firstName,
    verifyUrl,
    expiresInHours: VERIFICATION_TTL_HOURS,
  })
  if (!sent) {
    console.error(`[signup] verification email not sent for user ${created.id}`)
  }

  return NextResponse.json({
    success: true,
    message: "Account created. Check your email to verify your address.",
  })
}
