import type { CommunityStatus } from "@/generated/prisma/client"

/**
 * Decide whether a new comment goes live or into the moderation queue.
 *
 * Pre-moderating every comment on a volunteer-run site means comments
 * effectively never publish — nobody approves fast enough for a conversation
 * to happen. A verified member has already cleared an email round-trip, which
 * is the bar that makes drive-by spam uneconomic.
 *
 * Both conditions are required: an anonymous request can present anything, so
 * emailVerified only counts when it belongs to a session user.
 */
export function resolveCommentStatus(author: {
  userId: string | null
  emailVerified: boolean
}): Extract<CommunityStatus, "APPROVED" | "PENDING"> {
  return author.userId && author.emailVerified ? "APPROVED" : "PENDING"
}
