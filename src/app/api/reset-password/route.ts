import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"

const schema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128),
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
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      { success: false, error: issue?.message ?? "Invalid input" },
      { status: 400 }
    )
  }

  const { token, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } })

  if (
    !user ||
    !user.active ||
    !user.passwordResetExpires ||
    user.passwordResetExpires.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { success: false, error: "This reset link is invalid or has expired." },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  })

  return NextResponse.json({
    success: true,
    message: "Password updated. You can now sign in with your new password.",
  })
}
