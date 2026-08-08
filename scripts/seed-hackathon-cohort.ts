/**
 * Seed the Afretec Makerthon 2026 cohort with teams that
 * are already formed.
 *
 * Unlike the usual Impact Lab flow, nobody self-registers first and the
 * matching engine never runs: the organisers reconciled 20 teams from the
 * pitch-deck submissions ahead of time, and this script makes the database
 * agree with that roster. Only the 20 team LEADERS get an `ImpactLabParticipant`
 * row — `members_raw` in the source file is free-text names + phone numbers
 * with no emails, so there is nothing to create an account against. The other
 * members are expected to self-register at the door; the organiser roster
 * (written into the run's `notes`) is their checklist for who still needs to.
 *
 * Each leader is placed on a single-member "team" (locked, `leaderId` set to
 * themselves) inside one final `ImpactLabMatchRun` for the cohort, so the
 * existing team-reveal surface (`/api/impact-lab/team`) shows them their team
 * immediately on signup — see IMPORTANT NOTE below on why this works with
 * consentToMatch left false.
 *
 * IMPORTANT — consentToMatch is FALSE for every seeded row, on purpose: no
 * matching ran and nobody consented to it. This was verified NOT to hide the
 * reveal: both `/api/impact-lab/team` (src/app/api/impact-lab/team/route.ts)
 * and the dashboard status resolver (src/app/dashboard/page.tsx) check
 * `extractFrozenTeams(run.result)` for the caller's participant id FIRST —
 * consentToMatch is only consulted in the separate "no final run yet" branch.
 * A team member's own `consentToMatch` also plays no role in team-scoped
 * routes (submission, results) — verified by search, see the PR description.
 *
 * Email verification: `checkMemberAccess` (src/lib/impact-lab/member.ts) only
 * gates on `emailVerified` when `REQUIRE_EMAIL_VERIFICATION=true`
 * (src/lib/email-verification.ts). That flag is OFF by default specifically
 * because the transactional email quota can't cover the cohort, so a leader
 * signing up tonight is NOT blocked on clicking a verification link unless
 * someone has explicitly set that env var in production.
 *
 * Dry run by default — prints the report, writes nothing to the database:
 *   npm run seed:hackathon
 * Apply:
 *   npm run seed:hackathon -- --apply
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { PrismaClient, ImpactLabExperience } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { DEFAULT_SETTINGS } from "../src/lib/matching"
import type { MatchParticipant, MatchResult, ScoreBreakdown, Team, TeamExplanation } from "../src/lib/matching"

/** New cohort slug for this event. Must satisfy the pattern in constants.ts. */
const COHORT = "afretec-makerthon-2026-08"
const COHORT_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/
if (!COHORT_PATTERN.test(COHORT)) {
  throw new Error(`COHORT slug "${COHORT}" does not satisfy ${COHORT_PATTERN}`)
}

const INPUT_FILE = resolve(
  "C:/Projects/Claude-Community-Kenya/afretec-makerthon-2026-08/teams-reconciled.json"
)
const REPORT_FILE = resolve("scripts/output/hackathon-cohort-seed-report.txt")
const RUN_NAME = "Afretec Makerthon 2026 — registered teams"

const APPLY = process.argv.includes("--apply")

// ─── Input shape ─────────────────────────────────────────────────────────────

interface TeamInput {
  id: number
  name: string
  sector: string
  leader: string
  leader_email: string
  leader_phone: string
  members_raw: string
  faculty: string
  innovation: string
  level: string
  summary: string
  deckUrl: string
  sourceRows: number[]
}

function readTeams(): TeamInput[] {
  if (!existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`)
  }
  const parsed = JSON.parse(readFileSync(INPUT_FILE, "utf8"))
  if (!Array.isArray(parsed) || parsed.length < 1) {
    throw new Error(`Input file has no teams: ${INPUT_FILE}`)
  }
  return parsed as TeamInput[]
}

// ─── Participant + team assembly ────────────────────────────────────────────

/** Data written for each leader's `ImpactLabParticipant` row (create + update). */
interface LeaderParticipantData {
  fullName: string
  email: string
  phone: string
  institution: string
  experienceLevel: ImpactLabExperience
  primaryRole: string
  secondaryRoles: string[]
  technicalSkills: string[]
  interests: string[]
  availability: string[]
  projectIdeas: string
  preferredTeammates: string[]
  blockedTeammates: string[]
  consentToMatch: boolean
  consentToShareContact: boolean
}

function buildParticipantData(team: TeamInput): LeaderParticipantData {
  return {
    fullName: team.leader.trim(),
    email: team.leader_email.trim().toLowerCase(),
    phone: team.leader_phone.trim(),
    institution: "University of Nairobi",
    experienceLevel: ImpactLabExperience.INTERMEDIATE,
    primaryRole: "Team Lead",
    secondaryRoles: [],
    technicalSkills: [],
    interests: [team.sector],
    availability: [],
    projectIdeas: team.summary,
    preferredTeammates: [],
    blockedTeammates: [],
    // No matching ran and nobody consented to either — see file header.
    consentToMatch: false,
    consentToShareContact: false,
  }
}

/** A registered-team import has no computed score; report zeros rather than invent one. */
const ZERO_SCORE: ScoreBreakdown = {
  total: 0,
  dimensions: [],
  penalties: [],
  penaltyTotal: 0,
}

/**
 * The organiser-facing checklist: one block per team naming the leader (who
 * has an account) and the teammates who still need to self-register, plus
 * where their pitch deck lives. This is what makes the notes field useful at
 * the door, not just a record of what the script did.
 */
function buildRosterNotes(teams: TeamInput[]): string {
  const blocks = teams.map((t) => {
    const memberLines = t.members_raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `    - ${line}`)
      .join("\n")
    return [
      `Team: ${t.name} (${t.sector})`,
      `  Leader: ${t.leader} <${t.leader_email.trim().toLowerCase()}> · ${t.leader_phone.trim()}`,
      `  Expected members (self-registration pending):`,
      memberLines || "    (none listed)",
      `  Pitch deck: ${t.deckUrl}`,
    ].join("\n")
  })
  return [
    "Teams were registered directly by the organisers ahead of the event and",
    "imported as-is; this is not a matching engine run. Each row below is a",
    "team whose LEADER has an account — everyone else still needs to sign up",
    "and will land on this team automatically once they do.",
    "",
    ...blocks,
  ].join("\n")
}

// ─── Report ──────────────────────────────────────────────────────────────────

interface ReportRow {
  teamName: string
  leaderName: string
  leaderEmail: string
  participantId: string
  memberCount: number
}

function writeReport(rows: ReportRow[], skipped: string[], applied: boolean): void {
  const lines: string[] = [
    "IMPACT LAB — HACKATHON COHORT SEED REPORT",
    `Cohort: ${COHORT}`,
    `Teams: ${rows.length}   Skipped: ${skipped.length}`,
    `Mode: ${applied ? "APPLIED — written to the database" : "DRY RUN — nothing written"}`,
    "",
    "Teams seeded (leader-only participant + single-member locked team):",
  ]
  for (const r of rows) {
    lines.push(
      `  ${r.teamName}`,
      `    Leader: ${r.leaderName} <${r.leaderEmail}> -> participant ${r.participantId}`,
      `    Members on team row: ${r.memberCount} (leader only; rest self-register)`
    )
  }
  if (skipped.length > 0) {
    lines.push("", "SKIPPED:", ...skipped.map((s) => `  ${s}`))
  }
  mkdirSync(dirname(REPORT_FILE), { recursive: true })
  writeFileSync(REPORT_FILE, lines.join("\n"), "utf8")
  console.log(lines.join("\n"))
  console.log(`\nFull report: ${REPORT_FILE}`)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const teams = readTeams()
  console.log(`Parsed ${teams.length} teams from ${INPUT_FILE}.`)

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Run with the production VPS URL, e.g.\n" +
        '  DATABASE_URL="postgres://..." npm run seed:hackathon'
    )
    process.exitCode = 1
    return
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5 }),
  })

  try {
    // Look up anyone already seeded (a re-run) so the dry-run report can show
    // real ids instead of placeholders where they already exist.
    const existingParticipants = await prisma.impactLabParticipant.findMany({
      where: { cohort: COHORT },
      select: { id: true, email: true },
    })
    const existingIdByEmail = new Map(
      existingParticipants.map((p) => [p.email.toLowerCase(), p.id])
    )
    console.log(`Found ${existingParticipants.length} already-seeded participant(s) in ${COHORT}.`)

    const skipped: string[] = []
    const idByTeamId = new Map<number, string>()
    const dataByTeamId = new Map<number, LeaderParticipantData>()

    for (const t of teams) {
      const data = buildParticipantData(t)
      if (!data.email || !data.fullName) {
        skipped.push(`Team ${t.id} "${t.name}": missing leader name or email.`)
        continue
      }
      dataByTeamId.set(t.id, data)

      if (APPLY) {
        const row = await prisma.impactLabParticipant.upsert({
          where: { cohort_email: { cohort: COHORT, email: data.email } },
          create: { cohort: COHORT, ...data },
          update: { ...data },
        })
        idByTeamId.set(t.id, row.id)
      } else {
        // Dry run: use the real id if this leader was seeded on a previous
        // apply, otherwise a placeholder — nothing is persisted either way.
        idByTeamId.set(t.id, existingIdByEmail.get(data.email) ?? `(pending-${t.id})`)
      }
    }

    const seededTeams = teams.filter((t) => idByTeamId.has(t.id))

    const rows: ReportRow[] = seededTeams.map((t) => ({
      teamName: t.name,
      leaderName: t.leader.trim(),
      leaderEmail: t.leader_email.trim().toLowerCase(),
      participantId: idByTeamId.get(t.id)!,
      memberCount: 1,
    }))

    if (!APPLY) {
      writeReport(rows, skipped, false)
      console.log("\nDRY RUN — nothing written. Re-run with --apply to write.")
      return
    }

    // ─── Build the frozen match run from the just-upserted participants ────

    const matchParticipants: MatchParticipant[] = seededTeams.map((t) => {
      const data = dataByTeamId.get(t.id)!
      return {
        id: idByTeamId.get(t.id)!,
        fullName: data.fullName,
        email: data.email,
        experienceLevel: "INTERMEDIATE",
        primaryRole: data.primaryRole,
        secondaryRoles: data.secondaryRoles,
        technicalSkills: data.technicalSkills,
        interests: data.interests,
        availability: data.availability,
        preferredTeammates: data.preferredTeammates,
        blockedTeammates: data.blockedTeammates,
        consentToMatch: data.consentToMatch,
      }
    })

    const teamsOut: (Team & { leaderId: string })[] = seededTeams.map((t, i) => {
      const leaderId = idByTeamId.get(t.id)!
      return {
        id: `team-${i + 1}`,
        name: t.name,
        memberIds: [leaderId],
        locked: true,
        leaderId,
        score: ZERO_SCORE,
      }
    })

    const result: MatchResult = {
      teams: teamsOut,
      unassignedIds: [],
      warnings: [
        "These teams were registered by the organisers ahead of the event and imported " +
          "as-is; no matching was performed, so team scores are not meaningful.",
        ...(skipped.length ? [`${skipped.length} team(s) skipped — see report.`] : []),
      ],
      averageScore: 0,
      settingsUsed: DEFAULT_SETTINGS,
    }

    const explanations: TeamExplanation[] = teamsOut.map((teamOut, i) => {
      const t = seededTeams[i]
      return {
        teamId: teamOut.id,
        summary: t.summary,
        strengths: [
          `Sector: ${t.sector}`,
          `Faculty: ${t.faculty}`,
          `Innovation: ${t.innovation}`,
          `Stage: ${t.level}`,
        ],
        weaknesses: [],
        warnings: [],
        source: "deterministic",
      }
    })

    const notes = buildRosterNotes(seededTeams)

    const existingRun = await prisma.impactLabMatchRun.findFirst({
      where: { cohort: COHORT, isFinal: true },
      orderBy: { createdAt: "desc" },
    })

    if (existingRun) {
      // Update in place so the run id — anything keyed to it, like a
      // leader's own leaderId claim — survives a re-run.
      await prisma.impactLabMatchRun.update({
        where: { id: existingRun.id },
        data: {
          name: RUN_NAME,
          notes,
          settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
          result: JSON.parse(JSON.stringify(result)),
          participantsSnapshot: JSON.parse(JSON.stringify(matchParticipants)),
          explanations: JSON.parse(JSON.stringify(explanations)),
        },
      })
      console.log(
        `\nUpdated final run ${existingRun.id} in place: ${teamsOut.length} teams.`
      )
    } else {
      const created = await prisma.impactLabMatchRun.create({
        data: {
          cohort: COHORT,
          name: RUN_NAME,
          notes,
          isFinal: true,
          settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
          result: JSON.parse(JSON.stringify(result)),
          // Raw MatchParticipant[] shape, NOT pre-normalized — the member team
          // route (src/app/api/impact-lab/team/route.ts) calls
          // normalizeParticipants() on this snapshot itself at read time, so a
          // pre-normalized snapshot would be normalized twice and crash on
          // fields (technicalSkills etc.) that don't exist on that shape.
          participantsSnapshot: JSON.parse(JSON.stringify(matchParticipants)),
          explanations: JSON.parse(JSON.stringify(explanations)),
          submissionsCloseAt: null,
          judgingClosedAt: null,
          resultsPublishedAt: null,
          // announcedWinners / resultsSnapshot are nullable Json columns with
          // no @default — omitting them (rather than passing null/undefined)
          // leaves them SQL NULL, same effect the spec asks for.
          createdById: null,
        },
      })
      console.log(`\nNo final run existed. Created ${created.id} and marked it final: ${teamsOut.length} teams.`)
    }

    writeReport(rows, skipped, true)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
