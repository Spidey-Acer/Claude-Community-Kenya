/**
 * sync-events — upsert the backfill events, and nothing else.
 *
 * The full seed touches users, team, projects and blog; this syncs only the
 * events in prisma/events-backfill.ts, so it is safe to run against production.
 *
 * Matched by slug. On an existing row, content fields are refreshed; nothing is
 * ever deleted or its status downgraded here. New rows are created as listed.
 *
 * Dry run by default — prints the plan and changes nothing.
 * Apply with:  DATABASE_URL='postgresql://...' npx tsx scripts/karibu/sync-events.ts --apply
 */

import { requireDatabaseUrl } from "./db-target"
import { EVENTS_BACKFILL } from "../../prisma/events-backfill"

const APPLY = process.argv.includes("--apply")

requireDatabaseUrl()

async function main() {
  // Imported inside main() so the guard reports a missing DATABASE_URL before
  // prisma connects. Dynamic because tsx compiles this to CJS.
  const { prisma } = await import("../../src/lib/prisma")

  try {
    const slugs = EVENTS_BACKFILL.map((e) => e.slug)
    const existing = await prisma.event.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true },
    })
    const known = new Set(existing.map((e) => e.slug))

    for (const e of EVENTS_BACKFILL) {
      const verb = known.has(e.slug) ? "update" : "CREATE"
      console.log(`  ${verb.padEnd(6)} ${e.date.toISOString().slice(0, 10)}  ${e.title}`)
    }

    if (!APPLY) {
      const creates = EVENTS_BACKFILL.filter((e) => !known.has(e.slug)).length
      console.log(
        `\nDRY RUN — ${creates} to create, ${EVENTS_BACKFILL.length - creates} to update. Re-run with --apply.`,
      )
      return
    }

    for (const e of EVENTS_BACKFILL) {
      // Prisma needs Json fields spread explicitly; the const arrays are fine as-is.
      const data = {
        ...e,
        highlights: e.highlights ? [...e.highlights] : undefined,
      }
      await prisma.event.upsert({
        where: { slug: e.slug },
        update: data,
        create: data,
      })
    }

    const total = await prisma.event.count()
    console.log(`\nSynced ${EVENTS_BACKFILL.length} event(s). ${total} events now in the database.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
