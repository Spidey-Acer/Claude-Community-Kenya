/**
 * Create or remove one showcase post in cck_preview so the pages can actually
 * be loaded. The feed renders its empty state with no rows, which does not
 * exercise the card, the media gallery or the reaction row at all.
 *
 *   npx tsx scripts/smoke-showcase-fixture.ts up
 *   npx tsx scripts/smoke-showcase-fixture.ts down
 */
import "dotenv/config"
import { prisma } from "@/lib/prisma"

const SLUG = "smoke-fixture-mkulimaos-field-logger"

async function up() {
  await down()
  await prisma.communitySubmission.create({
    data: {
      type: "SHOWCASE",
      status: "APPROVED",
      title: "Field logger for smallholder farm records",
      slug: SLUG,
      shortDescription:
        "An offline-first Android logger that syncs farm activity records when a signal comes back.",
      fullDescription:
        "Built during the Claude in Production workshop.\n\nThe problem is that field officers lose records when they have no signal, so the app writes locally first and reconciles later.\n\nStill rough around the sync conflict handling.",
      submitterName: "Smoke Fixture",
      tags: ["android", "offline-first"],
      needs: ["testers", "designer"],
      builtWith: { models: ["claude-sonnet-5"], skills: ["frontend-design"], mcps: [], tokensPerRun: 42000 },
      upvoteCount: 3,
      reactionCounts: { "🔥": 2, "🚀": 1 },
      lastActivityAt: new Date(),
    },
  })
  console.log(SLUG)
}

async function down() {
  await prisma.communitySubmission.deleteMany({ where: { slug: SLUG } })
}

const mode = process.argv[2]
const run = mode === "down" ? down : up
run()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
