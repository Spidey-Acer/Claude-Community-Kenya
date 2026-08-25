import { Prisma } from "@/generated/prisma/client"

export type ShowcaseSort = "hot" | "recent" | "popular" | "needs-help"

export function isShowcaseSort(value: string): value is ShowcaseSort {
  return ["hot", "recent", "popular", "needs-help"].includes(value)
}

/**
 * Hot score: upvotes decayed by how long the post has been quiet.
 *
 * Measured from lastActivityAt rather than createdAt, which is what makes the
 * build-log loop pay off in Phase 2 — posting a real update lifts the post
 * back up the feed instead of leaving it buried by age alone.
 *
 * The +1 keeps a brand-new zero-upvote post from scoring flat zero forever;
 * the +2 hours stops the first minutes after posting from dominating.
 * Exponent 1.5 is the usual Hacker News-ish decay: sharper than linear,
 * gentler than square.
 *
 * Expressed as raw SQL because Prisma cannot order by a computed expression.
 */
export const HOT_SCORE_SQL = Prisma.sql`
  ("upvoteCount" + 1) /
  POWER(EXTRACT(EPOCH FROM (NOW() - "lastActivityAt")) / 3600.0 + 2, 1.5)
`
