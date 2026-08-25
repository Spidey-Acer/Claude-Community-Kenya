/**
 * Throwaway smoke check for the showcase query layer, run against cck_preview.
 *
 * A green tsc says nothing about whether the raw hot-score SQL parses, whether
 * the jsonb `needs` filter matches, or whether "hot" actually orders the way it
 * claims to. This creates three posts with known shapes, asserts the ordering
 * and the filters, and deletes them again.
 *
 *   npx tsx scripts/smoke-showcase.ts
 */
// Must precede the prisma import: the client reads DATABASE_URL at module load.
import "dotenv/config"
import { requirePreviewDatabase } from "./preview-db-guard"
import { prisma } from "@/lib/prisma"
import { getShowcasePosts, getShowcasePostBySlug } from "@/lib/showcase/queries"

const PREFIX = "smoke-showcase-"

const FIXTURES = [
  // Few upvotes but active minutes ago — decay should still put it on top.
  { slug: `${PREFIX}fresh`, title: "Fresh and active", upvoteCount: 2, hoursQuiet: 0.5, needs: ["testers"] },
  // Many upvotes but stale for a week.
  { slug: `${PREFIX}stale`, title: "Popular but stale", upvoteCount: 40, hoursQuiet: 24 * 7, needs: [] },
  // Middling both ways, and asks for something different.
  { slug: `${PREFIX}middle`, title: "Middle of the road", upvoteCount: 6, hoursQuiet: 12, needs: ["designer"] },
]

let failures = 0

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`)
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

async function seed() {
  for (const f of FIXTURES) {
    const activity = new Date(Date.now() - f.hoursQuiet * 3600 * 1000)
    await prisma.communitySubmission.create({
      data: {
        type: "SHOWCASE",
        status: "APPROVED",
        title: f.title,
        slug: f.slug,
        shortDescription: "Temporary row created by scripts/smoke-showcase.ts.",
        fullDescription: "Temporary row created by scripts/smoke-showcase.ts. Safe to delete.",
        submitterName: "Smoke Test",
        tags: [],
        needs: f.needs,
        upvoteCount: f.upvoteCount,
        lastActivityAt: activity,
      },
    })
  }
}

async function cleanup() {
  await prisma.communitySubmission.deleteMany({ where: { slug: { startsWith: PREFIX } } })
}

async function main() {
  requirePreviewDatabase()

  await cleanup()
  await seed()

  const hot = await getShowcasePosts({ sort: "hot" })
  check("hot ranks recent activity over stale upvotes", hot.items.map(i => i.slug), [
    `${PREFIX}fresh`,
    `${PREFIX}middle`,
    `${PREFIX}stale`,
  ])

  const popular = await getShowcasePosts({ sort: "popular" })
  check("popular ranks purely by upvotes", popular.items.map(i => i.slug), [
    `${PREFIX}stale`,
    `${PREFIX}middle`,
    `${PREFIX}fresh`,
  ])

  const needsHelp = await getShowcasePosts({ sort: "needs-help" })
  check(
    "needs-help excludes the post with an empty needs array",
    needsHelp.items.map(i => i.slug).sort(),
    [`${PREFIX}fresh`, `${PREFIX}middle`],
  )

  // The bug this catches: the hot branch builds its own raw SQL, so a filter
  // added to `where` is silently dropped unless it is repeated there too.
  const filtered = await getShowcasePosts({ sort: "hot", need: "testers" })
  check("hot honours the need filter", filtered.items.map(i => i.slug), [`${PREFIX}fresh`])
  check("hot need filter also narrows the total", filtered.total, 1)

  const paged = await getShowcasePosts({ sort: "hot", page: 2, limit: 2 })
  check("hot paginates", paged.items.map(i => i.slug), [`${PREFIX}stale`])

  const one = await getShowcasePostBySlug(`${PREFIX}middle`)
  check("bySlug returns the post", one?.slug, `${PREFIX}middle`)
  check("bySlug maps needs", one?.needs, ["designer"])
  check("bySlug returns null for an unknown slug", await getShowcasePostBySlug("nope-xyz"), null)

  await cleanup()
  // Count our own fixtures, not the whole table: asserting the table is empty
  // would start failing the day a real member posts something.
  const remaining = await prisma.communitySubmission.count({
    where: { slug: { startsWith: PREFIX } },
  })
  check("fixtures removed", remaining, 0)

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async e => {
  console.error("FAILED:", e)
  await cleanup().catch(() => {})
  process.exit(1)
})
