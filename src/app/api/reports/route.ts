import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { ReportReason, ReportTarget } from "@/generated/prisma/client"

/**
 * POST /api/reports — flag a submission, comment or update for a moderator.
 *
 * Open to anonymous users on purpose: reporting is the backstop that replaced
 * pre-moderation, and requiring a login to flag abuse would blunt it. The IP
 * is hashed rather than stored so a repeat reporter is recognisable without
 * the table holding raw addresses.
 */

const REPORT_SALT = process.env.UPVOTE_SALT ?? "cck-dev-salt"

const bodySchema = z.object({
  targetType: z.nativeEnum(ReportTarget),
  targetId: z.string().min(1).max(60),
  reason: z.nativeEnum(ReportReason),
  detail: z.string().max(1000).optional().transform(v => (v ? zodSanitizeMultilineText(1000)(v) : undefined)),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.STRICT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many reports. Please try again later." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  try {
    await prisma.contentReport.create({
      data: {
        targetType: parsed.targetType,
        targetId: parsed.targetId,
        reason: parsed.reason,
        detail: parsed.detail,
        reporterId: await getSessionUserId(),
        reporterIp: createHash("sha256").update(ip + ":" + REPORT_SALT).digest("hex"),
      },
    })

    return NextResponse.json(
      { success: true, message: "Thanks — a moderator will take a look." },
      { status: 201 },
    )
  } catch (error) {
    console.error("[REPORTS] Failed to create report:", error)
    return NextResponse.json(
      { success: false, error: "Could not file that report. Please try again." },
      { status: 500 },
    )
  }
}
