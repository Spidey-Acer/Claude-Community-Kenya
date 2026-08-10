/**
 * Purge the two most sensitive fields from Impact Lab participants once their
 * cohort is closed.
 *
 * `blockedTeammates` is a list of people someone did not want to work with. The
 * schema comment already says it is never shown publicly, and once matching is
 * done it has no remaining purpose — but it is still sitting in the database,
 * still readable by anyone with admin export rights, and still the single most
 * damaging row on the site if it ever leaked. `phone` is the same story with a
 * lower ceiling: needed to reach people during the event, needed by nobody
 * after it.
 *
 * The rows themselves stay. Name, email, skills, and team assignment are the
 * historical record of who built what, and deleting participants would orphan
 * the match runs and submissions that reference them. Only the two fields are
 * cleared.
 *
 * Cleared, not hashed. A hash would only be worth keeping if something still
 * needed to compare these values, and nothing does — a hashed phone number is
 * just a slower way to retain a phone number.
 *
 * Irreversible. There is no undo and no backup of the cleared values, which is
 * exactly why it is dry-run by default and prints every row it would touch:
 *
 *   npm run purge:closed-cohorts              # report only, writes nothing
 *   npm run purge:closed-cohorts -- --apply   # actually clears
 *   npm run purge:closed-cohorts -- --cohort impact-lab-2026-07
 *
 * Every LIVE event's cohort is skipped unless you name it explicitly with
 * --cohort, so running this mid-event cannot wipe the phone numbers the
 * organisers are relying on to reach people in the room. LIVE status comes
 * from the Event table (several events can be LIVE at once) rather than a
 * single env var, so more than one cohort can be protected at a time.
 */

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { listEvents } from "../src/lib/impact-lab/event-store"

const apply = process.argv.includes("--apply")
const cohortFlagIndex = process.argv.indexOf("--cohort")
const cohortFilter =
  cohortFlagIndex !== -1 ? process.argv[cohortFlagIndex + 1] ?? null : null

/** Mask an email for the report — enough to identify a row, not enough to be a leak. */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@")
  if (!domain) return "***"
  const head = user.slice(0, 2)
  return `${head}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`
}

async function main() {
  // Same driver-adapter construction the app uses (src/lib/prisma.ts) — the
  // generated client has no default constructor in this setup.
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Run with the target database URL, e.g.\n" +
        '  DATABASE_URL="postgres://..." npm run purge:closed-cohorts',
    )
    process.exitCode = 1
    return
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5 }),
  })

  try {
    await run(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

async function run(prisma: PrismaClient) {
  const events = await listEvents()
  const liveCohorts = new Set(events.filter((e) => e.status === "LIVE").map((e) => e.cohort))

  // Fail closed, not open. A genuinely empty liveCohorts set is
  // indistinguishable from "the tenancy migration has not run here yet"
  // (listEvents degrades to [] in both cases) — purging without an explicit
  // --cohort in that state could wipe a live cohort's phone numbers right
  // along with the closed ones. An explicit --cohort is a different case:
  // the operator has already named exactly what to purge, so there is
  // nothing left to protect against.
  if (apply && liveCohorts.size === 0 && !cohortFilter) {
    console.error(
      "Refusing --apply: no event is LIVE (or the tenancy migration has not " +
        "run here), so this script cannot tell which cohort must be protected " +
        "from the purge. Pass --cohort <slug> to purge one specific cohort " +
        "explicitly.",
    )
    process.exitCode = 1
    return
  }

  const cohortRows = await prisma.impactLabParticipant.groupBy({
    by: ["cohort"],
    _count: { _all: true },
  })

  const candidates = cohortRows
    .map((c) => c.cohort)
    .filter((cohort) => {
      if (cohortFilter) return cohort === cohortFilter
      return !liveCohorts.has(cohort)
    })
    .sort()

  if (liveCohorts.size > 0 && !cohortFilter) {
    console.log(`Live cohort(s) (skipped): ${[...liveCohorts].sort().join(", ")}`)
  } else if (liveCohorts.size === 0) {
    console.log("No LIVE event.")
  }

  if (candidates.length === 0) {
    console.log("No closed cohorts with participants. Nothing to do.")
    return
  }

  let totalToClear = 0

  for (const cohort of candidates) {
    // Only rows that still hold something worth clearing. A row whose phone is
    // already null and whose blockedTeammates is already empty is left alone so
    // the report reflects real work rather than padding the count.
    const rows = await prisma.impactLabParticipant.findMany({
      where: {
        cohort,
        OR: [{ phone: { not: null } }, { blockedTeammates: { isEmpty: false } }],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        blockedTeammates: true,
      },
      orderBy: { email: "asc" },
    })

    console.log(`\n── ${cohort} — ${rows.length} row(s) to clear`)
    for (const r of rows) {
      const bits: string[] = []
      if (r.phone) bits.push("phone")
      if (r.blockedTeammates.length) {
        bits.push(`blockedTeammates[${r.blockedTeammates.length}]`)
      }
      console.log(`   ${maskEmail(r.email)}  →  clearing ${bits.join(" + ")}`)
    }
    totalToClear += rows.length

    if (apply && rows.length > 0) {
      const result = await prisma.impactLabParticipant.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { phone: null, blockedTeammates: [] },
      })
      console.log(`   ✔ cleared ${result.count} row(s)`)
    }
  }

  console.log(
    `\n${apply ? "Cleared" : "Would clear"} ${totalToClear} row(s) across ${candidates.length} closed cohort(s).`,
  )
  if (!apply && totalToClear > 0) {
    console.log("Dry run — nothing was written. Re-run with --apply to commit.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
