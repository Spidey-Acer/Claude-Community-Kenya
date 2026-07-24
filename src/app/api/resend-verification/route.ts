import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { sendEmailVerificationEmail } from "@/lib/email"

const VERIFICATION_TTL_HOURS = 24

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // Strict rate limit — don't let logged-in users abuse Resend quota
  const rl = await rateLimit(request, RateLimits.PASSWORD_RESET)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rl.headers }
    )
  }

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }
  if (user.emailVerified) {
    return NextResponse.json({ success: true, message: "Email already verified." })
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60_000)

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationToken: token, emailVerificationExpires: expires },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.claudekenya.org"
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`

  // Awaited on purpose: a fire-and-forget send dies when the serverless
  // function freezes after the response. The user explicitly asked for this
  // email, so a failed send is reported honestly instead of claiming success.
  const sent = await sendEmailVerificationEmail({
    to: user.email,
    firstName: user.firstName,
    verifyUrl,
    expiresInHours: VERIFICATION_TTL_HOURS,
  })
  if (!sent) {
    console.error(`[resend-verification] send failed for user ${user.id}`)
    return NextResponse.json(
      { success: false, error: "Could not send the email right now. Please try again shortly." },
      { status: 502 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Verification email sent. Check your inbox.",
  })
}
