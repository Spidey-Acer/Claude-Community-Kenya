import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { isReactionEmoji, REACTION_EMOJI } from "@/lib/showcase/constants"

/**
 * POST /api/showcase/[slug]/react — toggle one reaction.
 *
 * Members only, keyed on userId: unlike upvotes there is no anonymous path, so
 * no voterKey scheme is needed here.
 *
 * Counts are recomputed from rows inside the same transaction rather than
 * incremented, so a denormalised count can never drift from the rows it
 * summarises — a groupBy over one post's reactions is cheap.
 */

const bodySchema = z.object({
  emoji: z.string().max(16).refine(isReactionEmoji, {
    message: `Emoji must be one of ${REACTION_EMOJI.join(" ")}`,
  }),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.COMMUNITY_UPVOTE)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many reactions. Please slow down." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to react." }, { status: 401 })
  }

  const { slug } = await params

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid request" : "Invalid JSON body"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }

  try {
    const submission = await prisma.communitySubmission.findUnique({
      where: { slug },
      select: { id: true, status: true, type: true },
    })

    if (!submission || submission.status !== "APPROVED" || submission.type !== "SHOWCASE") {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.showcaseReaction.findUnique({
        where: {
          submissionId_userId_emoji: {
            submissionId: submission.id,
            userId,
            emoji: parsed.emoji,
          },
        },
        select: { id: true },
      })

      if (existing) {
        await tx.showcaseReaction.delete({ where: { id: existing.id } })
      } else {
        await tx.showcaseReaction.create({
          data: { submissionId: submission.id, userId, emoji: parsed.emoji },
        })
      }

      const grouped = await tx.showcaseReaction.groupBy({
        by: ["emoji"],
        where: { submissionId: submission.id },
        _count: { emoji: true },
      })

      const reactionCounts: Record<string, number> = {}
      for (const row of grouped) {
        reactionCounts[row.emoji] = row._count.emoji
      }

      await tx.communitySubmission.update({
        where: { id: submission.id },
        data: { reactionCounts },
      })

      const mine = await tx.showcaseReaction.findMany({
        where: { submissionId: submission.id, userId },
        select: { emoji: true },
      })

      return { reactionCounts, mine: mine.map(m => m.emoji) }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[SHOWCASE] Failed to toggle reaction:", error)
    return NextResponse.json(
      { success: false, error: "Failed to react. Please try again." },
      { status: 500 },
    )
  }
}
