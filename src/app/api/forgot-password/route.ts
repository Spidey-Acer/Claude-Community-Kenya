import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeEmail } from "@/lib/input-sanitization"
import { sendPasswordResetEmail } from "@/lib/email"

const TOKEN_TTL_MINUTES = 60

const schema = z.object({
  email: z.string().email().transform(zodSanitizeEmail),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.PASSWORD_RESET)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rl.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 })
  }

  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  // Account-enumeration safe: always return the same success message regardless
  // of whether the email is registered.
  const genericResponse = NextResponse.json({
    success: true,
    message: "If an account exists for that email, a reset link has been sent.",
  })

  if (!user || !user.active) return genericResponse

  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.claudekenya.org"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // Don't await — the user shouldn't have to wait on Resend, and we always
  // return the generic message regardless of email send success.
  sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    resetUrl,
    expiresInMinutes: TOKEN_TTL_MINUTES,
  }).catch((err) => {
    console.error("[forgot-password] sendPasswordResetEmail failed:", err)
  })

  return genericResponse
}
