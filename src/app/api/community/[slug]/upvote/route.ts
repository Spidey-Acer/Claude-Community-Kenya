import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { Prisma } from "@/generated/prisma/client"
import { getSessionUserId } from "@/lib/auth-helpers"
import { voterKeyFor } from "@/lib/showcase/voter-key"

const UPVOTE_SALT = process.env.UPVOTE_SALT ?? "cck-dev-salt"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.COMMUNITY_UPVOTE)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many upvote requests. Please try again later." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  const { slug } = await params

  try {
    const submission = await prisma.communitySubmission.findUnique({
      where: { slug },
      select: { id: true, status: true },
    })

    if (!submission || submission.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const ipHash = createHash("sha256")
      .update(ip + ":" + submission.id + ":" + UPVOTE_SALT)
      .digest("hex")

    // Uniqueness is per voter, not per IP address. A signed-in member is one
    // voter wherever they connect from; anonymous visitors still fall back to
    // the hashed IP. The old IP-only rule meant two members sharing a carrier
    // NAT blocked each other from voting.
    const userId = await getSessionUserId()
    const voterKey = voterKeyFor(userId, ipHash)

    const result = await prisma.$transaction(async (tx) => {
      await tx.communityUpvote.create({
        data: {
          submissionId: submission.id,
          ipHash,
          voterKey,
        },
      })

      const updated = await tx.communitySubmission.update({
        where: { id: submission.id },
        data: { upvoteCount: { increment: 1 } },
        select: { upvoteCount: true },
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      upvoteCount: result.upvoteCount,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "Already upvoted", alreadyVoted: true },
        { status: 409 }
      )
    }

    console.error("[COMMUNITY] Failed to upvote:", error)
    return NextResponse.json(
      { success: false, error: "Failed to upvote. Please try again." },
      { status: 500 }
    )
  }
}
