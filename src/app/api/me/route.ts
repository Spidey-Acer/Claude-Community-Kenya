import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import {
  zodSanitizeString,
  zodSanitizePhoneNumber,
  zodSanitizeUrl,
} from "@/lib/input-sanitization"

const profileSchema = z.object({
  firstName: z.string().min(1).max(60).transform(zodSanitizeString),
  lastName: z.string().min(1).max(60).transform(zodSanitizeString),
  phone: z
    .string()
    .max(20)
    .optional()
    .transform((v) => (v ? zodSanitizePhoneNumber(v) : null)),
  imageUrl: z
    .string()
    .url()
    .optional()
    .transform((v) => (v ? zodSanitizeUrl(v) : null)),
})

export async function PATCH(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.FORM)
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      { success: false, error: issue?.message ?? "Invalid input" },
      { status: 400 }
    )
  }

  const { firstName, lastName, phone, imageUrl } = parsed.data

  await prisma.user.update({
    where: { email: session.user.email },
    data: { firstName, lastName, phone, imageUrl },
  })

  return NextResponse.json({ success: true, message: "Profile updated." })
}
