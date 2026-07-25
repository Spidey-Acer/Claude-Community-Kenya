/**
 * Import the manually-assigned Impact Lab teams into the cohort's final run.
 *
 * On the night of AI Mashinani the automated reveal failed and organisers
 * assigned 37 tables by hand at the door. That printed list — not the matching
 * engine — is the truth participants are sitting at, so this script makes the
 * database agree with the room.
 *
 * Names in the list are real-world messy: inconsistent case, single names,
 * initials, nicknames, and at least one first name that appears on two
 * different tables. Matching is therefore tiered and refuses to guess: a name
 * that could be two people is UNRESOLVED, never silently assigned to the first
 * candidate. Putting someone on the wrong team is worse than leaving them for
 * the check-in desk to fix by hand.
 *
 * Dry run by default — prints a match report and writes nothing:
 *   npm run import:manual-teams
 * Apply (refuses while any name is unresolved):
 *   npm run import:manual-teams -- --apply
 *   npm run import:manual-teams -- --apply --allow-unresolved
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { DEFAULT_COHORT } from "../src/lib/impact-lab/constants"
import { DEFAULT_SETTINGS } from "../src/lib/matching"
import type { MatchResult, ScoreBreakdown, Team } from "../src/lib/matching"

const ASSIGNMENTS_FILE = resolve(
  "C:/Projects/Claude-Community-Kenya/impact-lab-day-of/team-assignments.txt"
)
const REPORT_FILE = resolve("scripts/output/manual-team-import-report.txt")

const APPLY = process.argv.includes("--apply")
const ALLOW_UNRESOLVED = process.argv.includes("--allow-unresolved")

// ─── Parsing ─────────────────────────────────────────────────────────────────

interface ParsedTable {
  table: number
  track: string
  names: string[]
}

/** `=== AFYA (HEALTH) ===` → `Afya (Health)`. */
function titleCaseTrack(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim()
}

export function parseAssignments(text: string): ParsedTable[] {
  const tables: ParsedTable[] = []
  let track = "Unassigned"

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const trackMatch = /^===\s*(.+?)\s*===$/.exec(trimmed)
    if (trackMatch) {
      track = titleCaseTrack(trackMatch[1])
      continue
    }

    const tableMatch = /^Table\s+(\d+)\s*:\s*(.+)$/i.exec(trimmed)
    if (!tableMatch) continue // headers and the footer total line

    const names = tableMatch[2]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)

    tables.push({ table: Number(tableMatch[1]), track, names })
  }

  return tables
}

// ─── Name matching ───────────────────────────────────────────────────────────

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

type Tier = "exact" | "normalized" | "first-last-initial" | "substring"

interface Resolution {
  name: string
  table: number
  participantId: string | null
  tier: Tier | null
  candidates: string[]
}

interface Candidate {
  id: string
  fullName: string
}

/**
 * Resolve one written name against the cohort. Tiers run widest-last, and any
 * tier producing more than one candidate stops the search UNRESOLVED rather
 * than falling through to a looser tier — an ambiguous name must never be
 * resolved by a rule that happens to break the tie arbitrarily.
 */
export function resolveName(
  written: string,
  people: Candidate[]
): { participantId: string | null; tier: Tier | null; candidates: string[] } {
  const target = normalizeName(written)
  if (!target) return { participantId: null, tier: null, candidates: [] }

  const tiers: [Tier, (p: Candidate) => boolean][] = [
    ["exact", (p) => p.fullName.trim().toLowerCase() === written.trim().toLowerCase()],
    ["normalized", (p) => normalizeName(p.fullName) === target],
    [
      "first-last-initial",
      (p) => {
        const a = target.split(" ")
        const b = normalizeName(p.fullName).split(" ")
        if (a.length < 2 || b.length < 2) return false
        return a[0] === b[0] && a[a.length - 1][0] === b[b.length - 1][0]
      },
    ],
    [
      "substring",
      (p) => {
        const full = normalizeName(p.fullName)
        // Require a whole-word hit so "ian" does not match "Brian".
        const words = new Set(full.split(" "))
        if (target.split(" ").every((w) => words.has(w))) return true
        return full.includes(target) && target.length >= 6
      },
    ],
  ]

  for (const [tier, predicate] of tiers) {
    const hits = people.filter(predicate)
    if (hits.length === 1) {
      return { participantId: hits[0].id, tier, candidates: [hits[0].fullName] }
    }
    if (hits.length > 1) {
      // Ambiguous at this tier — refuse, and show the organiser the options.
      return {
        participantId: null,
        tier: null,
        candidates: hits.map((h) => h.fullName),
      }
    }
  }

  return { participantId: null, tier: null, candidates: [] }
}

// ─── Result assembly ─────────────────────────────────────────────────────────

/** A manual assignment has no computed score; report zeros rather than invent one. */
const MANUAL_SCORE: ScoreBreakdown = {
  total: 0,
  dimensions: [],
  penalties: [],
  penaltyTotal: 0,
}

export function buildTeams(
  tables: ParsedTable[],
  resolvedByTable: Map<number, string[]>
): Team[] {
  return tables
    .map((t) => ({
      id: `table-${t.table}`,
      name: `Table ${t.table} — ${t.track}`,
      memberIds: resolvedByTable.get(t.table) ?? [],
      locked: true,
      score: MANUAL_SCORE,
    }))
    .filter((t) => t.memberIds.length > 0)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const text = readFileSync(ASSIGNMENTS_FILE, "utf8")
  const tables = parseAssignments(text)
  const totalNames = tables.reduce((n, t) => n + t.names.length, 0)
  console.log(`Parsed ${tables.length} tables, ${totalNames} names.`)

  // Same driver-adapter construction the app uses (src/lib/prisma.ts) — the
  // generated client has no default constructor in this setup.
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Run with the production VPS URL, e.g.\n" +
        '  DATABASE_URL="postgres://..." npm run import:manual-teams'
    )
    process.exitCode = 1
    return
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5 }),
  })
  try {
    const people = await prisma.impactLabParticipant.findMany({
      where: { cohort: DEFAULT_COHORT },
      select: { id: true, fullName: true },
    })
    console.log(`Loaded ${people.length} participants in ${DEFAULT_COHORT}.`)

    const resolutions: Resolution[] = []
    const resolvedByTable = new Map<number, string[]>()
    const usedIds = new Map<string, { name: string; table: number }>()

    for (const t of tables) {
      const ids: string[] = []
      for (const name of t.names) {
        const r = resolveName(name, people)
        // One person cannot sit at two tables; the first table wins and the
        // duplicate is reported rather than silently moving them.
        if (r.participantId && usedIds.has(r.participantId)) {
          const prev = usedIds.get(r.participantId)
          resolutions.push({
            name,
            table: t.table,
            participantId: null,
            tier: null,
            candidates: [`already placed at table ${prev?.table} as "${prev?.name}"`],
          })
          continue
        }
        if (r.participantId) {
          usedIds.set(r.participantId, { name, table: t.table })
          ids.push(r.participantId)
        }
        resolutions.push({ name, table: t.table, ...r })
      }
      resolvedByTable.set(t.table, ids)
    }

    const unresolved = resolutions.filter((r) => !r.participantId)
    const byTier = new Map<string, number>()
    for (const r of resolutions) {
      if (r.tier) byTier.set(r.tier, (byTier.get(r.tier) ?? 0) + 1)
    }

    const lines: string[] = [
      "IMPACT LAB — MANUAL TEAM IMPORT REPORT",
      `Cohort: ${DEFAULT_COHORT}`,
      `Tables: ${tables.length}   Names in list: ${totalNames}   Participants in DB: ${people.length}`,
      `Matched: ${resolutions.length - unresolved.length}   UNRESOLVED: ${unresolved.length}`,
      "",
      "Matched by tier:",
      ...[...byTier].map(([tier, n]) => `  ${tier}: ${n}`),
      "",
      "UNRESOLVED — these people will NOT appear on a team until fixed by hand:",
    ]
    for (const r of unresolved) {
      const hint = r.candidates.length
        ? `  candidates: ${r.candidates.join(" | ")}`
        : "  no candidate found — may not have an account"
      lines.push(`  Table ${r.table}: "${r.name}"`, hint)
    }
    lines.push("", "Full resolution list:")
    for (const r of resolutions) {
      lines.push(
        `  Table ${r.table}: "${r.name}" -> ${r.participantId ?? "UNRESOLVED"} (${r.tier ?? "none"})`
      )
    }

    mkdirSync(dirname(REPORT_FILE), { recursive: true })
    writeFileSync(REPORT_FILE, lines.join("\n"), "utf8")

    console.log("")
    console.log(lines.slice(0, 12).join("\n"))
    console.log(`\nFull report: ${REPORT_FILE}`)

    if (!APPLY) {
      console.log("\nDRY RUN — nothing written. Re-run with --apply to write.")
      return
    }

    if (unresolved.length > 0 && !ALLOW_UNRESOLVED) {
      console.error(
        `\nREFUSING TO WRITE: ${unresolved.length} unresolved name(s). ` +
          "Fix them, or re-run with --allow-unresolved to proceed without them."
      )
      process.exitCode = 1
      return
    }

    const teams = buildTeams(tables, resolvedByTable)
    const placed = new Set(teams.flatMap((t) => t.memberIds))
    const unassignedIds = people.map((p) => p.id).filter((id) => !placed.has(id))

    const result: MatchResult = {
      teams,
      unassignedIds,
      warnings: [
        "Teams assigned manually at the door; scores are not computed for a manual import.",
        ...(unresolved.length
          ? [`${unresolved.length} name(s) on the printed list could not be matched to an account.`]
          : []),
      ],
      averageScore: 0,
      settingsUsed: DEFAULT_SETTINGS,
    }

    const run = await prisma.impactLabMatchRun.findFirst({
      where: { cohort: DEFAULT_COHORT, isFinal: true },
      orderBy: { createdAt: "desc" },
    })

    if (run) {
      // Update in place so the run id — which anything keyed to it still
      // references — survives. Explanations describe the OLD teams, so drop
      // any whose team id no longer exists rather than leaving a writeup
      // attached to a different set of people.
      const keptIds = new Set(teams.map((t) => t.id))
      const existing = Array.isArray(run.explanations)
        ? (run.explanations as { teamId?: string }[])
        : []
      const kept = existing.filter((e) => e.teamId && keptIds.has(e.teamId))

      await prisma.impactLabMatchRun.update({
        where: { id: run.id },
        data: {
          result: JSON.parse(JSON.stringify(result)),
          explanations: JSON.parse(JSON.stringify(kept)),
          notes: "Manual table assignments imported from the door list.",
        },
      })
      console.log(
        `\nUpdated final run ${run.id} in place: ${teams.length} teams, ` +
          `${placed.size} placed, ${unassignedIds.length} unassigned, ` +
          `${existing.length - kept.length} stale explanation(s) dropped.`
      )
    } else {
      const created = await prisma.impactLabMatchRun.create({
        data: {
          cohort: DEFAULT_COHORT,
          name: "Manual table assignments",
          notes: "Manual table assignments imported from the door list.",
          isFinal: true,
          settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
          result: JSON.parse(JSON.stringify(result)),
          // The snapshot exists so a reveal survives later profile edits. A
          // manual import has no engine snapshot, so store the roster as it
          // stands now rather than leaving the column empty.
          participantsSnapshot: JSON.parse(JSON.stringify(people)),
        },
      })
      console.log(
        `\nNo final run existed. Created ${created.id} and marked it final: ` +
          `${teams.length} teams, ${placed.size} placed.`
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
