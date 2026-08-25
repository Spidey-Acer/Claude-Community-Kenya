/**
 * Community showcase — verification harness.
 *
 * Everything asserted here is a live-data invariant that only a database can
 * prove: denormalised counters do not drift, the showcase/community-hub
 * boundary really holds at runtime (not just in the `where` clause someone
 * could edit later), and every stored media blob is a shape the renderer can
 * trust. A green `tsc` says nothing about any of this. Modelled on
 * scripts/smoke-showcase.ts's seed-assert-cleanup shape, but as a release
 * gate rather than a one-off smoke check.
 *
 * Seeds one showcase post — with reactions, an upvote, and two media items —
 * so every assertion has at least one row to exercise even against an empty
 * preview database, then checks it alongside every other SHOWCASE row and
 * every community_upvotes row already in the table. Deletes its own fixtures
 * on both success and failure.
 *
 * Run with: npm run verify:showcase
 * Exits 0 on success, 1 on any failed assertion.
 */
// Must precede the prisma import: the client reads DATABASE_URL at module load.
import "dotenv/config"
import { requirePreviewDatabase } from "./preview-db-guard"
import { prisma } from "@/lib/prisma"
import { getCommunitySubmissions } from "@/lib/data"
import type { MediaDescriptor, MediaKind } from "@/lib/showcase/media"

const PREFIX = "verify-showcase-"
const FIXTURE_SLUG = `${PREFIX}fixture`
const FIXTURE_EMAIL = `${PREFIX}user@example.test`

let failures = 0
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

const VALID_MEDIA_KINDS: readonly MediaKind[] = ["image", "gif", "mp4"]

/**
 * Runtime shape check for a stored media entry.
 *
 * `media` is a Json column — nothing at the type level stops a bad write from
 * landing a malformed entry that the renderer then trips over. Mirrors the
 * MediaDescriptor interface in src/lib/showcase/media.ts field-for-field.
 */
function isValidMediaDescriptor(value: unknown): value is MediaDescriptor {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    typeof v.key === "string" &&
    v.key.length > 0 &&
    typeof v.url === "string" &&
    v.url.length > 0 &&
    typeof v.width === "number" &&
    Number.isFinite(v.width) &&
    typeof v.height === "number" &&
    Number.isFinite(v.height) &&
    typeof v.kind === "string" &&
    VALID_MEDIA_KINDS.includes(v.kind as MediaKind) &&
    (v.posterUrl === undefined || typeof v.posterUrl === "string") &&
    (v.alt === undefined || typeof v.alt === "string")
  )
}

function asMediaArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Same shape the react route (`src/app/api/showcase/[slug]/react/route.ts`) writes to `reactionCounts`. */
async function liveReactionCounts(submissionId: string): Promise<Record<string, number>> {
  const grouped = await prisma.showcaseReaction.groupBy({
    by: ["emoji"],
    where: { submissionId },
    _count: { emoji: true },
  })
  const counts: Record<string, number> = {}
  for (const row of grouped) counts[row.emoji] = row._count.emoji
  return counts
}

function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
}

async function seed(): Promise<void> {
  const user = await prisma.user.create({
    data: {
      email: FIXTURE_EMAIL,
      passwordHash: "not-a-real-hash",
      firstName: "Verify",
      lastName: "Showcase",
    },
  })

  const submission = await prisma.communitySubmission.create({
    data: {
      type: "SHOWCASE",
      status: "APPROVED",
      title: "Verify showcase fixture",
      slug: FIXTURE_SLUG,
      shortDescription: "Temporary row created by scripts/verify-showcase.ts.",
      fullDescription: "Temporary row created by scripts/verify-showcase.ts. Safe to delete.",
      submitterName: "Verify Script",
      tags: [],
      needs: [],
      media: [
        { key: "fixture/img.png", url: "https://example.test/img.png", width: 100, height: 100, kind: "image" },
        { key: "tenor:abc", url: "https://media.tenor.com/abc.gif", width: 200, height: 200, kind: "gif" },
      ],
      lastActivityAt: new Date(),
    },
  })

  // Two reactions from the fixture user, two different emoji — exercises the
  // same groupBy the react route uses, so reactionCounts below is set from a
  // value that is genuinely in sync rather than hand-typed.
  await prisma.showcaseReaction.createMany({
    data: [
      { submissionId: submission.id, userId: user.id, emoji: "🔥" },
      { submissionId: submission.id, userId: user.id, emoji: "🙌" },
    ],
  })

  await prisma.communityUpvote.create({
    data: { submissionId: submission.id, voterKey: `u:${user.id}` },
  })

  const live = await liveReactionCounts(submission.id)
  await prisma.communitySubmission.update({
    where: { id: submission.id },
    data: { reactionCounts: live },
  })
}

async function cleanup(): Promise<void> {
  // Cascades (schema.prisma: ShowcaseReaction/CommunityUpvote -> submission,
  // onDelete: Cascade) take care of the reaction and upvote fixture rows.
  await prisma.communitySubmission.deleteMany({ where: { slug: { startsWith: PREFIX } } })
  await prisma.user.deleteMany({ where: { email: FIXTURE_EMAIL } })
}

async function main() {
  // This script seeds a throwaway user and post; never let it touch prod.
  requirePreviewDatabase()

  await cleanup()
  await seed()

  console.log("Community showcase — verification\n")

  console.log("1. lastActivityAt is set on every showcase row")
  const showcaseRows = await prisma.communitySubmission.findMany({
    where: { type: "SHOWCASE" },
    select: { id: true, slug: true, lastActivityAt: true, reactionCounts: true, media: true },
  })
  assert(
    showcaseRows.every(r => r.lastActivityAt instanceof Date),
    `all ${showcaseRows.length} SHOWCASE row(s) have a non-null lastActivityAt`
  )

  console.log("\n2. getCommunitySubmissions() never returns a showcase post")
  const { total } = await getCommunitySubmissions({ limit: 1 })
  const pageSize = Math.max(total, 1)
  const defaultFeed = await getCommunitySubmissions({ limit: pageSize })
  assert(
    !defaultFeed.items.some(item => item.slug === FIXTURE_SLUG),
    "the fixture showcase post is absent from the default community feed"
  )
  assert(
    !defaultFeed.items.some(item => (item.type as string) === "SHOWCASE"),
    "no item returned by the default feed is typed SHOWCASE"
  )
  const explicitShowcaseRequest = await getCommunitySubmissions({ type: "SHOWCASE", limit: pageSize })
  assert(
    !explicitShowcaseRequest.items.some(item => item.slug === FIXTURE_SLUG),
    "an explicit type=SHOWCASE request is ignored rather than honoured"
  )

  console.log("\n3. community_upvotes.voterKey is always set and never bare \"ip:\"")
  const upvoteRows = await prisma.communityUpvote.findMany({ select: { voterKey: true } })
  assert(
    upvoteRows.every(r => typeof r.voterKey === "string" && r.voterKey.length > 0),
    `all ${upvoteRows.length} upvote row(s) have a non-empty voterKey`
  )
  assert(
    upvoteRows.every(r => r.voterKey !== "ip:"),
    "no upvote row is the bare 'ip:' sentinel (a null ipHash concatenated in)"
  )

  console.log("\n4. reactionCounts matches a live groupBy for every showcase post")
  for (const row of showcaseRows) {
    const stored = (row.reactionCounts as Record<string, number> | null) ?? {}
    const live = await liveReactionCounts(row.id)
    assert(
      JSON.stringify(sortedEntries(stored)) === JSON.stringify(sortedEntries(live)),
      `reactionCounts for "${row.slug}" matches a live groupBy over showcase_reactions`
    )
  }

  console.log("\n5. every media entry on every showcase post is a valid MediaDescriptor")
  let mediaEntriesChecked = 0
  for (const row of showcaseRows) {
    const entries = asMediaArray(row.media)
    entries.forEach((entry, index) => {
      mediaEntriesChecked++
      assert(
        isValidMediaDescriptor(entry),
        `"${row.slug}" media[${index}] is a valid MediaDescriptor with an image/gif/mp4 kind`
      )
    })
  }
  console.log(`  (${mediaEntriesChecked} media entr${mediaEntriesChecked === 1 ? "y" : "ies"} checked)`)

  await cleanup()

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async e => {
  console.error("FAILED:", e)
  await cleanup().catch(() => {})
  process.exit(1)
})
