/**
 * Seed a cohort with teams that were formed by the organisers ahead of time
 * (a shortlist, a sponsor-run hackathon) from a roster JSON file kept OUTSIDE
 * the repo. Generic sibling of scripts/seed-hackathon-cohort.ts (Afretec,
 * leader-only); that script is left untouched.
 *
 * Every member gets an ImpactLabParticipant row (upsert on cohort_email), and
 * one final ImpactLabMatchRun holds the locked teams, so the member team
 * reveal (/api/impact-lab/team) shows each person their team on signup. See
 * the Afretec script's header for why consentToMatch = false does not hide it.
 * Validation and assembly live in src/lib/impact-lab/preformed-teams.ts.
 *
 * The cohort's ImpactLabEvent must already exist (create it in admin first,
 * docs/impact-lab/16-running-another-event.md); --apply refuses without it.
 *
 * Dry run by default (reads the database, writes nothing):
 *   npm run seed:teams -- --input <path-to-json>
 * Apply:
 *   npm run seed:teams -- --input <path-to-json> --apply
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { DEFAULT_SETTINGS } from "../src/lib/matching"
import { parseTracks } from "../src/lib/impact-lab/tracks"
import {
  buildParticipantRows,
  buildPreformedRun,
  parsePreformedInput,
  type PreformedInput,
  type PreformedRun,
} from "../src/lib/impact-lab/preformed-teams"

const APPLY = process.argv.includes("--apply")
const REPORT_FILE = resolve("scripts/output/preformed-teams-seed-report.txt")

/** Value after `--input`, or exits with usage. */
function readInputPath(): string {
  const index = process.argv.indexOf("--input")
  const value = index === -1 ? undefined : process.argv[index + 1]
  if (!value || value.startsWith("--")) {
    console.error("Usage: npm run seed:teams -- --input <path-to-json> [--apply]")
    process.exit(1)
  }
  return resolve(value)
}

function loadInput(path: string): PreformedInput {
  if (!existsSync(path)) throw new Error(`Input file not found: ${path}`)
  return parsePreformedInput(JSON.parse(readFileSync(path, "utf8")))
}

/** Report: teams, member counts, participant ids. Organiser-side, gitignored. */
function writeReport(input: PreformedInput, run: PreformedRun, ids: Map<string, string>): void {
  const lines = [
    "IMPACT LAB — PRE-FORMED TEAMS SEED REPORT",
    `Cohort: ${input.cohort}`,
    `Teams: ${input.teams.length}   Participants: ${ids.size}`,
    `Mode: ${APPLY ? "APPLIED — written to the database" : "DRY RUN — nothing written"}`,
    "",
  ]
  input.teams.forEach((team, index) => {
    lines.push(`${run.teams[index].id}  ${team.name} (${team.track})  members: ${team.members.length}`)
    for (const id of run.teams[index].memberIds) {
      lines.push(`    participant ${id}${id === run.teams[index].leaderId ? "  (leader)" : ""}`)
    }
  })
  mkdirSync(dirname(REPORT_FILE), { recursive: true })
  writeFileSync(REPORT_FILE, lines.join("\n"), "utf8")
  console.log(lines.join("\n"))
  console.log(`\nFull report: ${REPORT_FILE}`)
}

async function main(): Promise<void> {
  const input = loadInput(readInputPath())
  const memberTotal = input.teams.reduce((sum, t) => sum + t.members.length, 0)
  console.log(`Parsed ${input.teams.length} teams, ${memberTotal} members for ${input.cohort}.`)

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set, e.g.\n  DATABASE_URL="postgres://..." npm run seed:teams -- --input <file>')
    process.exitCode = 1
    return
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) })

  try {
    const event = await prisma.impactLabEvent.findUnique({
      where: { cohort: input.cohort },
      select: { id: true, tracks: true },
    })
    if (!event) {
      const message = `No ImpactLabEvent exists for cohort "${input.cohort}". Create the event in admin first (docs/impact-lab/16-running-another-event.md).`
      if (APPLY) {
        console.error(`Refusing to --apply. ${message}`)
        process.exitCode = 1
        return
      }
      console.warn(`WARNING: ${message} --apply would refuse.`)
    } else {
      const trackKeys = new Set(parseTracks(event.tracks).map((t) => t.key))
      const unknown = [...new Set(input.teams.map((t) => t.track))].filter((k) => !trackKeys.has(k))
      if (unknown.length > 0) {
        console.warn(`WARNING: track key(s) not defined on the event: ${unknown.join(", ")}`)
      }
    }

    const rows = buildParticipantRows(input)
    const existing = await prisma.impactLabParticipant.findMany({
      where: { cohort: input.cohort },
      select: { id: true, email: true },
    })
    const ids = new Map(existing.map((p) => [p.email.toLowerCase(), p.id]))
    console.log(`Found ${existing.length} already-seeded participant(s) in ${input.cohort}.`)

    for (const [index, data] of rows.entries()) {
      if (APPLY) {
        const row = await prisma.impactLabParticipant.upsert({
          where: { cohort_email: { cohort: input.cohort, email: data.email } },
          create: { cohort: input.cohort, ...data },
          update: { ...data },
        })
        ids.set(data.email, row.id)
      } else if (!ids.has(data.email)) {
        ids.set(data.email, `(pending-${index + 1})`)
      }
    }

    const run = buildPreformedRun(input, ids)
    writeReport(input, run, ids)
    if (!APPLY) {
      console.log("\nDRY RUN — nothing written. Re-run with --apply to write.")
      return
    }
    await saveRun(prisma, input, run)
  } finally {
    await prisma.$disconnect()
  }
}

/** Write the final run: update in place if one exists, so its id survives a re-run. */
async function saveRun(prisma: PrismaClient, input: PreformedInput, run: PreformedRun): Promise<void> {
  const data = {
    name: input.runName,
    notes: run.notes,
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    result: JSON.parse(JSON.stringify(run.result)),
    // Raw MatchParticipant[] (not normalized): the team route normalizes at read time.
    participantsSnapshot: JSON.parse(JSON.stringify(run.participantsSnapshot)),
    explanations: JSON.parse(JSON.stringify(run.explanations)),
  }
  const existingRun = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: input.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
  })
  if (existingRun) {
    await prisma.impactLabMatchRun.update({ where: { id: existingRun.id }, data })
    console.log(`\nUpdated final run ${existingRun.id} in place: ${run.teams.length} teams.`)
    return
  }
  const created = await prisma.impactLabMatchRun.create({
    data: {
      cohort: input.cohort,
      isFinal: true,
      submissionsCloseAt: null,
      judgingClosedAt: null,
      resultsPublishedAt: null,
      createdById: null,
      ...data,
    },
  })
  console.log(`\nNo final run existed. Created ${created.id} and marked it final: ${run.teams.length} teams.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
