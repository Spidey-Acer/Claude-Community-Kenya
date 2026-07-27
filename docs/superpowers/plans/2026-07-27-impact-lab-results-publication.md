# Impact Lab Results Publication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the Impact Lab hackathon results to the 93 builders whose teams submitted — announced winners, track winners, each team's own scores — and lock the record so nothing can move underneath it afterwards.

**Architecture:** A pure computation module (`results.ts`) turns judge scores plus the announced winners into an immutable snapshot. `publish` writes that snapshot inside a row-locked transaction and closes submissions and judging in the same step. Everything participants see is served from the stored snapshot, never recomputed. Judge transparency and judge-exclusion previews are admin-only and read-only — no path exists from them to published output.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma 7 with the driver-adapter pattern, PostgreSQL 17, Tailwind v4, Resend, `ai` + `@ai-sdk/anthropic`.

**Spec:** `docs/superpowers/specs/2026-07-27-impact-lab-results-publication-design.md`

**Branch:** `feat/impact-lab-results` (already created)

## Global Constraints

Every task's requirements implicitly include this section.

- **TypeScript strict. Never use `any`.** No `.js` files in `src/`.
- **This repo has no unit-test framework.** The established pattern is an assertion script — `scripts/verify-matching.ts`, `scripts/verify-judging.ts` — run via an npm script, exiting 0 or 1. Pure logic is tested that way. Route and UI work is verified by running commands and reading output; those tasks say exactly what to run and what to look for.
- **Verify before every commit:** `npx tsc --noEmit` and `npm run build` must both pass clean.
- **Conventional commits**, scoped: `type(scope): description`. No AI attribution.
- **Participant-facing copy rules, absolute:**
  - Never show judge counts — not per team, not in aggregate.
  - Never mention a deadline, cut-off, time cap, or late submission.
  - Never suggest a team failed to present, left early, or was missed.
  - Plain English. No Swahili in participant-facing copy.
- **Never print or commit the production database password.** The connection file at `C:\Projects\_backups\cck\vps-connection.txt` is outside the repo deliberately.
- **Styling:** Tailwind utilities plus the CSS variables in `src/app/globals.css`. No inline styles in React. The persona system (Dev = Terminal Noir, Pro = glassmorphism) applies to participant surfaces. **Invoke the `frontend-design` skill before writing the participant-facing UI in Task 8** — that surface is the one 93 people will actually look at, and the admin tabs should mirror the existing `LeaderboardTab.tsx` rather than invent a second admin style.
- **Admin API responses** are `{success, data}`. **Member API responses** are flat `{success, ...}`. Follow whichever surface you are on.
- **Guard order on member routes:** CSRF → rate limit → auth → validation.
- **Cohort:** `impact-lab-2026-07` (`DEFAULT_COHORT` in `src/lib/impact-lab/constants.ts`).
- **The announced winners are fixed and must never be recomputed:** BiasharaGPT (1), VilCare (2), Oryn (3).

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/lib/impact-lab/results.ts` | Pure snapshot computation. No Prisma, no Next. |
| `scripts/verify-results.ts` | Assertions for the above. |
| `src/app/api/admin/impact-lab/judging/audit/route.ts` | Per-judge audit data (staff). |
| `src/app/api/admin/impact-lab/judging/preview/route.ts` | What-if standings with judges excluded (staff). |
| `src/app/api/admin/impact-lab/judging/writeup/route.ts` | Draft and save submission-only scores (staff). |
| `src/app/api/admin/impact-lab/results/publish/route.ts` | Mark final: lock, snapshot, queue. |
| `src/app/api/admin/impact-lab/results/notify/route.ts` | Resumable send. |
| `src/app/api/impact-lab/results/route.ts` | Member-facing published result. |
| `src/components/admin/impact-lab/JudgesTab.tsx` | Judge audit + exclusion preview UI. |
| `src/components/admin/impact-lab/ResultsTab.tsx` | Writeup review, publish, send. |
| `src/app/dashboard/impact-lab/ResultsView.tsx` | Participant results surface. |
| `prisma/migrations/20260727120000_impact_lab_results/migration.sql` | Schema change. |

**Modified:**

| File | Change |
|---|---|
| `prisma/schema.prisma` | New fields on two models, one new model. |
| `src/lib/email.ts` | Add `sendEmailBatchTracked` and `impactLabResultsEmail`. |
| `src/app/api/admin/impact-lab/judging/route.ts` | Reject writes once judging is closed. |
| `src/components/admin/impact-lab/ImpactLabDashboard.tsx` | Two new tabs. |
| `src/app/dashboard/impact-lab/ImpactLabClient.tsx` | New `results` phase. |
| `package.json` | `verify:results` script. |

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260727120000_impact_lab_results/migration.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `ImpactLabMatchRun.judgingClosedAt`, `.resultsPublishedAt`, `.announcedWinners`, `.resultsSnapshot`; `ImpactLabScore.writeupOnly`; model `ImpactLabResultsEmail` with fields `id, runId, participantId, email, status, error, sentAt, createdAt` and `@@unique([runId, participantId])`.

- [ ] **Step 1: Add the fields to `ImpactLabMatchRun`**

In `prisma/schema.prisma`, inside `model ImpactLabMatchRun`, immediately after the `submissionsCloseAt` field:

```prisma
  /// Set by mark-final. Once non-null, no further scores may be written —
  /// the judging route rejects writes rather than silently accepting a score
  /// that can never reach the published result.
  judgingClosedAt      DateTime?
  /// When results were published to participants. Non-null means the result
  /// is immutable: everything participants see is served from resultsSnapshot.
  resultsPublishedAt   DateTime?
  /// The winners as announced in the room, stored verbatim. Never recomputed —
  /// the panel deliberated, and arithmetic does not reproduce their decision.
  announcedWinners     Json?
  /// The exact ResultsSnapshot that was published. Served as-is so a later
  /// score correction or submission edit cannot rewrite what people read.
  resultsSnapshot      Json?
  resultsEmails        ImpactLabResultsEmail[]
```

- [ ] **Step 2: Add the field to `ImpactLabScore`**

Inside `model ImpactLabScore`, immediately after `feedback`:

```prisma
  /// True when this score came from reading the written submission rather than
  /// watching a live demo. The demo criterion is 25% of the weight and asks
  /// whether the thing ran in front of you, so the basis must travel with the
  /// score wherever it is shown.
  writeupOnly Boolean @default(false)
```

- [ ] **Step 3: Add the new model**

At the end of `prisma/schema.prisma`:

```prisma
/// One row per intended recipient of the results email. This is what makes the
/// send idempotent: Resend's quota is 100/day and there are 93 recipients, so a
/// careless retry exceeds it. A resend selects status <> 'sent' only.
model ImpactLabResultsEmail {
  id            String    @id @default(cuid())
  runId         String
  participantId String
  email         String
  /// queued | sent | failed
  status        String    @default("queued")
  error         String?
  sentAt        DateTime?
  createdAt     DateTime  @default(now())

  run ImpactLabMatchRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@unique([runId, participantId])
  @@index([runId, status])
  @@map("impact_lab_results_emails")
}
```

- [ ] **Step 4: Write the migration SQL by hand**

Create `prisma/migrations/20260727120000_impact_lab_results/migration.sql`. Write it by hand rather than running `prisma migrate dev` — that command has previously proposed dropping the partial unique index `impact_lab_match_runs_one_final_per_cohort`, which Prisma cannot express and which must survive.

```sql
ALTER TABLE "impact_lab_match_runs"
  ADD COLUMN "judgingClosedAt" TIMESTAMP(3),
  ADD COLUMN "resultsPublishedAt" TIMESTAMP(3),
  ADD COLUMN "announcedWinners" JSONB,
  ADD COLUMN "resultsSnapshot" JSONB;

ALTER TABLE "impact_lab_scores"
  ADD COLUMN "writeupOnly" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "impact_lab_results_emails" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "impact_lab_results_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impact_lab_results_emails_runId_participantId_key"
  ON "impact_lab_results_emails" ("runId", "participantId");

CREATE INDEX "impact_lab_results_emails_runId_status_idx"
  ON "impact_lab_results_emails" ("runId", "status");

ALTER TABLE "impact_lab_results_emails"
  ADD CONSTRAINT "impact_lab_results_emails_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "impact_lab_match_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Generate the client and typecheck**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: both succeed. The generated client now has `writeupOnly` on `ImpactLabScore` and `prisma.impactLabResultsEmail`.

Note: the generated client has **no default constructor** — this project uses `new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) })`. Use the exported `prisma` from `@/lib/prisma`; do not construct your own.

- [ ] **Step 6: Verify the migration applies to a scratch database**

Do **not** point this at production. Confirm `DATABASE_URL` in your local `.env` is not the production VPS before running anything.

Run: `npx prisma migrate status`
Expected: lists `20260727120000_impact_lab_results` as pending or applied. If it reports drift about `one_final_per_cohort`, stop and report — do not let it "fix" that.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260727120000_impact_lab_results/
git commit -m "feat(impact-lab): schema for results publication"
```

---

### Task 2: Results computation

**Files:**
- Create: `src/lib/impact-lab/results.ts`
- Create: `scripts/verify-results.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `TeamStanding`, `JUDGING_CRITERIA`, `trackOf` from `@/lib/impact-lab/judging`.
- Produces:
  - `type ResultBasis = "announced" | "demo" | "submission"`
  - `interface RankedTeam { rank: number; teamId: string; projectName: string; track: string; average: number; basis: ResultBasis }`
  - `interface AnnouncedWinner { rank: number; teamId: string; projectName: string }`
  - `interface ResultsTrackWinner { track: string; teamId: string; projectName: string; basis: "announced" | "score" }`
  - `interface TeamCard { rank: number; criterionAverages: Record<string, number>; low: number; high: number; basis: "demo" | "submission" }`
  - `interface ResultsSnapshot { publishedAt: string; overall: AnnouncedWinner[]; trackWinners: ResultsTrackWinner[]; ranking: RankedTeam[]; perTeam: Record<string, TeamCard> }`
  - `interface ResultsInput { publishedAt: string; announcedTeamIds: string[]; standings: TeamStanding[]; teams: Map<string, { projectName: string; track: string }>; writeupOnly: Set<string>; range: Map<string, { low: number; high: number }> }`
  - `function buildSnapshot(input: ResultsInput): ResultsSnapshot`

- [ ] **Step 1: Write the failing assertions**

Create `scripts/verify-results.ts`:

```ts
/**
 * Impact Lab results — verification harness.
 *
 * Follows scripts/verify-judging.ts. The arithmetic here decides what 93 people
 * are told about their own work, so the ranking rule, the track-winner rule and
 * the privacy of the payload are asserted rather than trusted.
 *
 * Run with: npm run verify:results
 */

import { buildSnapshot, type ResultsInput } from "../src/lib/impact-lab/results"
import type { TeamStanding } from "../src/lib/impact-lab/judging"

let failures = 0

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    console.error(`  ✗ ${message}`)
    failures += 1
  }
}

const standing = (teamId: string, average: number): TeamStanding => ({
  teamId,
  average,
  judgeCount: 2,
  criterionAverages: { impact: 4, demo: 4, claude: 4, clarity: 4, presentation: 4 },
})

// Mirrors production: the announced winners do not top the score table.
const input: ResultsInput = {
  publishedAt: "2026-07-27T09:00:00.000Z",
  announcedTeamIds: ["t-biasharagpt", "t-vilcare", "t-oryn"],
  standings: [
    standing("t-whatsy", 76.9),
    standing("t-biasharagpt", 75.3),
    standing("t-keyosk", 73.8),
    standing("t-oryn", 73.3),
    standing("t-vilcare", 55.3),
    standing("t-kilimoeco", 80.0),
  ],
  teams: new Map([
    ["t-whatsy", { projectName: "Whatsy", track: "Biashara (Small Business)" }],
    ["t-biasharagpt", { projectName: "BiasharaGPT", track: "Biashara (Small Business)" }],
    ["t-keyosk", { projectName: "KeyOSk", track: "Biashara (Small Business)" }],
    ["t-oryn", { projectName: "Oryn", track: "Biashara (Small Business)" }],
    ["t-vilcare", { projectName: "VilCare", track: "Afya (Health)" }],
    ["t-kilimoeco", { projectName: "kilimoeco", track: "Kilimo (Agriculture)" }],
  ]),
  writeupOnly: new Set(["t-kilimoeco"]),
  range: new Map([
    ["t-vilcare", { low: 18.8, high: 88.8 }],
    ["t-whatsy", { low: 76.3, high: 77.5 }],
  ]),
}

const snap = buildSnapshot(input)

console.log("\nRanking")
assert(snap.ranking[0].teamId === "t-biasharagpt", "the announced champion ranks 1st")
assert(snap.ranking[1].teamId === "t-vilcare", "the announced 2nd ranks 2nd despite the lowest score")
assert(snap.ranking[2].teamId === "t-oryn", "the announced 3rd ranks 3rd")
assert(
  snap.ranking[0].basis === "announced" && snap.ranking[2].basis === "announced",
  "announced winners carry basis 'announced'"
)

const whatsy = snap.ranking.find((r) => r.teamId === "t-whatsy")
assert(
  whatsy?.rank === 5,
  "a team outscoring the champion still ranks below it — kilimoeco 80.0 is 4th, Whatsy 76.9 is 5th"
)
assert(
  snap.ranking.length === 6 && new Set(snap.ranking.map((r) => r.teamId)).size === 6,
  "every submitted team appears exactly once"
)
assert(
  snap.ranking.every((r, i) => r.rank === i + 1),
  "ranks are dense and start at 1"
)
assert(
  snap.ranking.find((r) => r.teamId === "t-kilimoeco")?.basis === "submission",
  "a submission-reviewed team carries basis 'submission'"
)

console.log("\nTrack winners")
const byTrack = new Map(snap.trackWinners.map((w) => [w.track, w]))
assert(
  byTrack.get("Biashara (Small Business)")?.teamId === "t-biasharagpt",
  "an announced winner leads its own track, ahead of a higher-scoring team"
)
assert(
  byTrack.get("Biashara (Small Business)")?.basis === "announced",
  "that track winner is marked as decided by announcement"
)
assert(
  byTrack.get("Afya (Health)")?.teamId === "t-vilcare",
  "the announced 2nd leads its track"
)
assert(
  byTrack.get("Kilimo (Agriculture)")?.teamId === "t-kilimoeco" &&
    byTrack.get("Kilimo (Agriculture)")?.basis === "score",
  "a track with no announced winner goes to the top score, marked as such"
)
assert(
  snap.trackWinners.length === 3,
  "only tracks with at least one ranked team produce a winner"
)

console.log("\nPrivacy of the payload")
const serialized = JSON.stringify(snap)
assert(!serialized.includes("judgeCount"), "the snapshot never carries a judge count")
assert(
  !/"judge(Name|Email)"/.test(serialized),
  "the snapshot never carries a judge identity"
)
assert(
  Object.keys(snap.perTeam).length === 6,
  "every ranked team gets a private card"
)
assert(
  snap.perTeam["t-vilcare"].low === 18.8 && snap.perTeam["t-vilcare"].high === 88.8,
  "a team's own card carries the range across judges"
)
assert(
  snap.perTeam["t-vilcare"].rank === 2,
  "a team's own card carries its published rank, not its score rank"
)

console.log("\nDeterminism")
assert(
  JSON.stringify(buildSnapshot(input)) === serialized,
  "two builds from identical input are byte-identical"
)
const tied = buildSnapshot({
  ...input,
  announcedTeamIds: [],
  standings: [standing("t-b", 70), standing("t-a", 70)],
  teams: new Map([
    ["t-a", { projectName: "A", track: "Afya (Health)" }],
    ["t-b", { projectName: "B", track: "Afya (Health)" }],
  ]),
  writeupOnly: new Set(),
  range: new Map(),
})
assert(tied.ranking[0].teamId === "t-a", "ties break deterministically by team id")

console.log(
  failures === 0 ? "\nALL CHECKS PASSED\n" : `\n${failures} CHECK(S) FAILED\n`
)
process.exit(failures === 0 ? 0 : 1)
```

- [ ] **Step 2: Add the npm script**

In `package.json`, in `"scripts"`, next to the existing `verify:judging` entry:

```json
"verify:results": "tsx scripts/verify-results.ts"
```

Match the runner the neighbouring `verify:judging` script uses — if it uses something other than `tsx`, use that instead.

- [ ] **Step 3: Run the assertions to verify they fail**

Run: `npm run verify:results`
Expected: FAIL — cannot resolve `../src/lib/impact-lab/results`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/impact-lab/results.ts`:

```ts
/**
 * Impact Lab results — the published snapshot.
 *
 * Pure and dependency-free (no Prisma, no Next) so the rules that decide what
 * 93 builders are told can be asserted by a script.
 *
 * Two rules carry all the weight:
 *
 * 1. The three winners announced in the room hold ranks 1-3, whatever the
 *    arithmetic says. The panel watched every demo and deliberated; no
 *    combination of the recorded scores reproduces their decision, and the
 *    announcement is already public. Recomputing it would contradict what
 *    people were told to their faces.
 * 2. Everyone else ranks below them by score. Scores order the list but are
 *    never printed in it — publishing them would place a 76.9 at 4th above a
 *    75.3 at 1st, which is the contradiction this ranking exists to remove.
 *    A team's own numbers live on its own private card.
 */

import { trackOf, type TeamStanding } from "./judging"

/** How a team's placing was arrived at. */
export type ResultBasis = "announced" | "demo" | "submission"

export interface RankedTeam {
  rank: number
  teamId: string
  projectName: string
  track: string
  /** Orders the ranking. Never rendered in the public table. */
  average: number
  basis: ResultBasis
}

export interface AnnouncedWinner {
  rank: number
  teamId: string
  projectName: string
}

export interface ResultsTrackWinner {
  track: string
  teamId: string
  projectName: string
  /** "announced" when an overall winner leads the track, else "score". */
  basis: "announced" | "score"
}

/** Served only to members of that team. */
export interface TeamCard {
  rank: number
  criterionAverages: Record<string, number>
  low: number
  high: number
  basis: "demo" | "submission"
}

export interface ResultsSnapshot {
  publishedAt: string
  overall: AnnouncedWinner[]
  trackWinners: ResultsTrackWinner[]
  ranking: RankedTeam[]
  perTeam: Record<string, TeamCard>
}

export interface ResultsInput {
  publishedAt: string
  /** Announced winners in announced order. Empty is legal; three is the case. */
  announcedTeamIds: string[]
  standings: TeamStanding[]
  teams: Map<string, { projectName: string; track: string }>
  /** Teams scored from the written submission rather than a live demo. */
  writeupOnly: Set<string>
  /** Lowest and highest weighted total across that team's judges. */
  range: Map<string, { low: number; high: number }>
}

const UNKNOWN_TRACK = "Unassigned"

function metaOf(
  input: ResultsInput,
  teamId: string
): { projectName: string; track: string } {
  const meta = input.teams.get(teamId)
  if (meta) return meta
  // A team present in standings but absent from the run JSON should not be able
  // to crash publication; it appears with its id rather than vanishing.
  return { projectName: teamId, track: UNKNOWN_TRACK }
}

/**
 * Announced winners first in announced order, then everyone else by average
 * descending. Ties break by teamId so two loads never reorder themselves.
 */
export function buildRanking(input: ResultsInput): RankedTeam[] {
  const announced = new Set(input.announcedTeamIds)
  const byTeam = new Map(input.standings.map((s) => [s.teamId, s]))

  const rows: RankedTeam[] = []

  for (const teamId of input.announcedTeamIds) {
    const meta = metaOf(input, teamId)
    rows.push({
      rank: rows.length + 1,
      teamId,
      projectName: meta.projectName,
      track: meta.track || trackOf(meta.projectName),
      average: byTeam.get(teamId)?.average ?? 0,
      basis: "announced",
    })
  }

  const rest = input.standings
    .filter((s) => !announced.has(s.teamId))
    .sort((a, b) => b.average - a.average || a.teamId.localeCompare(b.teamId))

  for (const s of rest) {
    const meta = metaOf(input, s.teamId)
    rows.push({
      rank: rows.length + 1,
      teamId: s.teamId,
      projectName: meta.projectName,
      track: meta.track || trackOf(meta.projectName),
      average: s.average,
      basis: input.writeupOnly.has(s.teamId) ? "submission" : "demo",
    })
  }

  return rows
}

/**
 * One winner per track. An announced overall winner leads its own track — so
 * the champion never appears to lose its own category on the same page that
 * crowns it. Tracks with no announced winner go to their highest-ranked team.
 */
export function buildTrackWinners(ranking: RankedTeam[]): ResultsTrackWinner[] {
  const best = new Map<string, ResultsTrackWinner>()

  // `ranking` is already ordered with announced winners first, so the first
  // sighting of a track is its winner.
  for (const row of ranking) {
    if (best.has(row.track)) continue
    best.set(row.track, {
      track: row.track,
      teamId: row.teamId,
      projectName: row.projectName,
      basis: row.basis === "announced" ? "announced" : "score",
    })
  }

  return [...best.values()].sort((a, b) => a.track.localeCompare(b.track))
}

export function buildSnapshot(input: ResultsInput): ResultsSnapshot {
  const ranking = buildRanking(input)
  const standingById = new Map(input.standings.map((s) => [s.teamId, s]))

  const perTeam: Record<string, TeamCard> = {}
  for (const row of ranking) {
    const standing = standingById.get(row.teamId)
    const range = input.range.get(row.teamId)
    perTeam[row.teamId] = {
      rank: row.rank,
      criterionAverages: standing?.criterionAverages ?? {},
      low: range?.low ?? 0,
      high: range?.high ?? 0,
      basis: input.writeupOnly.has(row.teamId) ? "submission" : "demo",
    }
  }

  return {
    publishedAt: input.publishedAt,
    overall: input.announcedTeamIds.map((teamId, i) => ({
      rank: i + 1,
      teamId,
      projectName: metaOf(input, teamId).projectName,
    })),
    trackWinners: buildTrackWinners(ranking),
    ranking,
    perTeam,
  }
}
```

- [ ] **Step 5: Run the assertions to verify they pass**

Run: `npm run verify:results`
Expected: `ALL CHECKS PASSED`, exit 0.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/impact-lab/results.ts scripts/verify-results.ts package.json
git commit -m "feat(impact-lab): results snapshot computation"
```

---

### Task 3: Close judging when results are final

**Files:**
- Modify: `src/app/api/admin/impact-lab/judging/route.ts`

**Interfaces:**
- Consumes: `ImpactLabMatchRun.judgingClosedAt` from Task 1.
- Produces: nothing new. A score write returns 409 with `code: "JUDGING_CLOSED"` once judging is closed.

- [ ] **Step 1: Find the POST handler's run lookup**

Run: `grep -n "findFirst\|isFinal\|export async function POST" src/app/api/admin/impact-lab/judging/route.ts`

Note the line where POST loads the final run and what it selects.

- [ ] **Step 2: Add `judgingClosedAt` to that select and guard on it**

In the POST handler, extend the run lookup's `select` to include `judgingClosedAt: true`, then immediately after the existing "no final run" check, add:

```ts
  // Once results are published, a new score can never reach them. Accepting the
  // write anyway would tell a judge their scoring counted when it did not.
  if (run.judgingClosedAt) {
    return NextResponse.json(
      {
        success: false,
        error: "Judging is closed — results have been published.",
        code: "JUDGING_CLOSED",
      },
      { status: 409 }
    )
  }
```

Leave the GET handler untouched: judges and staff must still be able to read what was scored after publication.

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 4: Verify the guard by reading it back**

Run: `grep -n "JUDGING_CLOSED" src/app/api/admin/impact-lab/judging/route.ts`
Expected: exactly one hit, inside the POST handler and after the run lookup. Confirm by eye that no `return` before it can skip it.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/impact-lab/judging/route.ts
git commit -m "feat(impact-lab): reject score writes once judging is closed"
```

---

### Task 4: Judge audit

**Files:**
- Create: `src/app/api/admin/impact-lab/judging/audit/route.ts`
- Create: `src/components/admin/impact-lab/JudgesTab.tsx`
- Modify: `src/components/admin/impact-lab/ImpactLabDashboard.tsx`

**Interfaces:**
- Consumes: `weightedTotal`, `JUDGING_CRITERIA` from `@/lib/impact-lab/judging`; `checkApiPermission` from `@/lib/rbac`.
- Produces: `GET /api/admin/impact-lab/judging/audit?cohort=…` returning
  `{success: true, data: {judges: JudgeAudit[]}}` where
  `interface JudgeAudit { judgeEmail: string; judgeName: string; teamsScored: number; mean: number; firstScoredAt: string; lastScoredAt: string; sheets: {teamId: string; teamName: string; projectName: string | null; total: number; scores: Record<string, number>; writeupOnly: boolean; scoredAt: string}[] }`

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/impact-lab/judging/audit/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiPermission } from "@/lib/rbac"
import { safeCohort } from "@/lib/impact-lab/constants"
import { weightedTotal } from "@/lib/impact-lab/judging"

/**
 * Per-judge audit. Staff only — deliberately not reachable by a code-gated
 * judge session, because a judge seeing another judge's sheet is exactly the
 * anchoring the judging screen was built to avoid.
 *
 * This exists because the four judges scored on visibly different scales
 * (means from 48.3 to 72.2). That is invisible in an aggregate leaderboard and
 * changes how the result should be read, so it is surfaced rather than buried.
 */

interface AuditSheet {
  teamId: string
  teamName: string
  projectName: string | null
  total: number
  scores: Record<string, number>
  writeupOnly: boolean
  scoredAt: string
}

export interface JudgeAudit {
  judgeEmail: string
  judgeName: string
  teamsScored: number
  mean: number
  firstScoredAt: string
  lastScoredAt: string
  sheets: AuditSheet[]
}

function asScoreSheet(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && !Number.isNaN(v)) out[k] = v
  }
  return out
}

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const cohort = safeCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  if (!run) {
    return NextResponse.json({ success: true, data: { judges: [] } })
  }

  const [rows, submissions] = await Promise.all([
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        judgeEmail: true,
        judgeName: true,
        scores: true,
        writeupOnly: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: { teamId: true, projectName: true },
    }),
  ])

  const nameById = new Map<string, string>()
  const teams = (run.result as { teams?: { id: string; name: string }[] })?.teams ?? []
  for (const team of teams) nameById.set(team.id, team.name)
  const projectById = new Map(submissions.map((s) => [s.teamId, s.projectName]))

  const byJudge = new Map<string, JudgeAudit>()
  for (const row of rows) {
    const sheet = asScoreSheet(row.scores)
    const entry = byJudge.get(row.judgeEmail) ?? {
      judgeEmail: row.judgeEmail,
      judgeName: row.judgeName,
      teamsScored: 0,
      mean: 0,
      firstScoredAt: row.createdAt.toISOString(),
      lastScoredAt: row.createdAt.toISOString(),
      sheets: [],
    }
    entry.sheets.push({
      teamId: row.teamId,
      teamName: nameById.get(row.teamId) ?? row.teamId,
      projectName: projectById.get(row.teamId) ?? null,
      total: weightedTotal(sheet),
      scores: sheet,
      writeupOnly: row.writeupOnly,
      scoredAt: row.createdAt.toISOString(),
    })
    entry.lastScoredAt = row.createdAt.toISOString()
    byJudge.set(row.judgeEmail, entry)
  }

  const judges = [...byJudge.values()].map((j) => ({
    ...j,
    teamsScored: j.sheets.length,
    mean:
      Math.round(
        (j.sheets.reduce((n, s) => n + s.total, 0) / (j.sheets.length || 1)) * 10
      ) / 10,
  }))
  judges.sort((a, b) => b.teamsScored - a.teamsScored || a.judgeName.localeCompare(b.judgeName))

  return NextResponse.json({ success: true, data: { judges } })
}
```

- [ ] **Step 2: Build the tab**

Create `src/components/admin/impact-lab/JudgesTab.tsx`. Follow `LeaderboardTab.tsx` exactly for structure — `"use client"`, `apiGet` from `./api`, the same loading and error handling, the same Terminal Noir colour tokens (`#00ff41`, `#555`, `text-xs font-mono`).

Render, per judge: name, teams scored, mean, and the time span they worked. Below each, a collapsible list of their sheets showing team, project, each criterion value and the weighted total.

Above the list, a calibration summary: the highest and lowest judge means side by side with the gap between them, so the spread is the first thing an organiser sees rather than something they have to compute.

Leave a placeholder `<div>` where Task 5 adds the exclusion preview; that task fills it.

- [ ] **Step 3: Register the tab**

In `src/components/admin/impact-lab/ImpactLabDashboard.tsx`:
- Extend the `Tab` union on line 13 with `| "judges"`.
- Add `judges` to the tab list rendered around line 35, labelled `Judges`.
- Render `<JudgesTab cohort={cohort} />` when `tab === "judges"`, matching how `LeaderboardTab` is rendered.

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 5: Verify against real data**

Run: `npm run dev`, open `http://localhost:3000/admin/impact-lab`, sign in as an admin, open the **Judges** tab.

Expected, from production data: four judges — Cynthia Njagi 23 teams, Favour 22, Mercy 19, Savannah 9 — with means near 66.7, 72.2, 48.3 and 54.2. If the means come out equal, `weightedTotal` is not being applied per sheet; fix that before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/impact-lab/judging/audit/ src/components/admin/impact-lab/JudgesTab.tsx src/components/admin/impact-lab/ImpactLabDashboard.tsx
git commit -m "feat(impact-lab): per-judge audit view"
```

---

### Task 5: Exclusion preview

**Files:**
- Create: `src/app/api/admin/impact-lab/judging/preview/route.ts`
- Modify: `src/components/admin/impact-lab/JudgesTab.tsx`

**Interfaces:**
- Consumes: `standings` from `@/lib/impact-lab/judging`; the placeholder div from Task 4.
- Produces: `POST /api/admin/impact-lab/judging/preview` accepting `{cohort?: string, exclude: string[]}` (judge emails) and returning `{success: true, data: {rows: PreviewRow[], orphaned: string[]}}` where
  `interface PreviewRow { teamId: string; teamName: string; projectName: string | null; baseRank: number; previewRank: number | null; baseAverage: number; previewAverage: number | null; move: number | null }`

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/impact-lab/judging/preview/route.ts`. It must:

- Guard with `withCsrfProtection` then `checkApiPermission("impact-lab", "view")`.
- Parse the body with `z.object({ cohort: z.string().optional(), exclude: z.array(z.string().min(1).max(200)).max(20) })`.
- Load all scores for the final run once.
- Compute `standings()` twice — once over every score, once over scores whose `judgeEmail` is not in `exclude`.
- Return one row per team in the base standings, with `previewRank`/`previewAverage` `null` when excluding leaves that team with no scores at all, and list those team names in `orphaned`.
- Never write anything.

Open the file with this comment so its role cannot be misread later:

```ts
/**
 * What-if standings with judges excluded. READ ONLY, and deliberately so.
 *
 * The panel's announced result already overrides the arithmetic, so this
 * cannot change any published placing — it exists to let an organiser
 * understand a result, never to search for one they prefer. There is no write
 * path from here to resultsSnapshot, and adding one would turn a transparency
 * tool into a dial for shopping outcomes.
 */
```

- [ ] **Step 2: Build the preview UI**

In `JudgesTab.tsx`, replace the placeholder from Task 4 with a checkbox per judge and a results table showing base rank and preview rank side by side, with the movement arrow and delta.

Two things the UI must state plainly, as visible text not comments:
- A banner: *"Preview only. This cannot change published results."*
- When `orphaned` is non-empty: *"Excluding these judges would leave N teams with no scores at all: …"* in the amber token (`--amber`), not the red one — it is a warning, not an error.

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 4: Verify against real data**

With `npm run dev` running, tick **Savannah** in the Judges tab.

Expected: BiasharaGPT moves above Whatsy (78.3 vs 76.9). Tick **Savannah and Mercy** together: ReferNet rises to the top on 81.9. If neither happens, the exclusion filter is not reaching `standings()`.

- [ ] **Step 5: Confirm the route cannot write**

Run: `grep -n "prisma\.\(impactLab\)\?[A-Za-z]*\.\(update\|create\|upsert\|delete\)" src/app/api/admin/impact-lab/judging/preview/route.ts`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/impact-lab/judging/preview/ src/components/admin/impact-lab/JudgesTab.tsx
git commit -m "feat(impact-lab): judge exclusion preview, read-only"
```

---

### Task 6: Submission-only scoring for unjudged teams

**Files:**
- Create: `src/app/api/admin/impact-lab/judging/writeup/route.ts`
- Create: `src/components/admin/impact-lab/ResultsTab.tsx`
- Modify: `src/components/admin/impact-lab/ImpactLabDashboard.tsx`

**Interfaces:**
- Consumes: `JUDGING_CRITERIA`, `MIN_SCORE`, `MAX_SCORE` from `@/lib/impact-lab/judging`; the `generateObject` + `createAnthropic` pattern already used in `src/app/api/admin/impact-lab/judging/assist/route.ts`.
- Produces:
  - `GET  /api/admin/impact-lab/judging/writeup?cohort=…` → `{success: true, data: {teams: {teamId, teamName, projectName, submission: Record<string,string>}[]}}` — submitted teams with no score.
  - `POST /api/admin/impact-lab/judging/writeup` with `{teamId, action: "draft"}` → `{success: true, data: {scores: Record<string, number>, reasoning: Record<string, string>}}`
  - `POST /api/admin/impact-lab/judging/writeup` with `{teamId, action: "save", scores: Record<string, number>}` → `{success: true, data: {saved: true}}`

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/impact-lab/judging/writeup/route.ts`.

Header comment:

```ts
/**
 * Scoring a team from its written submission, for teams the panel did not see
 * demo. Four teams submitted and were never scored; without this they would be
 * published with no result at all.
 *
 * Claude drafts, a human decides. Nothing is written until an organiser posts
 * `action: "save"` with the numbers they accepted, and the row is stored as an
 * organiser review rather than attributed to a judge who never saw the work.
 *
 * The demo criterion is 25% of the weight and asks whether it ran in front of
 * you. No demo was seen, so the draft says so plainly instead of guessing, and
 * `writeupOnly` travels with the score wherever it is displayed.
 */
export const maxDuration = 60
```

Requirements:
- Guard: `withCsrfProtection` → `checkApiPermission("impact-lab", "edit")` (use the same action string the other write routes in this directory use — check `grep -n "checkApiPermission" src/app/api/admin/impact-lab/judging/route.ts` and match it).
- Refuse both actions with 409 when `run.judgingClosedAt` is set.
- `draft` calls `generateObject` with model `"claude-sonnet-5"` and a schema of `{scores: {impact, demo, claude, clarity, presentation}, reasoning: {…same keys…}}`, each score `z.number().int().min(1).max(5)`. System prompt must instruct: score only what the submission evidences; for the demo criterion, state that no live demo was seen and score only what the writeup demonstrates about working software; never inflate to be kind.
- `draft` writes nothing to the database.
- `save` validates every criterion key is present and within `MIN_SCORE`–`MAX_SCORE`, then upserts on `(runId, teamId, judgeEmail)` with `judgeEmail: "organiser:" + <session email>`, `judgeName: "Organiser review"`, `writeupOnly: true`.

- [ ] **Step 2: Build the review UI**

Create `src/components/admin/impact-lab/ResultsTab.tsx` with a first section "Teams awaiting a score". For each: the full submission, a **Draft with Claude** button, then five editable number inputs pre-filled from the draft with the reasoning shown beside each, and a **Save** button.

The save button must be disabled until every criterion has a value. A visible line above the inputs reads: *"Claude drafts. You decide. Nothing is saved until you press Save."*

Register the tab in `ImpactLabDashboard.tsx` the same way as Task 4 — extend the `Tab` union with `| "results"`, add the label `Results`, render `<ResultsTab cohort={cohort} />`.

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 4: Verify against real data**

With `npm run dev` running, open the **Results** tab.

Expected: exactly four teams listed — kilimoeco (Table 15), OnlyFarmers (27), ChatBook (30), Biashara (32). Draft one. Confirm the demo reasoning explicitly says no live demo was seen. Do **not** save yet unless the organiser has reviewed it.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/impact-lab/judging/writeup/ src/components/admin/impact-lab/ResultsTab.tsx src/components/admin/impact-lab/ImpactLabDashboard.tsx
git commit -m "feat(impact-lab): submission-only scoring for unjudged teams"
```

---

### Task 7: Publish

**Files:**
- Create: `src/app/api/admin/impact-lab/results/publish/route.ts`
- Modify: `src/components/admin/impact-lab/ResultsTab.tsx`

**Interfaces:**
- Consumes: `buildSnapshot`, `ResultsInput` from Task 2; `standings`, `weightedTotal` from `@/lib/impact-lab/judging`.
- Produces: `POST /api/admin/impact-lab/results/publish` with `{cohort?: string, announcedTeamIds: string[], confirm: string}` → `{success: true, data: {publishedAt: string, recipients: number}}`.

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/impact-lab/results/publish/route.ts`.

Header comment:

```ts
/**
 * Mark final. A one-way door.
 *
 * Closes submissions and judging, computes the snapshot, and queues one row per
 * recipient — all inside one row-locked transaction, so a second click cannot
 * publish twice or queue a second set of emails.
 *
 * Everything participants see afterwards is served from the stored snapshot and
 * never recomputed. This matters concretely: one team edited its submission a
 * full day after being judged, so live data demonstrably moves after the fact.
 * What 93 people are told must not move with it.
 */
```

Requirements, in order inside `prisma.$transaction`:

1. `await tx.$queryRaw\`SELECT id FROM impact_lab_match_runs WHERE id = ${run.id} FOR UPDATE\`` — the same row-locking pattern used by the roster and leader routes.
2. Refuse with 409 if `resultsPublishedAt` is already set.
3. Refuse with 409 if any team with a submission has no `ImpactLabScore` row, naming them. This is what stops the four unscored teams being published as blanks.
4. Refuse with 400 if `announcedTeamIds` contains an id not present in the run's teams, or has duplicates.
5. Build `ResultsInput`: `standings()` over all scores; `teams` from the run JSON with `track` via `trackOf(team.name)` and `projectName` from the submission; `writeupOnly` from score rows where every row for that team has `writeupOnly: true`; `range` from min and max `weightedTotal` per team.
6. Update the run: `submissionsCloseAt` (only if currently null), `judgingClosedAt`, `resultsPublishedAt`, `announcedWinners`, `resultsSnapshot`.
7. `createMany` one `ImpactLabResultsEmail` per recipient with `skipDuplicates: true`. Recipients are participants whose id appears in `memberIds` of a team that has a submission — the 93.

Require `confirm === "PUBLISH"` in the body before any of this runs; a typed confirmation is cheap insurance on a one-way door.

- [ ] **Step 2: Add the publish panel**

In `ResultsTab.tsx`, add a second section below the writeup review:

- A preview of exactly what will be published: the three announced winners, the five track winners, and the full ranking by position only — no scores, matching what participants will see.
- The recipient count.
- A text input requiring the word `PUBLISH`.
- The button, disabled while any submitted team still lacks a score, with the reason shown.
- Once published: the panel switches to a summary showing the publish time and the recipient count, with the button gone.

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 4: Verify the refusals before verifying success**

With `npm run dev` running and **before** the four teams are scored, attempt to publish.
Expected: 409, naming kilimoeco, OnlyFarmers, ChatBook and Biashara. Do not proceed past this until that refusal works — it is the guard that prevents publishing blanks.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/impact-lab/results/ src/components/admin/impact-lab/ResultsTab.tsx
git commit -m "feat(impact-lab): publish results with lock and snapshot"
```

---

### Task 8: Participant results view

**Files:**
- Create: `src/app/api/impact-lab/results/route.ts`
- Create: `src/app/dashboard/impact-lab/ResultsView.tsx`
- Modify: `src/app/dashboard/impact-lab/ImpactLabClient.tsx`

**Interfaces:**
- Consumes: `checkMemberAccess` from `@/lib/impact-lab/member`; `ResultsSnapshot` from Task 2.
- Produces: `GET /api/impact-lab/results` → flat member shape
  `{success: true, published: boolean, results?: {publishedAt, overall, trackWinners, ranking}, yourTeam?: {teamId, projectName, card: TeamCard}}`

- [ ] **Step 1: Write the route**

Create `src/app/api/impact-lab/results/route.ts`. Guard order: rate limit → `checkMemberAccess()`. No CSRF — it is a GET.

It must:
- Return `{success: true, published: false}` when `resultsPublishedAt` is null. Never leak an unpublished snapshot.
- Read `resultsSnapshot` and serve `overall`, `trackWinners` and `ranking` as stored.
- Find the caller's participant row by lowercased email, find which team's `memberIds` contains that id, and attach **only that team's** entry from `perTeam`.
- **Never send the whole `perTeam` map.** Strip it explicitly rather than relying on the shape.

Add this above the handler:

```ts
/**
 * The published result, for one participant.
 *
 * `perTeam` holds every team's private card, so the whole map must never reach
 * the client — only the caller's own entry is attached. Judge counts and judge
 * identities are absent from the snapshot by construction, so there is nothing
 * to strip there.
 */
```

- [ ] **Step 2: Assert the payload is minimal**

Add to `scripts/verify-results.ts`, before the final summary:

```ts
console.log("\nMember payload")
// Mirrors what the member route attaches: one card, never the map.
const memberPayload = {
  results: {
    publishedAt: snap.publishedAt,
    overall: snap.overall,
    trackWinners: snap.trackWinners,
    ranking: snap.ranking,
  },
  yourTeam: { teamId: "t-vilcare", card: snap.perTeam["t-vilcare"] },
}
const memberJson = JSON.stringify(memberPayload)
assert(!memberJson.includes("perTeam"), "the member payload never carries the perTeam map")
assert(
  !memberJson.includes("t-whatsy\":{"),
  "the member payload never carries another team's card"
)
assert(!memberJson.includes("judgeCount"), "the member payload never carries a judge count")
```

Run: `npm run verify:results`
Expected: `ALL CHECKS PASSED`.

- [ ] **Step 3: Build the view**

Create `src/app/dashboard/impact-lab/ResultsView.tsx`, following `TeamReveal.tsx` for persona handling and motion conventions.

Four sections in order:

1. **Winners** — champion largest, then 2nd and 3rd, then the five track winners. Real hierarchy, not a bulleted list.
2. **Your team** — the five criterion scores as filled meters against the 1–5 scale, the range across judges, your position. For a `basis: "submission"` team, show exactly this copy and nothing that implies fault or apology:

   > Your project was reviewed from your written submission against the same five criteria. A live demo was not part of that review, which is noted against the demo criterion below.

3. **Full ranking** — position, project, track. **No numeric scores. No judge counts.** The viewer's own row is visually marked so they can find themselves. Wrap the table in its own `overflow-x-auto` container so the page body never scrolls sideways at 320px.
4. **The note** — verbatim from the spec's "The note, in full" section. Copy it exactly; do not paraphrase.

- [ ] **Step 4: Wire the phase**

In `ImpactLabClient.tsx`:
- Extend the `Phase` union on line 37 with `| "results"`.
- Add `fetch("/api/impact-lab/results")` to the existing `Promise.all` in the effect.
- When the response has `published: true`, set phase to `results` — it takes precedence over `revealed`.
- Render `<ResultsView … />` for that phase.

The effect's dependency array is `[reloadKey]`; leave that alone.

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 6: Verify what a participant actually receives**

With `npm run dev` running and results published locally, sign in as a member of a scored team and run in the browser console:

```js
fetch("/api/impact-lab/results").then(r => r.json()).then(d => {
  const s = JSON.stringify(d)
  console.log("perTeam leaked:", s.includes("perTeam"))
  console.log("judgeCount leaked:", s.includes("judgeCount"))
  console.log("judge identity leaked:", /judge(Name|Email)/.test(s))
  console.log("teams with cards:", d.yourTeam ? 1 : 0)
})
```

Expected: three `false` and `1`. Any `true` is a privacy defect — stop and fix before continuing.

Then check the page at 320px width: no horizontal scroll on the body, and the ranking scrolls inside its own container.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/impact-lab/results/ src/app/dashboard/impact-lab/ResultsView.tsx src/app/dashboard/impact-lab/ImpactLabClient.tsx scripts/verify-results.ts
git commit -m "feat(impact-lab): participant results view"
```

---

### Task 9: The results email

**Files:**
- Modify: `src/lib/email.ts`
- Create: `src/app/api/admin/impact-lab/results/notify/route.ts`
- Modify: `src/components/admin/impact-lab/ResultsTab.tsx`

**Interfaces:**
- Consumes: `ImpactLabResultsEmail` from Task 1; the published snapshot from Task 7.
- Produces:
  - `export async function sendEmailBatchTracked(items: BatchEmailItem[]): Promise<{to: string; ok: boolean; error?: string}[]>`
  - `export function impactLabResultsEmail(data: {…}): {subject: string; html: string}`
  - `POST /api/admin/impact-lab/results/notify` with `{cohort?: string}` → `{success: true, data: {sent: number, failed: number, remaining: number}}`

- [ ] **Step 1: Add the tracked batch sender**

In `src/lib/email.ts`, after the existing `sendEmailBatch`:

```ts
/**
 * Batch send that reports per recipient rather than per chunk.
 *
 * `sendEmailBatch` returns only totals, which is not enough to record who was
 * actually reached — and without that, a retry re-sends to everyone. Resend's
 * quota is 100/day against 93 recipients, so a blind retry blows the quota and
 * double-mails the people it already reached.
 *
 * Chunks of 25 rather than the API ceiling of 100: if a chunk is rejected we
 * can only mark that chunk failed, so a smaller chunk loses less certainty.
 */
export async function sendEmailBatchTracked(
  items: BatchEmailItem[]
): Promise<{ to: string; ok: boolean; error?: string }[]> {
  if (items.length === 0) return []

  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not configured, batch not sent")
    return items.map((item) => ({
      to: item.to,
      ok: false,
      error: "RESEND_API_KEY not configured",
    }))
  }

  const from = `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`
  const results: { to: string; ok: boolean; error?: string }[] = []

  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    try {
      const { error } = await getResend().batch.send(
        chunk.map((item) => ({
          from,
          to: [item.to],
          subject: item.subject,
          html: item.html,
          text: stripHtml(item.html),
        }))
      )
      const message = error ? error.message : undefined
      for (const item of chunk) {
        results.push({ to: item.to, ok: !error, error: message })
      }
      if (error) console.error("[EMAIL] Batch chunk rejected:", error)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown send failure"
      console.error("[EMAIL] Batch chunk failed:", err)
      for (const item of chunk) results.push({ to: item.to, ok: false, error: message })
    }
  }

  return results
}
```

- [ ] **Step 2: Add the template**

In `src/lib/email.ts`, next to `impactLabAccountEmail`, add `impactLabResultsEmail` taking `{fullName, projectName, rank, criterionAverages, low, high, basis, overall, trackWinners, dashboardUrl}` and returning `{subject, html}`.

Content requirements:
- The three overall winners and the five track winners.
- The recipient team's own five scores and its position.
- The short form of the note.
- A link to the dashboard.
- For `basis: "submission"`, the submission-review sentence from the spec.

Constraints: table-based HTML with inline styles (email clients ignore `<style>` blocks and Tailwind entirely — this is the one place inline styles are correct), no web fonts, no external images, readable on a dark background. **No judge counts. No deadline language.** The email must stand alone, because nine recipients have no account and cannot open the dashboard.

- [ ] **Step 3: Write the notify route**

Create `src/app/api/admin/impact-lab/results/notify/route.ts`.

```ts
/**
 * Send the results email, resumably.
 *
 * Processes at most BATCH_SIZE unsent recipients per call and reports how many
 * remain; the admin UI calls it until zero. That keeps each invocation inside
 * the function timeout and makes a timeout harmless — the next call picks up
 * exactly where this one stopped, because progress lives in the database rather
 * than in the request.
 *
 * Only rows with status <> 'sent' are selected, so no recipient is ever mailed
 * twice however many times this is called.
 */
export const maxDuration = 300

const BATCH_SIZE = 25
```

Requirements:
- Guard: `withCsrfProtection` → `checkApiPermission("impact-lab", "edit")`.
- Refuse with 409 if `resultsPublishedAt` is null — nothing may be sent before it is published.
- Select up to `BATCH_SIZE` rows where `runId` matches and `status !== "sent"`.
- Build each email from the stored snapshot, never from live data.
- Call `sendEmailBatchTracked`, then update each row to `sent` with `sentAt`, or `failed` with the error.
- Return `{sent, failed, remaining}` where `remaining` counts rows still not `sent`.

- [ ] **Step 4: Add the send panel**

In `ResultsTab.tsx`, add a third section, visible only once published:

- Counts: queued, sent, failed.
- A **Send next 25** button that calls the route and refreshes the counts.
- A **Send to one address first** input that sends a single test before the batch.
- A visible warning: *"Resend allows 100 emails per day. There are 93 recipients — one clean run fits, a repeated run does not."*

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 6: Verify idempotency without sending**

Temporarily unset `RESEND_API_KEY` in `.env.local` and restart the dev server. `sendEmailBatchTracked` now returns every item as failed without contacting Resend.

Press **Send next 25**. Expected: `sent: 0, failed: 25`, and 25 rows at `status: "failed"`.

Press it again. Expected: it retries those same 25 — failed rows are eligible — and does not touch the other 68.

Now set one row to `sent` by hand in a scratch database and press again. Expected: that row is skipped and `remaining` drops by one.

Restore `RESEND_API_KEY` afterwards.

- [ ] **Step 7: Send one real test before any batch**

With `RESEND_API_KEY` restored, use **Send to one address first** to mail yourself. Read it on a phone and on desktop, in both light and dark mode. Confirm: winners correct, your team's scores correct, no judge counts, no deadline language, the dashboard link resolves, and the plain-text alternative is readable.

- [ ] **Step 8: Commit**

```bash
git add src/lib/email.ts src/app/api/admin/impact-lab/results/notify/ src/components/admin/impact-lab/ResultsTab.tsx
git commit -m "feat(impact-lab): results email with resumable idempotent send"
```

---

### Task 10: Full-path verification before production

**Files:** none created — this is the gate before the migration reaches production.

- [ ] **Step 1: Run every check**

```bash
npm run verify:judging && npm run verify:results && npx tsc --noEmit && npm run build && npx eslint src --max-warnings 0
```

Expected: all five clean. Do not continue past any failure.

- [ ] **Step 2: Walk the whole path locally**

Against a scratch database seeded from a production dump — never against production:

1. Judges tab shows four judges with means spanning roughly 48 to 72.
2. Exclusion preview moves BiasharaGPT above Whatsy when Savannah is excluded, and writes nothing.
3. Results tab lists exactly four unscored teams; draft and save one.
4. Publish is refused while three remain unscored, naming them.
5. Score the remaining three, then publish. Verify `resultsPublishedAt`, `judgingClosedAt` and `submissionsCloseAt` are all set and `resultsSnapshot` is populated.
6. Attempt a score write via the judging POST. Expected: 409 `JUDGING_CLOSED`.
7. Attempt to publish again. Expected: 409.
8. Sign in as a member of a scored team, a member of a submission-reviewed team, and a participant on a team that never submitted. Confirm each sees the right thing and no one sees another team's card.
9. Confirm the ranking shows no numeric scores and no judge counts.

- [ ] **Step 3: Confirm the target database before migrating**

Run: `npx prisma migrate status`

Confirm from the output which database you are pointed at. A local `.env` has previously pointed at a stale Supabase instance rather than the production VPS; migrating the wrong database is the failure mode this step exists to prevent. If there is any doubt, stop and ask.

- [ ] **Step 4: Apply to production and verify**

Only after Step 3 is unambiguous, apply the migration to production, then verify the three new columns and the new table exist before any publish is attempted from the live admin panel.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(impact-lab): address issues found in full-path verification"
```

Note: `scripts/output/` is gitignored and must stay that way — it has previously held participant names and database ids, and this is a public repository. Run `git status` before `git add -A` and confirm nothing under `scripts/output/` or any CSV of participant data is staged.

---

## Self-Review

**Spec coverage:** Every section of the spec maps to a task — schema to 1, computation to 2, judging lock to 3, judge audit to 4, exclusion preview to 5, writeup scoring to 6, publish to 7, participant view and copy to 8, email to 9, verification to 10.

**Two spec items deliberately reshaped during planning, both recorded here rather than silently dropped:**

1. The spec says per-recipient status is written "from the per-row result". `sendEmailBatch` returns only `{sent, failed}`, so that was not achievable as written. Task 9 adds `sendEmailBatchTracked` with 25-item chunks and per-recipient results.
2. The spec's snapshot had a `table` field with an `unscored` flag. Renamed to `ranking`, and `unscored` removed — publish refuses while any submitted team lacks a score, so the state cannot occur.

**Out of scope and unchanged:** score normalisation, automatic track winners from `trackWinners()` alone, any write path from exclusion preview to published output, and unsubscribe infrastructure — the last is a real gap, recorded in the spec, and should be built before any future cohort mailing.
