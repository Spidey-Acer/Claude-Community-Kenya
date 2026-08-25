/**
 * Identity for a vote or reaction, as a single string.
 *
 * A signed-in member is keyed on their user id, so they get one vote per post
 * regardless of which network they are on. Anonymous voters fall back to the
 * hashed IP.
 *
 * One column rather than two nullable ones because the uniqueness rule is
 * "one vote per voter per post", and a partial unique index — the two-column
 * form — is not expressible in Prisma's schema language.
 */
export function voterKeyFor(userId: string | null, ipHash: string): string {
  return userId ? `u:${userId}` : `ip:${ipHash}`
}
