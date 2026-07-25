# Impact Lab Project Submissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a hackathon team submit one project entry from their dashboard, and let organisers see who has and hasn't submitted and download every submission as a CSV for judging.

**Architecture:** One new table keyed on `(runId, teamId)` — there is no team entity in this database, teams exist only inside `ImpactLabMatchRun.result` JSON. Both member routes resolve the caller's run and team **server-side from their session email**, so the client never sends a team identifier and cannot submit for another team. All testable logic lives in two pure modules verified by a script; routes and UI are covered by gates plus a manual checklist.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma 7 + PostgreSQL (VPS, via PgBouncer), zod, Tailwind v4, framer-motion, `tsx` for scripts.

**Spec:** `docs/superpowers/specs/2026-07-25-impact-lab-submissions-design.md`

**Branch:** `feat/impact-lab-submissions` (off `main` @ 148c755)

## Global Constraints

- TypeScript strict. **Never use `any`.** No `.js` files in `src/`.
- No new dependencies.
- **No file uploads.** Slides and screenshots are links (`slidesUrl`, `screenshotUrl`). Storage is a public bucket with unverified production status and Vercel caps request bodies ~4.5MB.
- Reuse `toCsv` from `src/lib/impact-lab/csv.ts` — the only CSV builder; it already escapes formula-injection prefixes. Do not write another.
- Reuse the `ApplicationStatus` enum. Do not mint a new status enum.
- Arrays use native Postgres `String[]`, never `Json` (Impact Lab convention).
- Member write routes use this exact order: **CSRF → rate limit → auth → validation** (see `src/app/api/impact-lab/profile/route.ts:36-65`).
- Member API responses are **flat** (`{ success, status, … }`), not the admin `{ success, data }` envelope.
- Client mutations use `csrfHeaders()` from `@/lib/csrf-client`. Do **not** hand-roll a token fetch in `useEffect` (the pattern in `MatchProfileForm.tsx:42-47` is a known anti-pattern here).
- Admin panel UI uses hardcoded hex (`#0d0d0d`, `#1e1e1e`, `#00ff41`, `#888`, `#555`, `#ff3333`, `#ffb000`). The member dashboard uses Tailwind theme tokens (`bg-bg-card`, `text-text-primary`, `border-border-default`, `text-green-primary`). Match whichever side you are editing.
- All motion respects `prefers-reduced-motion` (`useReducedMotion` from framer-motion).
- Copy is plain English. No Swahili in user-facing copy (standing project rule).
- Gates before every commit: `npx tsc --noEmit`, `npx eslint <touched files>`, and for the final task `npm run build`.

## File Structure

**Create:**
| File | Responsibility |
|---|---|
| `prisma/migrations/20260725180000_impact_lab_submissions/migration.sql` | New table + `submissionsCloseAt` column + FK |
| `src/lib/impact-lab/submission-schema.ts` | zod input schema, `SubmissionView` type, sanitising transforms |
| `src/lib/impact-lab/submission-state.ts` | Pure logic: window state, team lookup, missing-team list, CSV headers/rows |
| `scripts/verify-submissions.ts` | Assertion harness for both pure modules |
| `src/app/api/impact-lab/submission/route.ts` | Member GET + PUT |
| `src/app/api/admin/impact-lab/submissions/route.ts` | Admin list + missing teams |
| `src/app/api/admin/impact-lab/submissions/[id]/route.ts` | Admin status PATCH |
| `src/app/api/admin/impact-lab/submissions/export/route.ts` | Judging CSV |
| `src/app/dashboard/impact-lab/SubmitProject.tsx` | Member submit form section |
| `src/components/admin/impact-lab/SubmissionsTab.tsx` | Admin fourth tab |

**Modify:**
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ImpactLabSubmission`; add `submissionsCloseAt` + `submissions` to `ImpactLabMatchRun` |
| `package.json` | Add `verify:submissions` script |
| `src/app/api/admin/impact-lab/runs/[id]/route.ts` | Accept `submissionsCloseAt` in PATCH |
| `src/app/dashboard/impact-lab/TeamReveal.tsx` | Render `<SubmitProject />` below the team |
| `src/components/admin/impact-lab/ImpactLabDashboard.tsx` | Register the `submissions` tab |
| `docs/impact-lab/12-admin-ui.md` | "Three tabs" → four |
| `docs/impact-lab/README.md` | Add the new doc row |
| `docs/impact-lab/14-submissions.md` (create) | Document the submission flow |

---

### Task 1: Database shape

**Files:**
- Modify: `prisma/schema.prisma` (append model near `ImpactLabMatchRun` at ~`:691-717`)
- Create: `prisma/migrations/20260725180000_impact_lab_submissions/migration.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma model `ImpactLabSubmission` and field `ImpactLabMatchRun.submissionsCloseAt: Date | null`, both used by every later task via `prisma.impactLabSubmission` and `run.submissionsCloseAt`.

- [ ] **Step 1: Add the model to the schema**

Append after the `ImpactLabMatchRun` model in `prisma/schema.prisma`:

```prisma
/// One project submission per team, for the run that published those teams.
/// Teams have no table of their own — they live inside ImpactLabMatchRun.result
/// JSON — so `teamId` is the id from that JSON and cannot be a foreign key.
/// Any member of the team may create or edit the row until the run's
/// submissionsCloseAt passes.
model ImpactLabSubmission {
  id                String            @id @default(cuid())
  cohort            String
  runId             String
  teamId            String
  /// Denormalised so exports stay readable without re-parsing the run JSON.
  teamName          String
  projectName       String
  pitch             String
  description       String            @db.Text
  worksVsMocked     String            @db.Text
  claudeUsage       String            @db.Text
  track             String
  problemTackled    String
  repoUrl           String
  demoUrl           String?
  videoUrl          String?
  /// Link to a deck (Drive/Figma/etc). Never an uploaded file — see the spec.
  slidesUrl         String?
  screenshotUrl     String?
  status            ApplicationStatus @default(PENDING)
  createdByEmail    String
  lastEditedByEmail String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  run ImpactLabMatchRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@unique([runId, teamId])
  @@index([cohort, status])
  @@map("impact_lab_submissions")
}
```

- [ ] **Step 2: Add the run-side fields**

In the `ImpactLabMatchRun` model, after the `explanations` field, add:

```prisma
  /// Submission window for the teams this run published. Null = open with no
  /// deadline. Editable by an organiser so a slipped demo slot needs a field
  /// change, not a database edit.
  submissionsCloseAt   DateTime?
  submissions          ImpactLabSubmission[]
```

- [ ] **Step 3: Write the migration SQL**

Create `prisma/migrations/20260725180000_impact_lab_submissions/migration.sql`:

```sql
-- Team project submissions for Impact Lab, plus the submission window on the
-- run that published the teams. Additive and nullable, so this is safe to apply
-- to production ahead of the code deploy.
CREATE TABLE "impact_lab_submissions" (
    "id" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "worksVsMocked" TEXT NOT NULL,
    "claudeUsage" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "problemTackled" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "demoUrl" TEXT,
    "videoUrl" TEXT,
    "slidesUrl" TEXT,
    "screenshotUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdByEmail" TEXT NOT NULL,
    "lastEditedByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_lab_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impact_lab_submissions_runId_teamId_key"
    ON "impact_lab_submissions"("runId", "teamId");

CREATE INDEX "impact_lab_submissions_cohort_status_idx"
    ON "impact_lab_submissions"("cohort", "status");

ALTER TABLE "impact_lab_submissions"
    ADD CONSTRAINT "impact_lab_submissions_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "impact_lab_match_runs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "impact_lab_match_runs" ADD COLUMN "submissionsCloseAt" TIMESTAMP(3);
```

- [ ] **Step 4: Validate and generate**

Run: `npx prisma validate && npx prisma generate`
Expected: "The schema at prisma\schema.prisma is valid" then "Generated Prisma Client".

- [ ] **Step 5: Confirm the client exposes the new model**

Run: `npx tsc --noEmit`
Expected: exit 0. (Nothing references the model yet; this proves generation succeeded and the schema compiles.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260725180000_impact_lab_submissions/
git commit -m "feat(impact-lab): add ImpactLabSubmission model + submission window

One submission per team, keyed (runId, teamId) with a unique constraint —
teams have no table, they live inside the run's result JSON, so teamId
cannot be a foreign key. submissionsCloseAt lives on the run because one
final run is one published set of teams, therefore one window.

Additive and nullable: safe to apply to production before the code deploy."
```

---

### Task 2: Pure logic + verification harness

**Files:**
- Create: `src/lib/impact-lab/submission-state.ts`
- Create: `src/lib/impact-lab/submission-schema.ts`
- Create: `scripts/verify-submissions.ts`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: `Team` type from `@/lib/matching`; `CsvCell` from `@/lib/impact-lab/csv`; sanitising transforms from `@/lib/input-sanitization`.
- Produces (used by Tasks 3–7):
  - `submissionWindow(closeAt: Date | null, now: Date): "open" | "closed"`
  - `findTeamFor(teams: Team[], participantId: string): TeamRef | null` where `TeamRef = { teamId: string; teamName: string }`
  - `missingTeams(teams: Team[], submittedTeamIds: Set<string>, nameById: Map<string, string>): MissingTeam[]` where `MissingTeam = { teamId: string; teamName: string; members: string[] }`
  - `SUBMISSION_CSV_HEADERS: string[]`
  - `submissionCsvRow(input: SubmissionCsvInput): CsvCell[]`
  - `submissionInputSchema` (zod) and `type SubmissionInput = z.infer<typeof submissionInputSchema>`
  - `type SubmissionView`

- [ ] **Step 1: Write the failing verification harness**

Create `scripts/verify-submissions.ts`:

```ts
/**
 * Impact Lab submissions — verification harness.
 *
 * This repo has no unit-test framework; scripts/verify-matching.ts is the
 * established pattern. This script asserts the pure logic behind submissions:
 * window state, team resolution, the missing-team list, CSV row shape, and
 * input validation. Routes and UI are covered by the manual checklist in the
 * spec.
 *
 * Run with: npm run verify:submissions
 * Exits 0 on success, 1 on any failed assertion.
 */

import type { Team } from "../src/lib/matching"
import {
  SUBMISSION_CSV_HEADERS,
  findTeamFor,
  missingTeams,
  submissionCsvRow,
  submissionWindow,
} from "../src/lib/impact-lab/submission-state"
import { submissionInputSchema } from "../src/lib/impact-lab/submission-schema"

let failures = 0
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
  } else {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

function team(id: string, name: string, memberIds: string[]): Team {
  return {
    id,
    name,
    memberIds,
    locked: false,
    score: { total: 0, dimensions: [], penalties: [], penaltyTotal: 0 },
  }
}

const TEAMS: Team[] = [
  team("team-1", "Team 1", ["p1", "p2"]),
  team("team-2", "Team 2", ["p3"]),
]

console.log("Impact Lab submissions — verification\n")

console.log("Submission window")
const now = new Date("2026-07-26T06:00:00Z")
assert(submissionWindow(null, now) === "open", "no deadline set means open")
assert(
  submissionWindow(new Date("2026-07-26T07:00:00Z"), now) === "open",
  "deadline in the future means open"
)
assert(
  submissionWindow(new Date("2026-07-26T05:59:59Z"), now) === "closed",
  "deadline in the past means closed"
)
assert(
  submissionWindow(new Date("2026-07-26T06:00:00Z"), now) === "closed",
  "deadline exactly now means closed (boundary is inclusive)"
)

console.log("\nTeam resolution")
assert(findTeamFor(TEAMS, "p2")?.teamId === "team-1", "member resolves to their team")
assert(findTeamFor(TEAMS, "p2")?.teamName === "Team 1", "resolution carries the team name")
assert(findTeamFor(TEAMS, "p3")?.teamId === "team-2", "second team resolves correctly")
assert(findTeamFor(TEAMS, "nobody") === null, "unassigned participant resolves to null")
assert(findTeamFor([], "p1") === null, "empty team list resolves to null")

console.log("\nMissing teams")
const names = new Map([
  ["p1", "Amina"],
  ["p2", "Brian"],
  ["p3", "Cynthia"],
])
const missing = missingTeams(TEAMS, new Set(["team-1"]), names)
assert(missing.length === 1, "a team that submitted is excluded")
assert(missing[0].teamId === "team-2", "the team that did not submit is listed")
assert(
  JSON.stringify(missing[0].members) === JSON.stringify(["Cynthia"]),
  "missing team carries member names for chasing"
)
const allMissing = missingTeams(TEAMS, new Set(), names)
assert(allMissing.length === 2, "no submissions means every team is missing")
assert(
  JSON.stringify(missingTeams(TEAMS, new Set(), new Map())[0].members) ===
    JSON.stringify(["p1", "p2"]),
  "an unknown participant id falls back to the raw id"
)

console.log("\nCSV row")
const row = submissionCsvRow({
  teamName: "Team 1",
  projectName: "Clinic Queue",
  pitch: "=SUM(A1:A9)",
  track: "afya (health)",
  problemTackled: "Queue times",
  description: "Long text",
  worksVsMocked: "Login works; payments mocked",
  claudeUsage: "Claude Code wrote the API",
  repoUrl: "https://github.com/x/y",
  demoUrl: null,
  videoUrl: null,
  slidesUrl: null,
  screenshotUrl: null,
  status: "PENDING",
  memberNames: ["Amina", "Brian"],
  memberEmails: ["amina@x.io"],
  lastEditedByEmail: "brian@x.io",
  updatedAt: new Date("2026-07-26T05:47:00Z"),
})
assert(
  row.length === SUBMISSION_CSV_HEADERS.length,
  "row width matches the header width"
)
assert(row[0] === "Team 1", "first column is the team name")
assert(
  row.includes("Amina; Brian"),
  "member names are joined with '; ' like other exports"
)
assert(
  typeof row[row.length - 1] === "string" &&
    String(row[row.length - 1]).startsWith("2026-07-26"),
  "last column is an ISO timestamp"
)

console.log("\nInput validation")
const validInput = {
  projectName: "Clinic Queue",
  pitch: "Cuts clinic waiting time with SMS triage",
  description: "A".repeat(50),
  worksVsMocked: "Login works, payments mocked",
  claudeUsage: "Claude Code scaffolded the API",
  track: "afya (health)",
  problemTackled: "Queue times in Kibera",
  repoUrl: "github.com/x/y",
  demoUrl: "",
  videoUrl: "",
  slidesUrl: "",
  screenshotUrl: "",
}
const ok = submissionInputSchema.safeParse(validInput)
assert(ok.success, "a complete valid submission parses")
assert(
  ok.success && ok.data.repoUrl === "https://github.com/x/y",
  "a bare domain is normalised to https://"
)
assert(
  ok.success && ok.data.demoUrl === null,
  "an empty optional URL becomes null"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, projectName: "" }).success,
  "an empty project name is rejected"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, repoUrl: "" }).success,
  "a missing repo URL is rejected"
)
assert(
  !submissionInputSchema.safeParse({
    ...validInput,
    repoUrl: "javascript:alert(1)",
  }).success,
  "a javascript: URL is rejected rather than silently emptied"
)
assert(
  !submissionInputSchema.safeParse({ ...validInput, pitch: "x".repeat(300) })
    .success,
  "an over-long pitch is rejected"
)

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
```

- [ ] **Step 2: Add the script and run it to verify it fails**

In `package.json`, in `"scripts"`, after the `verify:matching` line, add:

```json
    "verify:submissions": "tsx scripts/verify-submissions.ts",
```

Run: `npm run verify:submissions`
Expected: FAIL — module not found for `submission-state` / `submission-schema`.

- [ ] **Step 3: Implement the pure state module**

Create `src/lib/impact-lab/submission-state.ts`:

```ts
/**
 * Pure logic behind Impact Lab project submissions: whether the window is
 * open, which team a participant belongs to, which teams still owe a
 * submission, and the judging CSV row shape.
 *
 * Deliberately free of Prisma, Next and the clock — every function takes what
 * it needs as an argument, so scripts/verify-submissions.ts can assert all of
 * it without a database.
 */

import type { Team } from "@/lib/matching"
import type { CsvCell } from "@/lib/impact-lab/csv"

export type SubmissionWindowState = "open" | "closed"

export interface TeamRef {
  teamId: string
  teamName: string
}

export interface MissingTeam {
  teamId: string
  teamName: string
  /** Display names where known, raw participant ids otherwise. */
  members: string[]
}

/**
 * Is the submission window open? A null deadline means open indefinitely. The
 * boundary is inclusive: at exactly the deadline, submissions are closed.
 */
export function submissionWindow(
  closeAt: Date | null,
  now: Date
): SubmissionWindowState {
  if (!closeAt) return "open"
  return now.getTime() >= closeAt.getTime() ? "closed" : "open"
}

/** The team holding this participant, or null when they are unassigned. */
export function findTeamFor(teams: Team[], participantId: string): TeamRef | null {
  const found = teams.find((t) => t.memberIds.includes(participantId))
  return found ? { teamId: found.id, teamName: found.name } : null
}

/**
 * Teams with no submission yet, with member names so organisers can chase them
 * in the room. Unknown ids fall back to the raw id rather than being dropped —
 * a missing name must never hide a missing team.
 */
export function missingTeams(
  teams: Team[],
  submittedTeamIds: Set<string>,
  nameById: Map<string, string>
): MissingTeam[] {
  return teams
    .filter((t) => !submittedTeamIds.has(t.id))
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      members: t.memberIds.map((id) => nameById.get(id) ?? id),
    }))
}

export interface SubmissionCsvInput {
  teamName: string
  projectName: string
  pitch: string
  track: string
  problemTackled: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
  screenshotUrl: string | null
  status: string
  memberNames: string[]
  /** Only teammates whose live row consents to sharing contact. */
  memberEmails: string[]
  lastEditedByEmail: string
  updatedAt: Date
}

export const SUBMISSION_CSV_HEADERS: string[] = [
  "Team",
  "Project",
  "Pitch",
  "Track",
  "Problem",
  "Description",
  "What works vs mocked",
  "How they used Claude",
  "Repo",
  "Demo",
  "Video",
  "Slides",
  "Screenshot",
  "Status",
  "Members",
  "Member emails (consented)",
  "Last edited by",
  "Last updated",
]

/**
 * One judging row. Multi-values join with "; " to match the participants and
 * teams exports. Formula-injection escaping is toCsv's job, not this
 * function's — a pitch of "=SUM(A1:A9)" passes through unchanged here.
 */
export function submissionCsvRow(input: SubmissionCsvInput): CsvCell[] {
  return [
    input.teamName,
    input.projectName,
    input.pitch,
    input.track,
    input.problemTackled,
    input.description,
    input.worksVsMocked,
    input.claudeUsage,
    input.repoUrl,
    input.demoUrl ?? "",
    input.videoUrl ?? "",
    input.slidesUrl ?? "",
    input.screenshotUrl ?? "",
    input.status,
    input.memberNames.join("; "),
    input.memberEmails.join("; "),
    input.lastEditedByEmail,
    input.updatedAt.toISOString(),
  ]
}
```

- [ ] **Step 4: Implement the schema module**

Create `src/lib/impact-lab/submission-schema.ts`:

```ts
/**
 * Validation for a team's project submission.
 *
 * URLs get the scheme they were typed without ("github.com/x" becomes
 * "https://github.com/x") and are then sanitised. zodSanitizeUrl returns ""
 * for a rejected scheme rather than throwing, so every URL field refines on
 * non-empty afterwards — otherwise "javascript:alert(1)" would be stored
 * silently as an empty string instead of being reported to the submitter.
 */

import { z } from "zod"
import {
  zodSanitizeMultilineText,
  zodSanitizeString,
  zodSanitizeUrl,
} from "@/lib/input-sanitization"

const MAX_LONG_TEXT = 2000

/** Adds https:// when a scheme is absent; leaves empty input untouched. */
function withScheme(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const requiredUrl = z
  .string()
  .max(300)
  .transform(withScheme)
  .refine((v) => v !== "", { message: "A link is required" })
  .transform(zodSanitizeUrl)
  .refine((v) => v !== "", { message: "That link is not a valid http(s) URL" })

// Empty input becomes null; anything supplied must survive sanitisation, so a
// rejected scheme surfaces as a validation error instead of a silent null.
const optionalUrl = z
  .string()
  .max(300)
  .optional()
  .transform((v) => withScheme(v ?? ""))
  .transform((v) => (v === "" ? null : zodSanitizeUrl(v)))
  .refine((v) => v !== "", { message: "That link is not a valid http(s) URL" })

export const submissionInputSchema = z.object({
  projectName: z.string().min(1).max(120).transform(zodSanitizeString),
  pitch: z.string().min(1).max(200).transform(zodSanitizeString),
  description: z
    .string()
    .min(1)
    .max(MAX_LONG_TEXT)
    .transform(zodSanitizeMultilineText(MAX_LONG_TEXT)),
  worksVsMocked: z
    .string()
    .min(1)
    .max(MAX_LONG_TEXT)
    .transform(zodSanitizeMultilineText(MAX_LONG_TEXT)),
  claudeUsage: z
    .string()
    .min(1)
    .max(MAX_LONG_TEXT)
    .transform(zodSanitizeMultilineText(MAX_LONG_TEXT)),
  track: z.string().min(1).max(80).transform(zodSanitizeString),
  problemTackled: z.string().min(1).max(300).transform(zodSanitizeString),
  repoUrl: requiredUrl,
  demoUrl: optionalUrl,
  videoUrl: optionalUrl,
  slidesUrl: optionalUrl,
  screenshotUrl: optionalUrl,
})

export type SubmissionInput = z.infer<typeof submissionInputSchema>

/** What the member GET returns — the form's fields plus who last touched it. */
export interface SubmissionView {
  projectName: string
  pitch: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  track: string
  problemTackled: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
  screenshotUrl: string | null
  /** Teammate display name, resolved from the cohort; email is never exposed. */
  lastEditedByName: string
  updatedAt: string
}
```

- [ ] **Step 5: Run the harness until it passes**

Run: `npm run verify:submissions`
Expected: every line prints `✓` and the script ends with `ALL CHECKS PASSED`.

If the `javascript:` assertion fails, the refine order in `requiredUrl` is wrong — sanitise **then** refine on non-empty.

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/lib/impact-lab/submission-state.ts src/lib/impact-lab/submission-schema.ts scripts/verify-submissions.ts`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/impact-lab/submission-state.ts src/lib/impact-lab/submission-schema.ts scripts/verify-submissions.ts package.json
git commit -m "feat(impact-lab): pure submission logic + verification harness

Window state, team resolution, missing-team list, CSV row shape and input
validation live in two Prisma-free, clock-free modules so they can be
asserted without a database — this repo has no test framework, so
scripts/verify-submissions.ts follows the verify-matching pattern.

URL fields normalise a bare domain to https:// and then refine on
non-empty, because zodSanitizeUrl returns '' for a rejected scheme rather
than throwing: without the refine, javascript:alert(1) would be stored as
an empty string instead of being reported to the submitter."
```

---

### Task 3: Member submission API

**Files:**
- Create: `src/app/api/impact-lab/submission/route.ts`

**Interfaces:**
- Consumes: `submissionWindow`, `findTeamFor` (Task 2); `submissionInputSchema`, `SubmissionView` (Task 2); `checkMemberAccess`, `extractFrozenTeams` from `@/lib/impact-lab/member`; `DEFAULT_COHORT` from `@/lib/impact-lab/constants`; `prisma`; `withCsrfProtection`; `rateLimit`, `RateLimits`.
- Produces: `GET /api/impact-lab/submission` → `{ success: true, status: "no_team" | "open" | "closed", teamName?: string, closeAt?: string | null, submission?: SubmissionView }`; `PUT` same route → `{ success: true, submission: SubmissionView }`. Consumed by Task 5's UI.

- [ ] **Step 1: Write the route**

Create `src/app/api/impact-lab/submission/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  submissionInputSchema,
  type SubmissionView,
} from "@/lib/impact-lab/submission-schema"
import { findTeamFor, submissionWindow } from "@/lib/impact-lab/submission-state"
import type { ImpactLabSubmission } from "@/generated/prisma/client"

/**
 * A team's project submission. The caller's run and team are resolved
 * server-side from their session email on every request — the client never
 * sends a runId or teamId, so nobody can read or write another team's entry.
 */

interface ResolvedContext {
  participantId: string
  runId: string
  teamId: string
  teamName: string
  closeAt: Date | null
}

/** Resolve the caller to a team in the cohort's final run, or null. */
async function resolveContext(email: string): Promise<ResolvedContext | null> {
  const participant = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: DEFAULT_COHORT, email } },
    select: { id: true },
  })
  if (!participant) return null

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: DEFAULT_COHORT, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, submissionsCloseAt: true },
  })
  if (!run) return null

  const teams = extractFrozenTeams(run.result)
  if (!teams) return null

  const teamRef = findTeamFor(teams, participant.id)
  if (!teamRef) return null

  return {
    participantId: participant.id,
    runId: run.id,
    teamId: teamRef.teamId,
    teamName: teamRef.teamName,
    closeAt: run.submissionsCloseAt,
  }
}

/** Display name for whoever last edited, falling back to the email's local part. */
async function lastEditedName(email: string): Promise<string> {
  const row = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: DEFAULT_COHORT, email } },
    select: { fullName: true },
  })
  return row?.fullName ?? email.split("@")[0]
}

async function toView(row: ImpactLabSubmission): Promise<SubmissionView> {
  return {
    projectName: row.projectName,
    pitch: row.pitch,
    description: row.description,
    worksVsMocked: row.worksVsMocked,
    claudeUsage: row.claudeUsage,
    track: row.track,
    problemTackled: row.problemTackled,
    repoUrl: row.repoUrl,
    demoUrl: row.demoUrl,
    videoUrl: row.videoUrl,
    slidesUrl: row.slidesUrl,
    screenshotUrl: row.screenshotUrl,
    lastEditedByName: await lastEditedName(row.lastEditedByEmail),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function GET() {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const context = await resolveContext(check.email)
  if (!context) {
    return NextResponse.json({ success: true, status: "no_team" })
  }

  const existing = await prisma.impactLabSubmission.findUnique({
    where: { runId_teamId: { runId: context.runId, teamId: context.teamId } },
  })

  return NextResponse.json({
    success: true,
    status: submissionWindow(context.closeAt, new Date()),
    teamName: context.teamName,
    closeAt: context.closeAt ? context.closeAt.toISOString() : null,
    submission: existing ? await toView(existing) : undefined,
  })
}

export async function PUT(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // FORM (10/min) rather than a daily cap: a submission is edited repeatedly
  // through the night by different teammates, not filed once.
  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many saves. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const context = await resolveContext(check.email)
  if (!context) {
    return NextResponse.json(
      {
        success: false,
        error: "You are not on a team yet — please speak to an organiser.",
        code: "NO_TEAM",
      },
      { status: 403 }
    )
  }

  if (submissionWindow(context.closeAt, new Date()) === "closed") {
    return NextResponse.json(
      {
        success: false,
        error: "Submissions are closed. Speak to an organiser if you need help.",
        code: "SUBMISSIONS_CLOSED",
      },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const parsed = submissionInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 }
    )
  }

  // cohort, runId, teamId and teamName come from the server's own lookup —
  // never from the request — so a team identifier cannot be forged.
  const saved = await prisma.impactLabSubmission.upsert({
    where: { runId_teamId: { runId: context.runId, teamId: context.teamId } },
    create: {
      ...parsed.data,
      cohort: DEFAULT_COHORT,
      runId: context.runId,
      teamId: context.teamId,
      teamName: context.teamName,
      createdByEmail: check.email,
      lastEditedByEmail: check.email,
    },
    update: {
      ...parsed.data,
      lastEditedByEmail: check.email,
    },
  })

  return NextResponse.json({ success: true, submission: await toView(saved) })
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/impact-lab/submission/route.ts`
Expected: both exit 0. If `runId_teamId` is not a known input, re-run `npx prisma generate` (Task 1 Step 4).

- [ ] **Step 3: Confirm the guard order by reading, not guessing**

Read `src/app/api/impact-lab/profile/route.ts` lines 36-65 and confirm this route's `PUT` follows the same order: CSRF → rate limit → auth → validation. Fix if it drifted.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/impact-lab/submission/route.ts
git commit -m "feat(impact-lab): member submission API (GET + PUT)

Resolves the caller's final run and team server-side from their session
email on every request, so the client never sends a runId or teamId and
cannot read or write another team's submission. Upsert on (runId, teamId)
gives one row per team with last-write-wins between teammates, recording
who created it and who last edited it.

403 NO_TEAM when unassigned, 403 SUBMISSIONS_CLOSED past the run's
deadline. Rate-limited with FORM, not a daily cap: this is edited
repeatedly through the night, not filed once."
```

---

### Task 4: Admin list + status API

**Files:**
- Create: `src/app/api/admin/impact-lab/submissions/route.ts`
- Create: `src/app/api/admin/impact-lab/submissions/[id]/route.ts`

**Interfaces:**
- Consumes: `missingTeams` (Task 2); `checkApiPermission` from `@/lib/rbac`; `safeCohort` from `@/lib/impact-lab/constants`; `extractFrozenTeams`; `logAudit`, `getRequestMetadata`; `withCsrfProtection`.
- Produces: `GET /api/admin/impact-lab/submissions?cohort=` → `{ success: true, data: { submissions: AdminSubmissionRow[], missing: MissingTeam[], teamCount: number, finalRunId: string | null, staleRunIds: string[] } }`; `PATCH /api/admin/impact-lab/submissions/[id]` → `{ success: true, data: { id, status } }`. Consumed by Task 6's tab.

- [ ] **Step 1: Write the list route**

Create `src/app/api/admin/impact-lab/submissions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { missingTeams } from "@/lib/impact-lab/submission-state"

/**
 * Every submission for the cohort's final run, plus the teams that still owe
 * one — the list organisers actually work from on the morning of judging.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = safeCohort(searchParams.get("cohort"))

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, submissionsCloseAt: true },
  })

  const submissions = await prisma.impactLabSubmission.findMany({
    where: { cohort },
    orderBy: { updatedAt: "desc" },
  })

  const teams = run ? (extractFrozenTeams(run.result) ?? []) : []

  // Names for the chase-list come from live participant rows.
  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
    select: { id: true, fullName: true },
  })
  const nameById = new Map(participants.map((p) => [p.id, p.fullName]))

  const forThisRun = run ? submissions.filter((s) => s.runId === run.id) : []
  const submittedTeamIds = new Set(forThisRun.map((s) => s.teamId))

  // Submissions written against an earlier final run are surfaced, not hidden:
  // marking a new run final detaches them from the published teams.
  const staleRunIds = [
    ...new Set(submissions.filter((s) => s.runId !== run?.id).map((s) => s.runId)),
  ]

  return NextResponse.json({
    success: true,
    data: {
      finalRunId: run?.id ?? null,
      closeAt: run?.submissionsCloseAt?.toISOString() ?? null,
      teamCount: teams.length,
      staleRunIds,
      submissions: submissions.map((s) => ({
        id: s.id,
        runId: s.runId,
        teamId: s.teamId,
        teamName: s.teamName,
        projectName: s.projectName,
        pitch: s.pitch,
        description: s.description,
        worksVsMocked: s.worksVsMocked,
        claudeUsage: s.claudeUsage,
        track: s.track,
        problemTackled: s.problemTackled,
        repoUrl: s.repoUrl,
        demoUrl: s.demoUrl,
        videoUrl: s.videoUrl,
        slidesUrl: s.slidesUrl,
        screenshotUrl: s.screenshotUrl,
        status: s.status,
        lastEditedByEmail: s.lastEditedByEmail,
        updatedAt: s.updatedAt.toISOString(),
        isStale: s.runId !== run?.id,
      })),
      missing: missingTeams(teams, submittedTeamIds, nameById),
    },
  })
}
```

- [ ] **Step 2: Write the status route**

Create `src/app/api/admin/impact-lab/submissions/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"

const updateSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
})

/** Move a submission through review. Content is the team's — never edited here. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 })
  }

  const existing = await prisma.impactLabSubmission.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.impactLabSubmission.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "ImpactLabSubmission",
    entityId: id,
    changes: { status: parsed.data.status },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/admin/impact-lab/submissions/route.ts "src/app/api/admin/impact-lab/submissions/[id]/route.ts"`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/impact-lab/submissions/
git commit -m "feat(impact-lab): admin submissions list + review status

The list returns every submission plus the teams that still owe one, with
member names, because chasing the missing teams is the job on judging
morning. Submissions written against an earlier final run are flagged
isStale and their run ids surfaced rather than hidden — marking a new run
final detaches submissions from the published teams, and silence there
would look like lost work.

Status PATCH moves a submission through ApplicationStatus and is audited;
team content is never editable by an organiser."
```

---

### Task 5: Judging CSV export + deadline control

**Files:**
- Create: `src/app/api/admin/impact-lab/submissions/export/route.ts`
- Modify: `src/app/api/admin/impact-lab/runs/[id]/route.ts` (the `updateSchema` and both update paths)

**Interfaces:**
- Consumes: `SUBMISSION_CSV_HEADERS`, `submissionCsvRow` (Task 2); `toCsv` from `@/lib/impact-lab/csv`; `extractFrozenTeams`; `safeCohort`.
- Produces: `GET /api/admin/impact-lab/submissions/export?cohort=` → `text/csv` attachment. `PATCH /api/admin/impact-lab/runs/[id]` additionally accepts `submissionsCloseAt: string | null`.

- [ ] **Step 1: Write the export route**

Create `src/app/api/admin/impact-lab/submissions/export/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import { toCsv } from "@/lib/impact-lab/csv"
import {
  SUBMISSION_CSV_HEADERS,
  submissionCsvRow,
} from "@/lib/impact-lab/submission-state"

/**
 * Judging CSV: one row per submission. Member emails appear only where the
 * live participant row consents to sharing contact — the same rule as the
 * teams export. toCsv escapes formula-injection prefixes.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = safeCohort(searchParams.get("cohort"))

  const submissions = await prisma.impactLabSubmission.findMany({
    where: { cohort },
    orderBy: { teamName: "asc" },
  })

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true },
  })
  const teams = run ? (extractFrozenTeams(run.result) ?? []) : []
  const memberIdsByTeam = new Map(teams.map((t) => [t.id, t.memberIds]))

  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
    select: { id: true, fullName: true, email: true, consentToShareContact: true },
  })
  const byId = new Map(participants.map((p) => [p.id, p]))

  const rows = submissions.map((s) => {
    const memberIds = memberIdsByTeam.get(s.teamId) ?? []
    const members = memberIds.map((id) => byId.get(id)).filter((p) => p !== undefined)
    return submissionCsvRow({
      teamName: s.teamName,
      projectName: s.projectName,
      pitch: s.pitch,
      track: s.track,
      problemTackled: s.problemTackled,
      description: s.description,
      worksVsMocked: s.worksVsMocked,
      claudeUsage: s.claudeUsage,
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl,
      videoUrl: s.videoUrl,
      slidesUrl: s.slidesUrl,
      screenshotUrl: s.screenshotUrl,
      status: s.status,
      memberNames: members.map((p) => p.fullName),
      memberEmails: members.filter((p) => p.consentToShareContact).map((p) => p.email),
      lastEditedByEmail: s.lastEditedByEmail,
      updatedAt: s.updatedAt,
    })
  })

  const csv = toCsv(SUBMISSION_CSV_HEADERS, rows)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="impact-lab-submissions-${cohort}.csv"`,
    },
  })
}
```

- [ ] **Step 2: Extend the run PATCH to carry the deadline**

In `src/app/api/admin/impact-lab/runs/[id]/route.ts`, add to `updateSchema`:

```ts
  /** ISO timestamp, or null to remove the deadline (submissions stay open). */
  submissionsCloseAt: z.string().datetime().nullable().optional(),
```

Destructure it alongside the others:

```ts
  const { name, notes, isFinal, submissionsCloseAt } = validation.data
```

Add this just below that line:

```ts
  const closeAtUpdate =
    submissionsCloseAt === undefined
      ? {}
      : { submissionsCloseAt: submissionsCloseAt ? new Date(submissionsCloseAt) : null }
```

Then spread `...closeAtUpdate` into **both** `prisma.impactLabMatchRun.update` data objects in the file (the `isFinal === true` transaction branch and the `else` branch), immediately after `...explanationsUpdate`.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/admin/impact-lab/submissions/export/route.ts "src/app/api/admin/impact-lab/runs/[id]/route.ts"`
Expected: both exit 0.

- [ ] **Step 4: Prove the CSV escapes a formula**

Run this one-off check (it uses only the pure helpers, no database):

```bash
npx tsx -e "import('./src/lib/impact-lab/csv').then(async ({toCsv})=>{const {SUBMISSION_CSV_HEADERS, submissionCsvRow}=await import('./src/lib/impact-lab/submission-state');const row=submissionCsvRow({teamName:'T',projectName:'P',pitch:'=SUM(A1:A9)',track:'t',problemTackled:'p',description:'d',worksVsMocked:'w',claudeUsage:'c',repoUrl:'https://x.io',demoUrl:null,videoUrl:null,slidesUrl:null,screenshotUrl:null,status:'PENDING',memberNames:['A'],memberEmails:[],lastEditedByEmail:'a@x.io',updatedAt:new Date()});const csv=toCsv(SUBMISSION_CSV_HEADERS,[row]);console.log(csv.split('\n')[1].includes(\"'=SUM\")?'ESCAPED OK':'NOT ESCAPED');})"
```

Expected: `ESCAPED OK`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/impact-lab/submissions/export/ "src/app/api/admin/impact-lab/runs/[id]/route.ts"
git commit -m "feat(impact-lab): judging CSV export + editable submission deadline

Export is one row per submission through the shared toCsv helper, so a
pitch of '=SUM(A1:A9)' lands in Sheets as text rather than a formula.
Member emails follow the teams-export consent rule; names always appear.

The run PATCH now accepts submissionsCloseAt (ISO or null) so an
organiser can move the deadline from the admin instead of needing a
database edit when demos slip."
```

---

### Task 6: Member submit UI

**Files:**
- Create: `src/app/dashboard/impact-lab/SubmitProject.tsx`
- Modify: `src/app/dashboard/impact-lab/TeamReveal.tsx` (render it below the existing sections)

**Interfaces:**
- Consumes: `GET`/`PUT /api/impact-lab/submission` (Task 3); `SubmissionView` type (Task 2); `csrfHeaders` from `@/lib/csrf-client`.
- Produces: `<SubmitProject />` — no props; it fetches its own state.

- [ ] **Step 1: Read the file you are extending**

Read `src/app/dashboard/impact-lab/TeamReveal.tsx` in full. Note the section idiom (`<motion.section variants={item} aria-label="...">` with an `// ./section-name` heading), the theme tokens in use, and that `useReducedMotion` gates all animation. Match it.

- [ ] **Step 2: Create the component**

Create `src/app/dashboard/impact-lab/SubmitProject.tsx`:

```tsx
"use client";

/**
 * Submit-your-project section, shown under a revealed team.
 *
 * One submission per team: whatever a teammate saved is pre-filled, and any
 * member may keep editing until the organisers' deadline passes. The server
 * owns team resolution, so this component never sends a team identifier.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { SubmissionView } from "@/lib/impact-lab/submission-schema";

type Status = "no_team" | "open" | "closed";

interface GetResponse {
  success: boolean;
  status?: Status;
  teamName?: string;
  closeAt?: string | null;
  submission?: SubmissionView;
  error?: string;
}

interface FormState {
  projectName: string;
  pitch: string;
  description: string;
  worksVsMocked: string;
  claudeUsage: string;
  track: string;
  problemTackled: string;
  repoUrl: string;
  demoUrl: string;
  videoUrl: string;
  slidesUrl: string;
  screenshotUrl: string;
}

const EMPTY: FormState = {
  projectName: "",
  pitch: "",
  description: "",
  worksVsMocked: "",
  claudeUsage: "",
  track: "",
  problemTackled: "",
  repoUrl: "",
  demoUrl: "",
  videoUrl: "",
  slidesUrl: "",
  screenshotUrl: "",
};

function fromView(view: SubmissionView): FormState {
  return {
    projectName: view.projectName,
    pitch: view.pitch,
    description: view.description,
    worksVsMocked: view.worksVsMocked,
    claudeUsage: view.claudeUsage,
    track: view.track,
    problemTackled: view.problemTackled,
    repoUrl: view.repoUrl,
    demoUrl: view.demoUrl ?? "",
    videoUrl: view.videoUrl ?? "",
    slidesUrl: view.slidesUrl ?? "",
    screenshotUrl: view.screenshotUrl ?? "",
  };
}

/** "1h 12m left" / "closed" — plain, no ticking clock to go stale on a phone. */
function timeLeft(closeAt: string | null): string | null {
  if (!closeAt) return null;
  const ms = new Date(closeAt).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

const inputClass =
  "w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50";
const labelClass = "block text-[11px] font-mono text-text-dim mb-1.5";

export function SubmitProject() {
  const [status, setStatus] = useState<Status | null>(null);
  const [closeAt, setCloseAt] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/impact-lab/submission");
      const json: GetResponse = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not load your submission.");
        return;
      }
      setStatus(json.status ?? "no_team");
      setCloseAt(json.closeAt ?? null);
      if (json.submission) {
        setForm(fromView(json.submission));
        setLastEditedBy(json.submission.lastEditedByName);
      }
    } catch {
      setError("Could not load your submission.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/impact-lab/submission", {
        method: "PUT",
        headers: await csrfHeaders(),
        body: JSON.stringify(form),
      });
      const json: { success: boolean; error?: string; submission?: SubmissionView } =
        await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not save your submission.");
        return;
      }
      if (json.submission) setLastEditedBy(json.submission.lastEditedByName);
      setSaved(true);
    } catch {
      setError("Could not save your submission.");
    } finally {
      setSaving(false);
    }
  }

  if (status === null) {
    return (
      <p className="font-mono text-xs text-text-dim">
        <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />
        Loading your submission…
      </p>
    );
  }

  if (status === "no_team") return null;

  const remaining = timeLeft(closeAt);
  const readOnly = status === "closed";

  const field = (
    key: keyof FormState,
    label: string,
    helper: string,
    multiline = false
  ) => (
    <div>
      <label className={labelClass} htmlFor={`sub-${key}`}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={`sub-${key}`}
          rows={3}
          value={form[key]}
          disabled={readOnly}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className={inputClass}
        />
      ) : (
        <input
          id={`sub-${key}`}
          type="text"
          value={form[key]}
          disabled={readOnly}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className={inputClass}
        />
      )}
      <p className="mt-1 font-mono text-[10px] text-text-dim">{helper}</p>
    </div>
  );

  return (
    <section aria-label="Submit your project" className="mt-10">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
        {"// ./submit-your-project"}
      </h3>

      <div className="rounded-lg border border-border-default bg-bg-secondary p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="font-mono text-sm text-text-secondary">
            {readOnly
              ? "Submissions are closed."
              : "One entry per team — any teammate can update it."}
          </p>
          {remaining && !readOnly && (
            <span className="rounded border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber">
              {remaining}
            </span>
          )}
        </div>

        {lastEditedBy && (
          <p className="mb-4 font-mono text-[11px] text-text-dim">
            Last saved by {lastEditedBy}
          </p>
        )}

        <form onSubmit={save} className="space-y-4">
          {field("projectName", "Project name *", "What are you calling it?")}
          {field("pitch", "One-line pitch *", "One sentence a judge can repeat.")}
          {field("track", "Track *", "The track whose problem you built for.")}
          {field("problemTackled", "Problem tackled *", "The specific problem, in your words.")}
          {field("description", "What it does *", "What a judge sees when they open it.", true)}
          {field(
            "worksVsMocked",
            "What works vs what's mocked *",
            "Be honest — a thin real slice beats a wide fake one.",
            true
          )}
          {field(
            "claudeUsage",
            "How you used Claude *",
            "Which parts Claude wrote, and how you drove it.",
            true
          )}
          {field("repoUrl", "Repo link *", "github.com/you/project — https:// optional.")}
          {field("demoUrl", "Demo link", "A live URL judges can click.")}
          {field("videoUrl", "Video link", "A walkthrough, in case the live demo dies.")}
          {field("slidesUrl", "Slides link", "Drive or Figma link — no file upload needed.")}
          {field("screenshotUrl", "Screenshot link", "Optional image link.")}

          {error && (
            <p role="alert" className="font-mono text-xs text-red">
              {error}
            </p>
          )}

          {saved && (
            <p role="status" className="font-mono text-xs text-green-primary">
              <CheckCircle className="mr-1.5 inline h-3.5 w-3.5" />
              Saved. Your teammates will see this.
            </p>
          )}

          {!readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded border border-green-primary/30 bg-green-primary/10 px-4 py-2 font-mono text-xs font-semibold text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Save submission
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Render it from TeamReveal**

In `src/app/dashboard/impact-lab/TeamReveal.tsx`, add the import at the top with the other local imports:

```tsx
import { SubmitProject } from "./SubmitProject";
```

Then, immediately before the closing tag of the outermost `motion.div`, add:

```tsx
      <SubmitProject />
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/dashboard/impact-lab/SubmitProject.tsx src/app/dashboard/impact-lab/TeamReveal.tsx`
Expected: both exit 0. If `text-red` or `text-amber` are not valid tokens, check `src/app/globals.css` `@theme inline` for the exact names and use those.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/impact-lab/SubmitProject.tsx src/app/dashboard/impact-lab/TeamReveal.tsx
git commit -m "feat(dashboard): submit-your-project section under a revealed team

Pre-filled with whatever a teammate already saved, showing who saved it
last, with time remaining and a read-only view once submissions close.
Sends no team identifier — the server resolves the team from the session.

Field helpers push teams toward what judges actually need: an honest
works-vs-mocked answer, and a video link for when the live demo dies on
venue wifi."
```

---

### Task 7: Admin submissions tab

**Files:**
- Create: `src/components/admin/impact-lab/SubmissionsTab.tsx`
- Modify: `src/components/admin/impact-lab/ImpactLabDashboard.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/impact-lab/submissions` and `PATCH .../[id]` (Task 4); the export route (Task 5); `PATCH /api/admin/impact-lab/runs/[id]` for the deadline (Task 5); `apiGet`, `apiSend` from `./api`.
- Produces: `<SubmissionsTab cohort={string} />`.

- [ ] **Step 1: Create the tab**

Create `src/components/admin/impact-lab/SubmissionsTab.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Download, AlertTriangle, ExternalLink } from "lucide-react"
import { apiGet, apiSend } from "./api"

interface AdminSubmission {
  id: string
  runId: string
  teamId: string
  teamName: string
  projectName: string
  pitch: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  track: string
  problemTackled: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
  screenshotUrl: string | null
  status: string
  lastEditedByEmail: string
  updatedAt: string
  isStale: boolean
}

interface MissingTeam {
  teamId: string
  teamName: string
  members: string[]
}

interface SubmissionsData {
  finalRunId: string | null
  closeAt: string | null
  teamCount: number
  staleRunIds: string[]
  submissions: AdminSubmission[]
  missing: MissingTeam[]
}

/** ISO → the value a datetime-local input expects, in the browser's zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SubmissionsTab({ cohort }: { cohort: string }) {
  const [data, setData] = useState<SubmissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deadline, setDeadline] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<SubmissionsData>(
        `/api/admin/impact-lab/submissions?cohort=${cohort}`
      )
      setData(res)
      setDeadline(toLocalInput(res.closeAt))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  async function saveDeadline() {
    if (!data?.finalRunId) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${data.finalRunId}`, "PATCH", {
        submissionsCloseAt: deadline ? new Date(deadline).toISOString() : null,
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the deadline")
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/submissions/${id}`, "PATCH", { status })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
        {error ?? "No data"}
      </div>
    )
  }

  const forRun = data.submissions.filter((s) => !s.isStale)

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}

      {data.staleRunIds.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 p-2 bg-[#ffb000]/10 border border-[#ffb000]/30 rounded text-[11px] font-mono text-[#ffb000]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {data.submissions.filter((s) => s.isStale).length} submission(s) belong to an
            earlier final run and are detached from the teams currently published. Re-marking
            a run final does not move submissions — check before judging.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
        <div>
          <div className="text-xl font-mono font-bold text-[#00ff41]">
            {forRun.length}
            <span className="text-[#444]"> / {data.teamCount}</span>
          </div>
          <div className="text-[10px] font-mono text-[#555] uppercase tracking-wider">
            teams submitted
          </div>
        </div>

        <div>
          <label
            htmlFor="submissions-deadline"
            className="block text-[10px] font-mono text-[#555] mb-1 uppercase"
          >
            Submissions close
          </label>
          <div className="flex items-center gap-2">
            <input
              id="submissions-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0]"
            />
            <button
              onClick={saveDeadline}
              disabled={busy || !data.finalRunId}
              className="px-3 py-1.5 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] rounded text-[11px] font-mono text-[#888] disabled:opacity-40"
            >
              Save
            </button>
          </div>
          <p className="mt-1 text-[10px] font-mono text-[#555]">
            Blank means open with no deadline.
          </p>
        </div>

        <a
          href={`/api/admin/impact-lab/submissions/export?cohort=${cohort}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888]"
        >
          <Download className="h-3 w-3" /> Download CSV
        </a>
      </div>

      {data.missing.length > 0 && (
        <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
          <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider mb-2">
            Not yet submitted ({data.missing.length})
          </p>
          <ul className="space-y-1">
            {data.missing.map((m) => (
              <li key={m.teamId} className="text-[11px] font-mono text-[#888]">
                <span className="text-[#e0e0e0]">{m.teamName}</span>
                <span className="text-[#555]"> — {m.members.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        {data.submissions.length === 0 ? (
          <p className="p-8 text-center text-sm font-mono text-[#555]">
            No submissions yet
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Team", "Project", "Track", "Links", "Status", "Updated", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {data.submissions.map((s) => (
                <tr key={s.id} className="hover:bg-[#111] align-top">
                  <td className="px-4 py-3 text-[11px] font-mono text-[#e0e0e0]">
                    {s.teamName}
                    {s.isStale && (
                      <span className="ml-1.5 text-[9px] uppercase text-[#ffb000]">stale</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] font-mono text-[#e0e0e0]">{s.projectName}</div>
                    <div className="text-[10px] font-mono text-[#666]">{s.pitch}</div>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-mono text-[#888]">{s.track}</td>
                  <td className="px-4 py-3 space-y-0.5">
                    {[
                      ["repo", s.repoUrl],
                      ["demo", s.demoUrl],
                      ["video", s.videoUrl],
                      ["slides", s.slidesUrl],
                    ]
                      .filter(([, url]) => Boolean(url))
                      .map(([label, url]) => (
                        <a
                          key={label}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-[#00d4ff] hover:underline"
                        >
                          {label} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Status for ${s.teamName}`}
                      value={s.status}
                      disabled={busy}
                      onChange={(e) => setStatus(s.id, e.target.value)}
                      className="bg-[#111] border border-[#1e1e1e] rounded px-1.5 py-1 text-[10px] font-mono text-[#e0e0e0]"
                    >
                      {["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((v) => (
                        <option key={v} value={v}>
                          {v.toLowerCase().replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-mono text-[#555]">
                    {new Date(s.updatedAt).toLocaleString()}
                    <div className="text-[9px] text-[#444]">{s.lastEditedByEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      aria-expanded={expanded === s.id}
                      className="text-[10px] font-mono text-[#666] hover:text-[#999]"
                    >
                      {expanded === s.id ? "hide" : "detail"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {expanded &&
        (() => {
          const s = data.submissions.find((x) => x.id === expanded)
          if (!s) return null
          return (
            <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg space-y-3">
              <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider">
                {s.teamName} — {s.projectName}
              </p>
              {[
                ["Problem", s.problemTackled],
                ["What it does", s.description],
                ["Works vs mocked", s.worksVsMocked],
                ["How they used Claude", s.claudeUsage],
              ].map(([label, body]) => (
                <div key={label}>
                  <p className="text-[10px] font-mono text-[#555] uppercase">{label}</p>
                  <p className="text-[11px] font-mono leading-relaxed text-[#aaa] whitespace-pre-wrap">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          )
        })()}
    </div>
  )
}
```

- [ ] **Step 2: Register the tab**

In `src/components/admin/impact-lab/ImpactLabDashboard.tsx`, make three edits:

1. Import it with the other tabs: `import { SubmissionsTab } from "./SubmissionsTab"` and add `FileText` to the existing `lucide-react` import.
2. Extend the `Tab` union to `"participants" | "matching" | "runs" | "submissions"`.
3. Append to the `TABS` array: `{ key: "submissions", label: "Submissions", icon: FileText },` and add the render line after the `runs` one:

```tsx
      {tab === "submissions" && <SubmissionsTab cohort={cohort} />}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/impact-lab/SubmissionsTab.tsx src/components/admin/impact-lab/ImpactLabDashboard.tsx`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/impact-lab/SubmissionsTab.tsx src/components/admin/impact-lab/ImpactLabDashboard.tsx
git commit -m "feat(admin): Impact Lab submissions tab

Count against team total, an editable deadline, a one-click judging CSV,
the submissions table with links out and review status, and expandable
full answers.

The element that earns its place at 6am is 'Not yet submitted' — team
name plus member names, so organisers can chase people in the room. A
loud banner appears when submissions belong to an earlier final run,
because that detachment would otherwise look like lost work."
```

---

### Task 8: Docs, full gates, production migration

**Files:**
- Create: `docs/impact-lab/14-submissions.md`
- Modify: `docs/impact-lab/README.md`, `docs/impact-lab/12-admin-ui.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing consumed by code.

- [ ] **Step 1: Write the feature doc**

Create `docs/impact-lab/14-submissions.md` documenting: the `(runId, teamId)` key and why teams have no table; one-per-team with any-member editing; the deadline on the run and that blank means open; links-only and the storage reasoning; the member routes and their `NO_TEAM` / `SUBMISSIONS_CLOSED` codes; the admin routes; the CSV consent rule; and the stale-run limitation. Match the tone and heading depth of `docs/impact-lab/11-api.md`.

- [ ] **Step 2: Update the index and admin doc**

In `docs/impact-lab/README.md`, add a row for `14-submissions.md`. In `docs/impact-lab/12-admin-ui.md`, change "Three tabs, three jobs" to four and add a paragraph for the Submissions tab.

- [ ] **Step 3: Run every gate**

Run each and confirm:

```bash
npx tsc --noEmit
npm run verify:matching
npm run verify:submissions
npm run build
```

Expected: exit 0, `ALL CHECKS PASSED`, `ALL CHECKS PASSED`, `✓ Compiled successfully`.

- [ ] **Step 4: Commit the docs**

```bash
git add docs/impact-lab/
git commit -m "docs(impact-lab): document team project submissions

Covers the (runId, teamId) key and why no team table exists, one-per-team
editing, the deadline on the run, why files are links, both member routes
with their error codes, the admin routes, the CSV consent rule, and the
stale-run limitation."
```

- [ ] **Step 5: Apply the migration to production**

The migration is additive and nullable, so it is safe to apply before the code deploys.

```bash
PW=$(python -c "
import re, urllib.parse
s = open(r'C:/Projects/_backups/cck/vps-connection.txt').read()
m = re.search(r'postgres(?:ql)?://[^:]+:([^@]+)@', s) or re.search(r'pass(?:word)?\s*[:=]\s*(\S+)', s, re.I)
print(urllib.parse.quote(m.group(1), safe=''))
")
DATABASE_URL="postgresql://cck:${PW}@173.249.39.147:6432/cck?sslmode=require&uselibpqcompat=true&connection_limit=1" npx prisma migrate deploy
```

Expected: "All migrations have been successfully applied." Never print or commit the password.

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin feat/impact-lab-submissions
```

Then open a PR to `main` summarising: what teams see, what organisers get, the links-only decision and why, the stale-run limitation, that the migration is already applied, and the manual checklist from the spec for the reviewer to walk. End the body with `@Spidey-Acer`.

- [ ] **Step 7: Walk the manual checklist against the preview deployment**

From the spec, with two accounts on the same team:

1. Member A saves → row created.
2. Member B loads it pre-filled, edits, saves → still one row, "Last saved by B".
3. Admin shows `1 of N submitted` and the rest under "Not yet submitted".
4. Set the deadline in the past → member sees read-only, `PUT` returns 403 `SUBMISSIONS_CLOSED`.
5. A pitch of `=SUM(A1:A9)` exports as text, not a formula.
6. A participant with no team sees nothing broken and cannot `PUT`.
7. Signed out → 401.

---

## Self-review notes

**Spec coverage:** data model → Task 1; pure logic + validation → Task 2; member GET/PUT → Task 3; admin list + missing teams + status → Task 4; CSV export + editable deadline → Task 5; participant UI in `TeamReveal` → Task 6; fourth admin tab with chase-list → Task 7; docs, gates, prod migration, manual checklist → Task 8. The spec's "out of scope" list (uploads, judge scoring, showcase page, submission emails) is absent from every task, as intended.

**Deliberate deviation from the skill's TDD default:** this repo has no unit-test framework, so Task 2 writes an assertion harness first (`scripts/verify-submissions.ts`) against the pure modules — the same pattern as `scripts/verify-matching.ts` — and route/UI behaviour is covered by gates plus the manual checklist. Adding a test framework the night of an event would be the wrong trade.

**Naming consistency check:** `submissionWindow`, `findTeamFor`, `missingTeams`, `SUBMISSION_CSV_HEADERS`, `submissionCsvRow`, `submissionInputSchema`, `SubmissionView` are defined in Task 2 and referenced under exactly those names in Tasks 3–7. The Prisma composite key is `runId_teamId` throughout. Status values are the four `ApplicationStatus` members everywhere.
