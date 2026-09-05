/**
 * Correct an already-published Impact Lab result from the command line.
 *
 * The operator-facing twin of `POST /api/admin/impact-lab/results/correct` —
 * same validation, same `buildResultsInputFromRun` → `buildSnapshot` path, so
 * a correction run from a terminal at 2am under pressure cannot compute a
 * different answer than the admin panel would have. Dry-run by default and
 * prints CURRENT then PROPOSED before writing anything, because this is the
 * exact tool reached for right after a wrong podium was caught — the moment
 * least suited to trusting output nobody looked at.
 *
 *   npm run correct:results -- --cohort impact-lab-2026-09 --mode tracks \
 *     --teams team-elimu,team-kilimo,team-kazi
 *
 *   npm run correct:results -- --cohort impact-lab-2026-09 --mode tracks \
 *     --teams team-elimu,team-kilimo,team-kazi --confirm
 *
 * `--mode podium` additionally needs `--confirm-podium` if the selection
 * matches the Impact Lab 02 fingerprint (see `looksLikePerTrackWinners`) —
 * same guard the route enforces, not a weaker one for the CLI.
 *
 * Never touches `resultsPublishedAt`, `judgingClosedAt`, `submissionsCloseAt`,
 * or `impactLabResultsEmail` — see `correct/route.ts`'s own doc comment for
 * why: a correction rewrites what the results pages say, it does not
 * re-announce anything by email.
 */

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { getEventByCohort } from "../src/lib/impact-lab/event-store"
import { resolveRubric } from "../src/lib/impact-lab/rubric-store"
import { buildResultsInputFromRun, looksLikePerTrackWinners } from "../src/lib/impact-lab/results-input"
import {
  buildSnapshot,
  isResultsSnapshot,
  type AnnouncedWinner,
  type ResultsInput,
  type ResultsSnapshot,
  type ResultsTrackWinner,
} from "../src/lib/impact-lab/results"

function flagValue(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i !== -1 ? (process.argv[i + 1] ?? null) : null
}

const cohort = flagValue("--cohort")
const modeArg = flagValue("--mode")
const teamsArg = flagValue("--teams")
const confirm = process.argv.includes("--confirm")
const confirmPodium = process.argv.includes("--confirm-podium")

function usageError(message: string): never {
  console.error(`${message}\n`)
  console.error(
    "Usage: npm run correct:results -- --cohort <slug> --mode podium|tracks " +
      "--teams id1,id2,id3 [--confirm] [--confirm-podium]"
  )
  process.exit(1)
}

if (!cohort) usageError("Missing --cohort.")
if (modeArg !== "podium" && modeArg !== "tracks") usageError('--mode must be "podium" or "tracks".')
if (!teamsArg) usageError("Missing --teams (comma-separated team ids).")
const announcementMode: "podium" | "tracks" = modeArg
const announcedTeamIds = [...new Set(teamsArg.split(",").map((id) => id.trim()).filter(Boolean))]
if (announcedTeamIds.length === 0) usageError("--teams resolved to an empty list.")

function summarise(overall: AnnouncedWinner[], trackWinners: ResultsTrackWinner[]): void {
  if (overall.length > 0) {
    console.log("  Overall podium:")
    for (const w of overall) console.log(`    #${w.rank}  ${w.projectName}  (${w.teamId})`)
  } else {
    console.log("  Overall podium: none (tracks mode, or nothing announced)")
  }
  console.log("  Track winners:")
  if (trackWinners.length === 0) {
    console.log("    (none)")
  } else {
    for (const w of trackWinners) {
      console.log(`    ${w.track}: ${w.projectName}  (${w.teamId})  [${w.basis}]`)
    }
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Run with the target database URL, e.g.\n" +
        '  DATABASE_URL="postgres://..." npm run correct:results -- ...'
    )
    process.exitCode = 1
    return
  }
  // Same driver-adapter construction the app uses (src/lib/prisma.ts) — the
  // generated client has no default constructor in this setup. A dedicated
  // instance rather than the app's module-level singleton: this script is a
  // one-shot process, not a long-lived server holding a pool.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) })

  try {
    await run(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

async function run(prisma: PrismaClient) {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: cohort!, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })
  if (!run) {
    console.error(`No final run for cohort "${cohort}".`)
    process.exitCode = 1
    return
  }
  if (!run.resultsPublishedAt || !isResultsSnapshot(run.resultsSnapshot)) {
    console.error(
      `Results have not been published yet for "${cohort}" — there is nothing to correct. ` +
        "Use the publish route/panel for a first announcement."
    )
    process.exitCode = 1
    return
  }
  const currentSnapshot = run.resultsSnapshot as unknown as ResultsSnapshot

  console.log(`\nCohort: ${cohort}`)
  console.log(`Run: ${run.id}`)
  console.log(`Published: ${run.resultsPublishedAt.toISOString()} (unchanged by this tool)\n`)

  console.log(`CURRENT — ${currentSnapshot.announcementMode ?? "podium"}`)
  summarise(currentSnapshot.overall, currentSnapshot.trackWinners)

  const rubric = await resolveRubric(cohort!)
  const event = await getEventByCohort(cohort!)
  const { input: inputBase, teamIds, submittedTeamIds, scoredTeamIds, displayName } =
    await buildResultsInputFromRun(prisma, run.id, run.result, rubric, event?.tracks ?? [])

  // Identical validation to correct/route.ts's POST — no duplicates, every id
  // a real team in the run, every id has a submission.
  const seen = new Set<string>()
  for (const id of announcedTeamIds) {
    if (seen.has(id)) usageError(`"${displayName(id)}" is listed twice.`)
    seen.add(id)
    if (!teamIds.has(id)) usageError(`"${id}" is not a team in this run.`)
    if (!submittedTeamIds.has(id)) {
      usageError(`"${displayName(id)}" has no submission and cannot be announced as a winner.`)
    }
  }

  // Same Impact Lab 02 fingerprint guard the route enforces — see
  // `looksLikePerTrackWinners`'s own doc comment.
  if (announcementMode === "podium" && !confirmPodium) {
    const allTracks = new Set([...inputBase.teams.values()].map((t) => t.track))
    if (looksLikePerTrackWinners(announcedTeamIds, inputBase.teams, allTracks)) {
      const named = announcedTeamIds
        .map((id) => `${displayName(id)} (${inputBase.teams.get(id)?.track ?? "unknown track"})`)
        .join(", ")
      usageError(
        `This looks like one winner per track, not an overall podium: ${named}. ` +
          "Pass --confirm-podium if this really is an announced overall podium, " +
          'or --mode tracks if the panel named one winner per track.'
      )
    }
  }

  const unrankedTeamIds = [...submittedTeamIds]
    .filter((id) => !scoredTeamIds.has(id) && !seen.has(id))
    .sort()

  const input: ResultsInput = {
    ...inputBase,
    // The original announcement instant, never `new Date()` — a correction
    // is not a fresh announcement.
    publishedAt: run.resultsPublishedAt.toISOString(),
    announcementMode,
    announcedTeamIds,
    unrankedTeamIds,
  }
  const proposedSnapshot = buildSnapshot(input)

  console.log(`\nPROPOSED — ${announcementMode}`)
  summarise(proposedSnapshot.overall, proposedSnapshot.trackWinners)

  if (!confirm) {
    console.log("\nDry run — nothing was written. Re-run with --confirm to commit.")
    return
  }

  // Rewrites the frozen record in place. `resultsPublishedAt`,
  // `submissionsCloseAt`, `judgingClosedAt` and `impactLabResultsEmail` are
  // deliberately untouched — see this file's own header comment.
  await prisma.impactLabMatchRun.update({
    where: { id: run.id },
    data: {
      announcedWinners: JSON.parse(JSON.stringify(proposedSnapshot.overall)),
      resultsSnapshot: JSON.parse(JSON.stringify(proposedSnapshot)),
    },
  })
  console.log("\n✔ Corrected. No email was sent.")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
