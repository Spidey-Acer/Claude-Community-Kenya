import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeEmail, zodSanitizeString } from "@/lib/input-sanitization"

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

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: "MEMBER",
      active: true,
      emailVerified: false,
    },
  })

  return NextResponse.json({
    success: true,
    message: "Account created. You can now sign in.",
  })
}
