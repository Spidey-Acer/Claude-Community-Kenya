# Event Platform Tenancy (Sub-project 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Event` a database row owned by an `Organisation`, with a dashboard-controlled lifecycle that replaces the `IMPACT_LAB_ACTIVE_COHORT` env var, membership-based event resolution for participants, and org-scoped authorization — per the approved spec at `docs/superpowers/specs/2026-08-08-event-platform-tenancy-design.md`.

**Architecture:** Three new Prisma models (`Organisation`, `OrganisationMember`, `Event`) join the nine existing cohort-keyed Impact Lab tables by slug — the migration is purely additive. New pure-logic module (`event-lifecycle.ts`) + thin DB module (`event-store.ts`) + access module (`event-access.ts`) replace the env-derived `CURRENT_COHORT` constant, which is deleted in the final task so every unconverted call site fails at compile time.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma 7 (PostgreSQL), NextAuth v5, Zod, Tailwind v4 (Terminal Noir tokens for admin UI), `tsx` for verify/seed scripts.

## Global Constraints

- **Prerequisite: PR #107 must be merged to main before execution starts.** Task 11 modifies `src/lib/impact-lab/event-branding.ts` and its three export call sites, which exist only in that PR. Verify with `git log origin/main --oneline -5 | grep -i branding` before branching.
- Work on branch `feat/event-platform-tenancy`, created from up-to-date `origin/main`. Never commit to main. Do not push or open a PR until the user says so.
- Gate before EVERY commit: `npx tsc --noEmit` clean AND `npm run verify:events` passing (once it exists, Task 3 onward). Run `npm run build` at the milestones marked in tasks (it takes ~30s; not every step).
- TypeScript strict; never `any`. Conventional commits `type(scope): description`.
- All styling via Tailwind utilities + the Terminal Noir CSS variables (`--bg-card`, `--green-primary`, `--text-dim`, …) already used across `src/components/admin/impact-lab/`. No inline styles.
- **Never run migrations or seeds against production.** Local migration + local seed only. Production application is a hand-off checklist at the end (SSH tunnel runbook, direct port 5433 — never through PgBouncer 6432).
- **Do not delete or modify existing migration folders.** New migration folders only.
- If `npx tsc --noEmit` shows dozens of "property does not exist on PrismaClient" errors, run `npx prisma generate` first — stale client, not real errors (known issue).
- Existing production data is untouchable: no schema change to the nine existing Impact Lab tables, no data rewrites.
- **Naming: the tenancy event model is `ImpactLabEvent`** (Prisma enum `ImpactLabEventStatus`, client accessor `prisma.impactLabEvent`) — the schema already has an unrelated community-meetup `Event` model and `EventStatus` enum, which must never be touched. Table names (`impact_lab_events`) and columns are unaffected by this naming.
- JSDoc on every exported function: what, why, params, returns.

---

### Task 1: Prisma schema — Organisation, OrganisationMember, Event

**Files:**
- Modify: `prisma/schema.prisma` (enums near line 116, User relations near line 147, new models after `ImpactLabResultsEmail` which starts at line 979)
- Create: `prisma/migrations/<timestamp>_event_platform_tenancy/migration.sql` (generated)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: Prisma models `Organisation`, `OrganisationMember`, `ImpactLabEvent`; enums `OrgRole { OWNER ORGANISER }`, `ImpactLabEventStatus { DRAFT LIVE CLOSED ARCHIVED }`; `User.organisationMemberships` relation. Later tasks query `prisma.impactLabEvent`, `prisma.organisation`, `prisma.organisationMember`.

- [ ] **Step 1: Add enums**

In `prisma/schema.prisma`, directly after the `ImpactLabExperience` enum (ends line 116), add:

```prisma
// Tenant-tier role, orthogonal to the site-wide UserRole. Site
// SUPER_ADMIN/ADMIN are the *platform* tier and pass every event check;
// OrganisationMember grants access to one organisation's events only.
enum OrgRole {
  OWNER
  ORGANISER
}

// Event lifecycle. Judging/submission windows are NOT statuses — they stay
// as fine-grained flags on the match run (judgingOpen, submissionsCloseAt),
// because Afretec needed judging and submissions open concurrently.
// "ImpactLab" prefix because the schema already has an unrelated
// community-meetup EventStatus enum.
enum ImpactLabEventStatus {
  DRAFT // being set up; invisible to participants and judges
  LIVE // participants form teams and submit; judges score
  CLOSED // read-only for participants; reports and exports available
  ARCHIVED // hidden from default listings; data retained
}
```

- [ ] **Step 2: Add the User relation**

In `model User`, after `impactLabMatchRuns   ImpactLabMatchRun[]` (line 147), add:

```prisma
  organisationMemberships OrganisationMember[]
```

- [ ] **Step 3: Add the three models**

At the end of the Impact Lab section of the schema (after `model ImpactLabResultsEmail`), add:

```prisma
// ─── Event Platform Tenancy ──────────────────────────────────────────────────
// An Event belongs to an Organisation and OWNS a unique cohort slug — the
// join key into the nine cohort-keyed Impact Lab tables above. Those tables
// keep their string columns; no FKs are added to them (the join is by slug,
// matching every existing query). See the 2026-08-08 tenancy design spec.

model Organisation {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  logoUrl      String?
  contactEmail String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  members OrganisationMember[]
  events  ImpactLabEvent[]

  @@map("organisations")
}

model OrganisationMember {
  id             String   @id @default(cuid())
  organisationId String
  userId         String
  role           OrgRole  @default(ORGANISER)
  createdAt      DateTime @default(now())

  organisation Organisation @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organisationId, userId])
  @@map("organisation_members")
}

model ImpactLabEvent {
  id             String      @id @default(cuid())
  organisationId String
  /// Authoritative registry entry for the cohort slug used across the nine
  /// Impact Lab tables. Unique: one Event per cohort, ever.
  cohort         String      @unique
  name           String
  status         ImpactLabEventStatus @default(DRAFT)

  // Branding — replaces the code constants in event-branding.ts (Task 11).
  titleLead   String
  titleAccent String
  dates       String
  location    String
  formatNote  String  @db.Text
  groundRules String? @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organisation Organisation @relation(fields: [organisationId], references: [id])

  @@index([organisationId])
  @@index([status])
  @@map("impact_lab_events")
}
```

- [ ] **Step 4: Generate the migration**

If a local database is reachable (check `prisma.config.ts` / `.env` — note the known issue that local env may point at the decommissioned Supabase):

```bash
npm run db:migrate -- --name event_platform_tenancy
```

If no local database is reachable, author the migration the way the pitch-timer migration was authored — generate SQL without a database and write it into a hand-timestamped folder:

```bash
mkdir -p prisma/migrations/20260808200000_event_platform_tenancy
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20260808200000_event_platform_tenancy/migration.sql
```

Then inspect the SQL: it must contain ONLY `CREATE TYPE` (2), `CREATE TABLE` (3), `CREATE INDEX`/`CREATE UNIQUE INDEX`, and `ADD CONSTRAINT ... FOREIGN KEY` statements for the new tables. **If it contains any `ALTER TABLE` on an existing table or any `DROP`, STOP — the schema edit touched something it must not. Fix the schema before continuing.**

- [ ] **Step 5: Regenerate the client and type-check**

```bash
npx prisma generate
npx tsc --noEmit
```

Expected: clean. (`prisma.impactLabEvent` etc. now exist on the client.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(impact-lab): add Organisation, OrganisationMember and Event models"
```

---

### Task 2: Backfill seed script

**Files:**
- Create: `scripts/seed-events.ts`
- Modify: `package.json` (scripts block, after `"seed:hackathon"`)

**Interfaces:**
- Consumes: Prisma models from Task 1.
- Produces: two `Organisation` rows (slugs `cck`, `c4dlab`), two `Event` rows (cohorts `impact-lab-2026-07`, `afretec-makerthon-2026-08`, both `CLOSED`), `OrganisationMember` OWNER rows for every active `SUPER_ADMIN`/`ADMIN` user on `cck`. Idempotent — safe to run twice.

- [ ] **Step 1: Write the seed script**

Follow the house pattern from `scripts/seed-hackathon-cohort.ts`: dry-run by default, `--apply` to write, prints a summary either way. Branding values are copied **verbatim** from `src/lib/impact-lab/event-branding.ts` (`IMPACT_LAB_BRANDING`, `AFRETEC_BRANDING`) — but hardcoded here rather than imported, so the script still runs after Task 11 reshapes that module.

```ts
/**
 * Backfill the tenancy tables with the two events that already ran.
 *
 * Idempotent: every write is an upsert keyed on the unique slug/cohort, so
 * running it twice changes nothing. Dry-run by default; pass --apply to write.
 *
 *   npm run seed:events            # report what would change
 *   npm run seed:events -- --apply # write
 */
import { PrismaClient } from "../src/generated/prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

interface OrgSeed {
  slug: string
  name: string
  contactEmail: string | null
}

interface EventSeed {
  orgSlug: string
  cohort: string
  name: string
  status: "CLOSED"
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
}

const ORGS: OrgSeed[] = [
  { slug: "cck", name: "Claude Community Kenya", contactEmail: "hello@claudekenya.org" },
  { slug: "c4dlab", name: "C4DLab, University of Nairobi", contactEmail: null },
]

const EVENTS: EventSeed[] = [
  {
    orgSlug: "cck",
    cohort: "impact-lab-2026-07",
    name: "Impact Lab: AI Mashinani",
    status: "CLOSED",
    titleLead: "Impact Lab:",
    titleAccent: "AI Mashinani",
    dates: "25–26 July 2026",
    location: "Nairobi, Kenya",
    formatNote:
      "An overnight build: teams formed in the evening, built through the night, " +
      "and judging ran from the small hours into the morning.",
  },
  {
    orgSlug: "c4dlab",
    cohort: "afretec-makerthon-2026-08",
    name: "Afretec Makerthon 2026",
    status: "CLOSED",
    titleLead: "Afretec",
    titleAccent: "Makerthon 2026",
    dates: "8 August 2026",
    location: "Nairobi, Kenya",
    formatNote:
      "Teams registered as existing startups and were formed before the event. Each team " +
      "pitched live for five minutes and was scored by a judging panel on eight criteria out " +
      "of 50.",
  },
]

async function main(): Promise<void> {
  console.log(APPLY ? "APPLY mode — writing." : "DRY RUN — pass --apply to write.")

  for (const org of ORGS) {
    const existing = await prisma.organisation.findUnique({ where: { slug: org.slug } })
    console.log(`organisation ${org.slug}: ${existing ? "exists" : "will create"}`)
    if (APPLY) {
      await prisma.organisation.upsert({
        where: { slug: org.slug },
        create: org,
        update: { name: org.name, contactEmail: org.contactEmail },
      })
    }
  }

  for (const event of EVENTS) {
    const org = await prisma.organisation.findUnique({ where: { slug: event.orgSlug } })
    if (!org) {
      if (APPLY) throw new Error(`organisation ${event.orgSlug} missing — cannot seed ${event.cohort}`)
      console.log(`event ${event.cohort}: would create under ${event.orgSlug} (org pending)`)
      continue
    }
    const { orgSlug: _orgSlug, ...data } = event
    const existing = await prisma.impactLabEvent.findUnique({ where: { cohort: event.cohort } })
    console.log(`event ${event.cohort}: ${existing ? "exists" : "will create"}`)
    if (APPLY) {
      await prisma.impactLabEvent.upsert({
        where: { cohort: event.cohort },
        // Backfill never overwrites a status an admin may have changed since.
        create: { ...data, organisationId: org.id },
        update: {},
      })
    }
  }

  // Every active platform admin becomes an OWNER of the CCK organisation.
  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, active: true },
    select: { id: true, email: true },
  })
  const cck = await prisma.organisation.findUnique({ where: { slug: "cck" } })
  console.log(`cck OWNER memberships for ${admins.length} platform admin(s)`)
  if (APPLY && cck) {
    for (const admin of admins) {
      await prisma.organisationMember.upsert({
        where: { organisationId_userId: { organisationId: cck.id, userId: admin.id } },
        create: { organisationId: cck.id, userId: admin.id, role: "OWNER" },
        update: {},
      })
    }
  }

  console.log("Done.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Register the npm script**

In `package.json`, after `"seed:hackathon"`:

```json
    "seed:events": "tsx scripts/seed-events.ts",
```

- [ ] **Step 3: Verify against a local database if reachable**

```bash
npm run seed:events            # dry run — must not throw
npm run seed:events -- --apply # if a local DB with the migration exists
npm run seed:events -- --apply # second run must report "exists" everywhere
```

If no local database is reachable, `npx tsc --noEmit` clean is the gate; note in the commit body that the apply run is deferred to the deploy checklist.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-events.ts package.json
git commit -m "feat(impact-lab): idempotent backfill seed for organisations and events"
```

---

### Task 3: Pure lifecycle logic + the verify script

**Files:**
- Create: `src/lib/impact-lab/event-lifecycle.ts`
- Create: `scripts/verify-events.ts`
- Modify: `package.json` (add `"verify:events": "tsx scripts/verify-events.ts",` after `"verify:reviews"`)

**Interfaces:**
- Consumes: nothing from the DB — this module is deliberately pure so the verify script can assert it without a database.
- Produces (exact signatures later tasks import):

```ts
export const EVENT_STATUSES: readonly ["DRAFT", "LIVE", "CLOSED", "ARCHIVED"]
export type EventStatusValue = (typeof EVENT_STATUSES)[number]
export function canTransition(
  from: EventStatusValue,
  to: EventStatusValue,
  hasParticipants: boolean
): { ok: true } | { ok: false; reason: string }
export interface MemberEventRef {
  cohort: string
  status: EventStatusValue
  createdAt: Date
}
export function orderMemberEvents<T extends MemberEventRef>(events: T[]): T[]
export function pickMemberEvent<T extends MemberEventRef>(
  events: T[],
  requested?: string | null
): T | null
export function validCohort(input: string | null | undefined): string | null
```

- [ ] **Step 1: Write the first failing assertions**

Create `scripts/verify-events.ts` in the style of `scripts/verify-judging.ts` (a plain tsx script of `assert`-style checks with a pass/fail counter — read that file's header first and copy its `check(name, condition)` harness exactly):

```ts
/**
 * Assertions for the event tenancy logic: lifecycle transitions, member
 * event resolution precedence, and cohort slug validation. Pure logic only —
 * runs without a database, like verify-judging.ts.
 *
 *   npm run verify:events
 */
import {
  canTransition,
  orderMemberEvents,
  pickMemberEvent,
  validCohort,
} from "../src/lib/impact-lab/event-lifecycle"

let passed = 0
let failed = 0
function check(name: string, condition: boolean): void {
  if (condition) {
    passed += 1
  } else {
    failed += 1
    console.error(`FAIL: ${name}`)
  }
}

// ── canTransition ────────────────────────────────────────────────────────────
check("DRAFT→LIVE allowed", canTransition("DRAFT", "LIVE", false).ok)
check("DRAFT→LIVE allowed with participants", canTransition("DRAFT", "LIVE", true).ok)
check("LIVE→DRAFT allowed while empty", canTransition("LIVE", "DRAFT", false).ok)
check("LIVE→DRAFT refused once participants exist", !canTransition("LIVE", "DRAFT", true).ok)
check("LIVE→CLOSED allowed", canTransition("LIVE", "CLOSED", true).ok)
check("CLOSED→LIVE (reopen) allowed", canTransition("CLOSED", "LIVE", true).ok)
check("CLOSED→ARCHIVED allowed", canTransition("CLOSED", "ARCHIVED", true).ok)
check("ARCHIVED→CLOSED (unarchive) allowed", canTransition("ARCHIVED", "CLOSED", true).ok)
check("DRAFT→ARCHIVED refused (archive requires CLOSED)", !canTransition("DRAFT", "ARCHIVED", false).ok)
check("LIVE→ARCHIVED refused (archive requires CLOSED)", !canTransition("LIVE", "ARCHIVED", true).ok)
check("ARCHIVED→LIVE refused (unarchive first)", !canTransition("ARCHIVED", "LIVE", true).ok)
check("no-op transition refused", !canTransition("LIVE", "LIVE", true).ok)
check("refusal carries a reason", canTransition("LIVE", "DRAFT", true).ok === false &&
  (canTransition("LIVE", "DRAFT", true) as { ok: false; reason: string }).reason.length > 0)

// ── ordering and picking ─────────────────────────────────────────────────────
const day = (n: number): Date => new Date(2026, 0, n)
const closedOld = { cohort: "old-closed", status: "CLOSED" as const, createdAt: day(1) }
const closedNew = { cohort: "new-closed", status: "CLOSED" as const, createdAt: day(5) }
const liveOld = { cohort: "old-live", status: "LIVE" as const, createdAt: day(2) }
const liveNew = { cohort: "new-live", status: "LIVE" as const, createdAt: day(4) }
const draft = { cohort: "a-draft", status: "DRAFT" as const, createdAt: day(9) }
const archived = { cohort: "an-archived", status: "ARCHIVED" as const, createdAt: day(9) }

const ordered = orderMemberEvents([closedOld, draft, liveOld, archived, liveNew, closedNew])
check("DRAFT excluded from member view", !ordered.some((e) => e.cohort === "a-draft"))
check("ARCHIVED excluded from member view", !ordered.some((e) => e.cohort === "an-archived"))
check("LIVE events come before CLOSED", ordered[0].status === "LIVE" && ordered[1].status === "LIVE")
check("newest LIVE first", ordered[0].cohort === "new-live")
check("newest CLOSED first within CLOSED", ordered[2].cohort === "new-closed")

check("pick: empty list → null", pickMemberEvent([]) === null)
check("pick: single event wins", pickMemberEvent([closedOld])?.cohort === "old-closed")
check("pick: newest LIVE by default", pickMemberEvent([closedNew, liveOld, liveNew])?.cohort === "new-live")
check("pick: requested cohort honoured when member", pickMemberEvent([liveNew, liveOld], "old-live")?.cohort === "old-live")
check("pick: requested cohort ignored when not a member", pickMemberEvent([liveNew], "someone-elses")?.cohort === "new-live")
check("pick: requested DRAFT/ARCHIVED unreachable", pickMemberEvent([liveNew, draft], "a-draft")?.cohort === "new-live")

// ── validCohort ──────────────────────────────────────────────────────────────
check("validCohort accepts a real slug", validCohort("afretec-makerthon-2026-08") === "afretec-makerthon-2026-08")
check("validCohort trims", validCohort("  impact-lab-2026-07 ") === "impact-lab-2026-07")
check("validCohort rejects empty", validCohort("") === null)
check("validCohort rejects null/undefined", validCohort(null) === null && validCohort(undefined) === null)
check("validCohort rejects CR/LF injection", validCohort("x\r\nSet-Cookie: a=b") === null)
check("validCohort rejects overlong input", validCohort("a".repeat(61)) === null)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx tsx scripts/verify-events.ts
```

Expected: FAIL — module `../src/lib/impact-lab/event-lifecycle` does not exist.

- [ ] **Step 3: Implement the module**

Create `src/lib/impact-lab/event-lifecycle.ts`:

```ts
/**
 * Pure event-lifecycle logic: which status transitions are legal, which
 * events a participant can see, and cohort slug validation.
 *
 * No database access — everything here is assertable by scripts/verify-events.ts
 * without infrastructure, the same split judging.ts has from its routes.
 */

export const EVENT_STATUSES = ["DRAFT", "LIVE", "CLOSED", "ARCHIVED"] as const
export type EventStatusValue = (typeof EVENT_STATUSES)[number]

/**
 * Whether an admin may move an event between two statuses.
 *
 * The graph is deliberately narrow: DRAFT⇄LIVE (back only while nobody has
 * registered — un-launching an event people joined would hide their data),
 * LIVE⇄CLOSED (reopening a closed event is a legitimate organiser action),
 * CLOSED⇄ARCHIVED. Archiving from anywhere else must pass through CLOSED so
 * that "archived" always means "was properly closed first".
 */
export function canTransition(
  from: EventStatusValue,
  to: EventStatusValue,
  hasParticipants: boolean
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "The event is already in that state." }
  if (from === "DRAFT" && to === "LIVE") return { ok: true }
  if (from === "LIVE" && to === "DRAFT") {
    return hasParticipants
      ? { ok: false, reason: "People have already registered — close the event instead of un-launching it." }
      : { ok: true }
  }
  if (from === "LIVE" && to === "CLOSED") return { ok: true }
  if (from === "CLOSED" && to === "LIVE") return { ok: true }
  if (from === "CLOSED" && to === "ARCHIVED") return { ok: true }
  if (from === "ARCHIVED" && to === "CLOSED") return { ok: true }
  return { ok: false, reason: `An event cannot go from ${from} to ${to}.` }
}

/** The minimum shape resolution needs; event-store rows satisfy it. */
export interface MemberEventRef {
  cohort: string
  status: EventStatusValue
  createdAt: Date
}

/**
 * The events a participant may see, in display order: LIVE before CLOSED,
 * newest first within each. DRAFT (not launched) and ARCHIVED (deliberately
 * hidden) are excluded — a participant's view of an archived event is a
 * platform-admin conversation, not a dashboard surface.
 */
export function orderMemberEvents<T extends MemberEventRef>(events: T[]): T[] {
  const rank: Record<EventStatusValue, number> = { LIVE: 0, CLOSED: 1, DRAFT: 9, ARCHIVED: 9 }
  return events
    .filter((e) => e.status === "LIVE" || e.status === "CLOSED")
    .sort((a, b) =>
      rank[a.status] !== rank[b.status]
        ? rank[a.status] - rank[b.status]
        : b.createdAt.getTime() - a.createdAt.getTime()
    )
}

/**
 * The single event a member request operates on. An explicitly requested
 * cohort wins only if the caller is actually a visible member of it —
 * otherwise the newest visible event (LIVE first). Null when the caller
 * belongs to no visible event, which routes surface as their existing
 * "no team" experience.
 */
export function pickMemberEvent<T extends MemberEventRef>(
  events: T[],
  requested?: string | null
): T | null {
  const visible = orderMemberEvents(events)
  if (requested) {
    const match = visible.find((e) => e.cohort === requested)
    if (match) return match
  }
  return visible[0] ?? null
}

const COHORT_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/i

/**
 * Validate user-supplied cohort input to a safe slug, or null.
 *
 * This is the successor to constants.ts `safeCohort`, minus the fallback:
 * what "no cohort named" means now depends on who is asking (a member's own
 * events, the admin default event), so callers own the fallback and this
 * function only answers "is this string safe to put in a query and a
 * Content-Disposition header?".
 */
export function validCohort(input: string | null | undefined): string | null {
  const value = (input ?? "").trim()
  return COHORT_PATTERN.test(value) ? value : null
}
```

- [ ] **Step 4: Register the npm script and run to green**

In `package.json`, after `"verify:reviews"`:

```json
    "verify:events": "tsx scripts/verify-events.ts",
```

```bash
npm run verify:events
npx tsc --noEmit
```

Expected: all assertions pass, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/impact-lab/event-lifecycle.ts scripts/verify-events.ts package.json
git commit -m "feat(impact-lab): pure event lifecycle logic with verify script"
```

---

### Task 4: Event store (DB access with degrade)

**Files:**
- Create: `src/lib/impact-lab/event-store.ts`
- Reference (read first, do not modify): `src/lib/impact-lab/rubric-store.ts` — copy its P2021 handling style exactly.

**Interfaces:**
- Consumes: `EventStatusValue`, `pickMemberEvent`, `orderMemberEvents` from Task 3; `prisma` from `@/lib/prisma`; `DEFAULT_COHORT` from `./constants`.
- Produces (exact signatures later tasks import):

```ts
export interface EventRecord {
  id: string
  organisationId: string
  organisationName: string
  cohort: string
  name: string
  status: EventStatusValue
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
  groundRules: string | null
  createdAt: Date
}
export interface MemberEvent extends EventRecord {
  participantId: string
}
export async function getEventByCohort(cohort: string): Promise<EventRecord | null>
export async function listEvents(): Promise<EventRecord[]>
export async function defaultAdminCohort(): Promise<string>
export async function resolveAdminCohort(input: string | null | undefined): Promise<string>
export async function resolveMemberEvents(email: string): Promise<MemberEvent[]>
export async function resolveMemberEvent(
  email: string,
  requested?: string | null
): Promise<MemberEvent | null>
export async function eventHasParticipants(cohort: string): Promise<boolean>
```

- [ ] **Step 1: Implement the module**

Create `src/lib/impact-lab/event-store.ts`:

```ts
/**
 * Database access for the tenancy tables, with the same degrade posture as
 * rubric-store.ts: an environment whose migration has not run yet (P2021,
 * missing table) behaves like the pre-tenancy system instead of erroring.
 *
 * Every function here is a thin query; the decisions (ordering, picking,
 * transition legality) live in event-lifecycle.ts where they are pure and
 * verified without a database.
 */

import { prisma } from "@/lib/prisma"
import { DEFAULT_COHORT } from "./constants"
import {
  orderMemberEvents,
  pickMemberEvent,
  type EventStatusValue,
} from "./event-lifecycle"

export interface EventRecord {
  id: string
  organisationId: string
  organisationName: string
  cohort: string
  name: string
  status: EventStatusValue
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
  groundRules: string | null
  createdAt: Date
}

export interface MemberEvent extends EventRecord {
  participantId: string
}

/** True for Prisma's "table does not exist" — the migration hasn't run here. */
function isMissingTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2021"
  )
}

const EVENT_SELECT = {
  id: true,
  organisationId: true,
  cohort: true,
  name: true,
  status: true,
  titleLead: true,
  titleAccent: true,
  dates: true,
  location: true,
  formatNote: true,
  groundRules: true,
  createdAt: true,
  organisation: { select: { name: true } },
} as const

type EventRow = {
  id: string
  organisationId: string
  cohort: string
  name: string
  status: EventStatusValue
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
  groundRules: string | null
  createdAt: Date
  organisation: { name: string }
}

function toRecord(row: EventRow): EventRecord {
  const { organisation, ...rest } = row
  return { ...rest, organisationName: organisation.name }
}

/** The event owning a cohort slug, or null (unknown cohort OR pre-migration). */
export async function getEventByCohort(cohort: string): Promise<EventRecord | null> {
  try {
    const row = await prisma.impactLabEvent.findUnique({ where: { cohort }, select: EVENT_SELECT })
    return row ? toRecord(row as EventRow) : null
  } catch (error) {
    if (isMissingTable(error)) return null
    throw error
  }
}

/** Every event, newest first; [] pre-migration. */
export async function listEvents(): Promise<EventRecord[]> {
  try {
    const rows = await prisma.impactLabEvent.findMany({
      select: EVENT_SELECT,
      orderBy: { createdAt: "desc" },
    })
    return (rows as EventRow[]).map(toRecord)
  } catch (error) {
    if (isMissingTable(error)) return []
    throw error
  }
}

/**
 * The cohort admin surfaces default to when none is named: the newest
 * non-archived event, preferring LIVE — so during an event every admin
 * screen opens on the running event, and afterwards on the latest record.
 * Falls back to DEFAULT_COHORT pre-migration or on an empty table.
 */
export async function defaultAdminCohort(): Promise<string> {
  const events = await listEvents()
  const candidates = events.filter((e) => e.status !== "ARCHIVED")
  const live = candidates.find((e) => e.status === "LIVE")
  return live?.cohort ?? candidates[0]?.cohort ?? DEFAULT_COHORT
}

/**
 * The cohort an admin request operates on: the validated `?cohort=` input,
 * or the admin default. This is the successor to `safeCohort` — same
 * injection-safety contract, database-backed fallback.
 */
export async function resolveAdminCohort(
  input: string | null | undefined
): Promise<string> {
  const { validCohort } = await import("./event-lifecycle")
  return validCohort(input) ?? defaultAdminCohort()
}

/**
 * Every visible event this email holds a participant row in, LIVE first
 * then newest. Pre-migration, degrades to "member of DEFAULT_COHORT if a
 * participant row exists there" so existing behaviour survives an
 * un-migrated environment.
 */
export async function resolveMemberEvents(email: string): Promise<MemberEvent[]> {
  const participants = await prisma.impactLabParticipant.findMany({
    where: { email },
    select: { id: true, cohort: true },
  })
  if (participants.length === 0) return []

  const events = await listEvents()
  if (events.length === 0) {
    // Pre-migration degrade: behave like the old CURRENT_COHORT world.
    const fallback = participants.find((p) => p.cohort === DEFAULT_COHORT)
    return fallback
      ? [
          {
            id: "",
            organisationId: "",
            organisationName: "Claude Community Kenya",
            cohort: DEFAULT_COHORT,
            name: DEFAULT_COHORT,
            status: "CLOSED",
            titleLead: "",
            titleAccent: "",
            dates: "",
            location: "",
            formatNote: "",
            groundRules: null,
            createdAt: new Date(0),
            participantId: fallback.id,
          },
        ]
      : []
  }

  const byCohort = new Map(events.map((e) => [e.cohort, e]))
  const memberEvents: MemberEvent[] = []
  for (const participant of participants) {
    const event = byCohort.get(participant.cohort)
    if (event) memberEvents.push({ ...event, participantId: participant.id })
  }
  return orderMemberEvents(memberEvents)
}

/** The single event a member request operates on — see pickMemberEvent. */
export async function resolveMemberEvent(
  email: string,
  requested?: string | null
): Promise<MemberEvent | null> {
  return pickMemberEvent(await resolveMemberEvents(email), requested)
}

/** Whether anyone has ever been registered into this cohort. */
export async function eventHasParticipants(cohort: string): Promise<boolean> {
  const count = await prisma.impactLabParticipant.count({ where: { cohort } })
  return count > 0
}
```

Note: the dynamic `import("./event-lifecycle")` inside `resolveAdminCohort` is wrong style for this codebase — use a normal top-of-file import of `validCohort` instead. (Stated here so the implementer doesn't copy the sketch literally: **import `validCohort` statically alongside the other lifecycle imports.**)

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean. (No assertions run against this module — it is thin queries over logic already verified in Task 3; the P2021 degrade shape is copied from rubric-store which is proven in production.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/impact-lab/event-store.ts
git commit -m "feat(impact-lab): event store with pre-migration degrade"
```

---

### Task 5: Event access control

**Files:**
- Create: `src/lib/impact-lab/event-access.ts`
- Modify: `scripts/verify-events.ts` (append a section)

**Interfaces:**
- Consumes: `getEventByCohort` (Task 4); `auth` from `@/auth`; `hasPermission`, type `UserRole` from `@/lib/rbac`; `prisma`.
- Produces:

```ts
export function hasEventAccess(
  role: UserRole | null,
  isOrgMember: boolean,
  action: "view" | "create" | "edit" | "delete" | "approve"
): boolean
export async function checkEventAccess(
  cohort: string,
  action: "view" | "create" | "edit" | "delete" | "approve"
): Promise<
  | { authorized: true; event: EventRecord | null; user: { id: string; email: string; role: UserRole } }
  | { authorized: false; response: NextResponse }
>
```

- [ ] **Step 1: Append failing assertions for the pure part**

Append to `scripts/verify-events.ts` (and add `hasEventAccess` to its imports, from `../src/lib/impact-lab/event-access`):

```ts
// ── hasEventAccess ───────────────────────────────────────────────────────────
check("platform SUPER_ADMIN passes any action", hasEventAccess("SUPER_ADMIN", false, "delete"))
check("platform ADMIN passes impact-lab actions", hasEventAccess("ADMIN", false, "approve"))
check("MODERATOR gets view only", hasEventAccess("MODERATOR", false, "view") && !hasEventAccess("MODERATOR", false, "edit"))
check("plain MEMBER refused without org membership", !hasEventAccess("MEMBER", false, "view"))
check("org member passes every action on own org's event", hasEventAccess("MEMBER", true, "view") &&
  hasEventAccess("MEMBER", true, "edit") && hasEventAccess("MEMBER", true, "approve"))
check("no session refused", !hasEventAccess(null, false, "view"))
check("org membership beats missing platform role", hasEventAccess(null, true, "edit") === false)
```

That last assertion pins a real decision: **org membership without a signed-in session is impossible** (membership is looked up BY session), so `role === null` always refuses regardless of the flag.

Run `npm run verify:events` — expected: FAIL, module does not exist.

- [ ] **Step 2: Implement**

Create `src/lib/impact-lab/event-access.ts`:

```ts
/**
 * Event-scoped authorization: the two orthogonal layers from the tenancy
 * design. The platform tier (site UserRole via rbac.ts) says what actions a
 * staff role may take anywhere; the tenant tier (OrganisationMember) grants
 * an organisation's people full run of their OWN events only.
 *
 * Impact Lab admin routes call checkEventAccess INSTEAD of a bare
 * checkApiPermission — the platform check is embedded here.
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, type UserRole } from "@/lib/rbac"
import { getEventByCohort, type EventRecord } from "./event-store"

export type EventAction = "view" | "create" | "edit" | "delete" | "approve"

/**
 * The pure decision: platform role with the impact-lab permission passes;
 * otherwise membership of the event's organisation passes every action
 * (OWNER and ORGANISER are equally trusted on their own event — the split
 * matters only for managing the organisation itself, which is sub-project 6).
 * No session (`role === null`) always refuses: membership is derived FROM
 * the session, so a null role with isOrgMember=true is a caller bug.
 */
export function hasEventAccess(
  role: UserRole | null,
  isOrgMember: boolean,
  action: EventAction
): boolean {
  if (role === null) return false
  if (hasPermission(role, "impact-lab", action)) return true
  return isOrgMember
}

/**
 * Authorize the caller for an event and return the event row so routes never
 * fetch it twice. `event` is null when the cohort has no Event row (unknown
 * slug, or pre-migration environment) — platform staff still pass in that
 * case so existing admin behaviour survives; org members cannot, because
 * without a row there is no organisation to be a member of.
 */
export async function checkEventAccess(
  cohort: string,
  action: EventAction
): Promise<
  | { authorized: true; event: EventRecord | null; user: { id: string; email: string; role: UserRole } }
  | { authorized: false; response: NextResponse }
> {
  const session = await auth()
  if (!session?.user?.email) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    }
  }
  const role = ((session.user as { role?: string }).role ?? "MEMBER") as UserRole
  const user = { id: session.user.id ?? "", email: session.user.email, role }

  const event = await getEventByCohort(cohort)

  let isOrgMember = false
  if (event && user.id) {
    try {
      const membership = await prisma.organisationMember.findUnique({
        where: {
          organisationId_userId: { organisationId: event.organisationId, userId: user.id },
        },
        select: { id: true },
      })
      isOrgMember = membership !== null
    } catch {
      // Missing table pre-migration — platform tier still decides.
      isOrgMember = false
    }
  }

  if (!hasEventAccess(role, isOrgMember, action)) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    }
  }
  return { authorized: true, event, user }
}
```

- [ ] **Step 3: Run to green and commit**

```bash
npm run verify:events
npx tsc --noEmit
git add src/lib/impact-lab/event-access.ts scripts/verify-events.ts
git commit -m "feat(impact-lab): two-tier event access control"
```

---

### Task 6: Admin events API (list, create, update)

**Files:**
- Create: `src/app/api/admin/impact-lab/events/route.ts`
- Reference (read first): `src/app/api/admin/impact-lab/rubric/route.ts` for the house route shape (CSRF, rate limit, audit log if used there, error style).

**Interfaces:**
- Consumes: `checkApiPermission` (rbac), `listEvents`, `getEventByCohort`, `eventHasParticipants` (Task 4), `canTransition`, `validCohort`, `EVENT_STATUSES` (Task 3), `withCsrfProtection` from `@/lib/csrf`, `prisma`, Zod.
- Produces HTTP contract for Task 7's UI:
  - `GET` → `{ success: true, data: { events: SerializedEvent[], organisations: { id, slug, name }[] } }` where `SerializedEvent` = `EventRecord` with `createdAt` as ISO string.
  - `POST` body `{ organisationId, cohort, name, titleLead, titleAccent, dates, location, formatNote, groundRules? }` → `{ success: true, data: { event } }` (created as DRAFT) | 400 with named error | 409 when the cohort slug exists.
  - `PATCH` body `{ cohort, status? , name?, titleLead?, titleAccent?, dates?, location?, formatNote?, groundRules? }` → `{ success: true, data: { event } }` | 400 with the `canTransition` reason.

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { canTransition, validCohort, EVENT_STATUSES } from "@/lib/impact-lab/event-lifecycle"
import {
  eventHasParticipants,
  getEventByCohort,
  listEvents,
  type EventRecord,
} from "@/lib/impact-lab/event-store"
import { checkEventAccess } from "@/lib/impact-lab/event-access"

/**
 * Event CRUD for the admin dashboard. Creating an event needs the platform
 * impact-lab `create` permission (org members creating their own events is
 * sub-project 6); editing and status changes go through checkEventAccess so
 * an organisation's members can manage their own event via the API today.
 */

function serialize(event: EventRecord) {
  return { ...event, createdAt: event.createdAt.toISOString() }
}

const brandingFields = {
  name: z.string().trim().min(1).max(200),
  titleLead: z.string().trim().min(1).max(100),
  titleAccent: z.string().trim().min(1).max(100),
  dates: z.string().trim().min(1).max(100),
  location: z.string().trim().min(1).max(200),
  formatNote: z.string().trim().min(1).max(2000),
  groundRules: z.string().trim().max(20_000).optional(),
}

const createSchema = z.strictObject({
  organisationId: z.string().min(1),
  cohort: z.string(),
  ...brandingFields,
})

const patchSchema = z.strictObject({
  cohort: z.string(),
  status: z.enum(EVENT_STATUSES).optional(),
  ...Object.fromEntries(
    Object.entries(brandingFields).map(([key, schema]) => [key, schema.optional()])
  ),
})

export async function GET() {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response
  const [events, organisations] = await Promise.all([
    listEvents(),
    prisma.organisation
      .findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } })
      .catch(() => []),
  ])
  return NextResponse.json({
    success: true,
    data: { events: events.map(serialize), organisations },
  })
}

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError
  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid event" },
      { status: 400 }
    )
  }
  const cohort = validCohort(parsed.data.cohort)
  if (!cohort) {
    return NextResponse.json(
      { success: false, error: "Cohort slug must be lowercase letters, digits and hyphens." },
      { status: 400 }
    )
  }
  if (await getEventByCohort(cohort)) {
    return NextResponse.json(
      { success: false, error: `An event already owns the slug "${cohort}".` },
      { status: 409 }
    )
  }
  const { organisationId, cohort: _raw, groundRules, ...branding } = parsed.data
  await prisma.impactLabEvent.create({
    data: { organisationId, cohort, status: "DRAFT", groundRules: groundRules ?? null, ...branding },
  })
  const event = await getEventByCohort(cohort)
  return NextResponse.json({ success: true, data: { event: event ? serialize(event) : null } })
}

export async function PATCH(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid update" },
      { status: 400 }
    )
  }
  const cohort = validCohort(parsed.data.cohort)
  if (!cohort) {
    return NextResponse.json({ success: false, error: "Unknown event." }, { status: 400 })
  }

  const access = await checkEventAccess(cohort, "edit")
  if (!access.authorized) return access.response
  if (!access.event) {
    return NextResponse.json({ success: false, error: "Unknown event." }, { status: 404 })
  }

  const { cohort: _cohort, status, ...brandingUpdates } = parsed.data
  if (status && status !== access.event.status) {
    const verdict = canTransition(access.event.status, status, await eventHasParticipants(cohort))
    if (!verdict.ok) {
      return NextResponse.json({ success: false, error: verdict.reason }, { status: 400 })
    }
  }

  await prisma.impactLabEvent.update({
    where: { cohort },
    data: {
      ...(status ? { status } : {}),
      ...Object.fromEntries(Object.entries(brandingUpdates).filter(([, v]) => v !== undefined)),
    },
  })
  const event = await getEventByCohort(cohort)
  return NextResponse.json({ success: true, data: { event: event ? serialize(event) : null } })
}
```

Adapt to the house shape found in the rubric route reference read: if it rate-limits admin writes or writes an audit-log entry (`@/lib/audit-log`), do the same here — status changes and event creation are exactly the class of action the audit log exists for. Match its call signature precisely.

- [ ] **Step 2: Gate and commit**

```bash
npx tsc --noEmit
npm run build
git add src/app/api/admin/impact-lab/events/route.ts
git commit -m "feat(impact-lab): admin events API with lifecycle-guarded status changes"
```

---

### Task 7: Admin UI — Events tab and selector rewire

**Files:**
- Create: `src/components/admin/impact-lab/EventsTab.tsx`
- Modify: `src/components/admin/impact-lab/ImpactLabDashboard.tsx` (add the tab where the existing tabs are registered)
- Modify: `src/app/api/admin/impact-lab/cohorts/route.ts` (seed from the Event table; derive `isActive` from status)
- Reference (read first): `src/components/admin/impact-lab/CohortSelector.tsx` and its `useCohorts.ts` hook, and the existing tab pattern inside `ImpactLabDashboard.tsx` (e.g. the RubricTab added in the rubric-builder work) — copy the visual idiom, not invent one.

**Interfaces:**
- Consumes: Task 6's HTTP contract; existing `csrfHeaders` from `@/lib/csrf-client`.
- Produces: an "Events" tab an admin uses to (a) see all events with org + status, (b) create an event (DRAFT), (c) move an event through DRAFT→LIVE→CLOSED→ARCHIVED with the server's refusal reasons surfaced verbatim.

- [ ] **Step 1: Rewire the cohorts route**

In `src/app/api/admin/impact-lab/cohorts/route.ts`:

1. Replace `import { CURRENT_COHORT } from "@/lib/impact-lab/constants"` with `import { listEvents, defaultAdminCohort } from "@/lib/impact-lab/event-store"`.
2. At the top of `GET`, add `const [events, activeCohort] = await Promise.all([listEvents(), defaultAdminCohort()])` (fold into the existing `Promise.all`).
3. Replace the seed line `summaryFor(CURRENT_COHORT)` with a loop that seeds every non-archived event and enriches the summary:

```ts
  for (const event of events) {
    if (event.status === "ARCHIVED") continue
    const summary = summaryFor(event.cohort)
    summary.eventName = event.name
    summary.status = event.status
  }
```

4. Extend `CohortSummary` with `eventName: string | null` and `status: string | null` (initialise both to `null` in `summaryFor`), and change the `isActive` initialisation from `cohort === CURRENT_COHORT` to `cohort === activeCohort`.
5. Update the `isActive` doc comment: the fallback cohort is now the newest non-archived event (LIVE preferred), not the env var.

- [ ] **Step 2: Build the Events tab**

Create `src/components/admin/impact-lab/EventsTab.tsx` as a `"use client"` component following the dashboard's existing tab idiom (Terminal Noir tokens, `font-mono`, the same card/border classes as the tab you read in the reference step). Structure — all data via `GET /api/admin/impact-lab/events`, mutations via `POST`/`PATCH` with `await csrfHeaders()`:

- A table of events: name, organisation name, cohort slug, status chip (color by status: `--green-primary` LIVE, `--text-dim` DRAFT, `--amber` CLOSED, `--red` ARCHIVED), created date.
- Per row, buttons for exactly the transitions `canTransition` allows from the current status — mirror the graph client-side for which buttons to SHOW (`DRAFT: [Launch]`, `LIVE: [Close, Back to draft]`, `CLOSED: [Reopen, Archive]`, `ARCHIVED: [Unarchive]`), but the server remains the authority: render any PATCH error message verbatim next to the row (`role="alert"`).
- A "New event" form: organisation `<select>` (from the GET payload), and text inputs for cohort slug, name, titleLead, titleAccent, dates, location, formatNote (textarea), groundRules (textarea, optional). Client-side slug hint: lowercase letters/digits/hyphens. On success, refresh the list and clear the form.
- Loading and error states per the existing tab idiom (spinner line + `role="alert"` retry block, as in `SubmitProject.tsx`).

Then register the tab in `ImpactLabDashboard.tsx` exactly the way the rubric tab is registered (same tab-list entry shape, same conditional render).

- [ ] **Step 3: Gate and commit**

```bash
npx tsc --noEmit
npm run build
git add src/components/admin/impact-lab/EventsTab.tsx src/components/admin/impact-lab/ImpactLabDashboard.tsx src/app/api/admin/impact-lab/cohorts/route.ts
git commit -m "feat(impact-lab): events admin tab with lifecycle controls"
```

---

### Task 8: DB-backed closed-cohort guard

**Files:**
- Modify: `src/lib/impact-lab/cohort-guard.ts`
- Modify (every caller of `guardClosedCohort` — find them with `grep -rn "guardClosedCohort" src/`; the known set): `src/app/api/impact-lab/submission/route.ts`, `src/app/api/impact-lab/team/roster/route.ts`, `src/app/api/impact-lab/team/leader/route.ts`, `src/app/api/impact-lab/team/route.ts`, `src/app/api/impact-lab/check-in/route.ts`, `src/app/api/impact-lab/profile/route.ts` — trust the grep over this list.

**Interfaces:**
- Consumes: `getEventByCohort` (Task 4), `isCohortActive` (constants — still present until Task 12).
- Produces: `export async function guardClosedCohort(cohort: string): Promise<NextResponse | null>` — same name, now async and status-backed.

- [ ] **Step 1: Rework the guard**

Replace the body of `src/lib/impact-lab/cohort-guard.ts`:

```ts
import { NextResponse } from "next/server"
import { isCohortActive } from "./constants"
import { getEventByCohort } from "./event-store"

/**
 * Refuse member-facing writes unless the cohort's event is LIVE.
 *
 * The dashboard already hides these affordances, but hiding a button is a
 * presentation choice, not a guarantee — the endpoints stay reachable to
 * anything holding a session cookie. After an event the participant set,
 * rosters, check-ins and submissions are the historical record of what
 * happened, and a late write silently rewrites that record.
 *
 * Status comes from the Event row. Pre-migration (no row anywhere) the old
 * env-var behaviour still answers, so an un-migrated environment keeps
 * working exactly as before.
 *
 * Reads are deliberately untouched: people should still be able to see their
 * team and what they built.
 */
export async function guardClosedCohort(cohort: string): Promise<NextResponse | null> {
  const event = await getEventByCohort(cohort)
  const open = event ? event.status === "LIVE" : isCohortActive(cohort)
  if (open) return null
  return NextResponse.json(
    {
      success: false,
      error:
        "This event has closed. Your team and submission are kept as a record and can no longer be changed.",
    },
    { status: 403 },
  )
}
```

- [ ] **Step 2: Await every call site**

In each caller, change `const closed = guardClosedCohort(...)` to `const closed = await guardClosedCohort(...)`. tsc enforces completeness: an un-awaited call now assigns a `Promise` and the `if (closed) return closed` misuse fails the `NextResponse | null` narrowing — run `npx tsc --noEmit` and fix every error it names.

- [ ] **Step 3: Gate and commit**

```bash
npx tsc --noEmit
git add src/lib/impact-lab/cohort-guard.ts src/app/api/impact-lab
git commit -m "feat(impact-lab): closed-cohort guard reads event status from the database"
```

---

### Task 9: Member surfaces resolve by membership

**Files (the member sweep — every file here imports `CURRENT_COHORT` or `CURRENT_COHORT_LABEL` today):**
- Modify: `src/app/api/impact-lab/submission/route.ts`
- Modify: `src/app/api/impact-lab/team/route.ts`
- Modify: `src/app/api/impact-lab/team/search/route.ts`
- Modify: `src/app/api/impact-lab/team/roster/route.ts`
- Modify: `src/app/api/impact-lab/team/leader/route.ts`
- Modify: `src/app/api/impact-lab/results/route.ts`
- Modify: `src/app/api/impact-lab/profile/route.ts`
- Modify: `src/app/api/impact-lab/check-in/route.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/impact-lab/page.tsx`

**Interfaces:**
- Consumes: `resolveMemberEvent`, `resolveMemberEvents` (Task 4), `validCohort` (Task 3), existing `checkMemberAccess` from `./member` (unchanged — it authenticates; event resolution is a separate step after it).
- Produces: every member route operates on `memberEvent.cohort` instead of `CURRENT_COHORT`; GET responses gain `eventName: string` and `eventCohort: string` so the dashboard can display which event it is showing.

**The transformation rule, applied per file.** Each member route today has the shape:

```ts
const check = await checkMemberAccess()
if (!check.authorized) return check.response
// ...queries keyed by { cohort: CURRENT_COHORT, ... }
```

It becomes:

```ts
const check = await checkMemberAccess()
if (!check.authorized) return check.response
const memberEvent = await resolveMemberEvent(
  check.email,
  validCohort(new URL(request.url).searchParams.get("cohort"))
)
if (!memberEvent) {
  // exactly the route's existing "not a participant / no team" response
}
// ...queries keyed by { cohort: memberEvent.cohort, ... }
```

Notes that make this mechanical rather than judgment:
1. Routes whose handler signature lacks `request` gain it (`export async function GET(request: NextRequest)`); POST/PUT handlers read the optional cohort from the query string too (not the body — bodies are already Zod-strict and must not gain a field).
2. `resolveMemberEvent` already returns the caller's `participantId` — routes that currently look up the participant row by `cohort_email` (e.g. `resolveContext` in the submission route) use `memberEvent.participantId` and `memberEvent.cohort` and DELETE their own participant lookup. In the submission route, `resolveContext(email)` becomes `resolveContext(memberEvent)` keeping its run/team logic.
3. Where a route treats "no participant row" as a distinct state (e.g. profile returning a self-registration prompt), `resolveMemberEvent === null` maps to that same state.
4. The profile/self-registration surface used `CURRENT_COHORT_LABEL` to name the live event. It now uses `memberEvent.name` — and for the not-yet-registered case (no membership anywhere), it names the newest LIVE event: add and use `export async function openRegistrationEvent(): Promise<EventRecord | null>` in `event-store.ts` returning the newest LIVE event or null, and show the registration invitation ONLY when it is non-null (this reproduces today's "no event live → read-only, no invitation" behaviour, which was the point of the env var being unset).
5. `src/app/dashboard/impact-lab/page.tsx` (server component): fetch `resolveMemberEvents(session.email)`; when >1, render a plain event switcher — a row of `<Link href="?cohort=<slug>">` chips above the existing content, current one highlighted — and pass the picked event's `cohort` down to the client components, which append it as `?cohort=` on their API calls. When 0 or 1, render exactly as today (no switcher).
6. Worked example — the submission route GET, fully transformed:

```ts
export async function GET(request: NextRequest) {
  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const memberEvent = await resolveMemberEvent(
    check.email,
    validCohort(new URL(request.url).searchParams.get("cohort"))
  )
  if (!memberEvent) {
    return NextResponse.json({ success: true, status: "no_team" })
  }

  const context = await resolveContext(memberEvent)
  if (!context) {
    return NextResponse.json({ success: true, status: "no_team", eventName: memberEvent.name })
  }

  const existing = await prisma.impactLabSubmission.findUnique({
    where: { runId_teamId: { runId: context.runId, teamId: context.teamId } },
  })

  return NextResponse.json({
    success: true,
    status: submissionWindow(context.closeAt, new Date()),
    teamName: context.teamName,
    eventName: memberEvent.name,
    eventCohort: memberEvent.cohort,
    closeAt: context.closeAt ? context.closeAt.toISOString() : null,
    submission: existing ? await toView(existing) : undefined,
  })
}
```

with `resolveContext` reduced to:

```ts
async function resolveContext(memberEvent: MemberEvent): Promise<ResolvedContext | null> {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: memberEvent.cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, submissionsCloseAt: true },
  })
  if (!run) return null
  const teams = extractFrozenTeams(run.result)
  if (!teams) return null
  const teamRef = findTeamFor(teams, memberEvent.participantId)
  if (!teamRef) return null
  return {
    participantId: memberEvent.participantId,
    runId: run.id,
    teamId: teamRef.teamId,
    teamName: teamRef.teamName,
    closeAt: run.submissionsCloseAt,
  }
}
```

(`lastEditedName` in the same file keeps a cohort-scoped lookup — pass it `memberEvent.cohort` as a parameter instead of reading `CURRENT_COHORT`.)

- [ ] **Step 1:** Transform the eight API routes per the rule above, running `npx tsc --noEmit` after each file.
- [ ] **Step 2:** Transform the two dashboard pages (note 5), plus whichever client components under `src/app/dashboard/impact-lab/` need the `cohort` prop threaded (tsc + grep for their fetch calls will name them).
- [ ] **Step 3:** Gate: `npx tsc --noEmit` and `npm run build` clean; `grep -rn "CURRENT_COHORT" src/app/api/impact-lab src/app/dashboard` returns ONLY the pitch-timer route (Task 10's).
- [ ] **Step 4: Commit**

```bash
git add src/app/api/impact-lab src/app/dashboard src/lib/impact-lab/event-store.ts
git commit -m "feat(impact-lab): member surfaces resolve their event by membership"
```

---

### Task 10: Admin and judge surfaces stop reading the env default

**Files (the admin sweep — from `grep -rln "CURRENT_COHORT\|safeCohort\|COHORT_LABEL" src/`):**
- Modify: all 21 routes under `src/app/api/admin/impact-lab/` still importing from `constants` (judging + its 5 subroutes, results + its 4 subroutes, participants + its 2 subroutes, submissions + export, reviews, rematch, runs, notify, explain, match, rubric)
- Modify: `src/app/api/impact-lab/judge-events/route.ts`
- Modify: `src/app/api/impact-lab/pitch-timer/route.ts`
- Modify: `src/app/admin/impact-lab/page.tsx`, `src/app/admin/impact-lab/judge/page.tsx`, `src/app/admin/impact-lab/judge/JudgeDashboard.tsx`, `src/components/admin/impact-lab/ImpactLabDashboard.tsx` (whatever the grep shows in each — mostly labels and default props)
- Modify: `src/app/judge/PitchTimer.tsx` and its parent judge screen (thread the cohort prop)

**Interfaces:**
- Consumes: `resolveAdminCohort` (Task 4), `validCohort` (Task 3), `defaultAdminCohort` (Task 4).
- Produces: no route or page under admin/judge reads `CURRENT_COHORT`, `CURRENT_COHORT_LABEL`, or `safeCohort`.

**Transformation rules:**

1. **Admin API routes.** Every occurrence of `const cohort = safeCohort(<expr>)` becomes `const cohort = await resolveAdminCohort(<expr>)`, with the import swapped from `constants` to `event-store`. The `<expr>` (query param read) is unchanged. Handlers already async — no signature changes. Where a route used `CURRENT_COHORT` directly with no param read, it becomes `await defaultAdminCohort()`.
2. **Judge events route.** Replace the `CURRENT_COHORT`-first ordering (lines 111–114) with LIVE-events-first: fetch `const events = await listEvents()` once, build `const liveCohorts = new Set(events.filter(e => e.status === "LIVE").map(e => e.cohort))`, then partition on `liveCohorts.has(e.cohort)`. Additionally, when `events.length > 0`, drop runs whose cohort's event is missing or is `DRAFT`/`ARCHIVED` from the open list (visibility per the spec); when `events.length === 0` (pre-migration), keep today's behaviour untouched.
3. **Pitch timer.** The route's cohort comes from the judge's picked event, not a global: accept `?cohort=` (GET) / body `cohort` (POST), validated with `validCohort`, falling back to `await defaultAdminCohort()`. In the judge screen, pass the picked event's cohort into `<PitchTimer cohort={...} />` and append it to both fetches inside `PitchTimer.tsx`.
4. **Admin pages/components.** Where `CURRENT_COHORT` seeds an initial selector value in a server component, use `await defaultAdminCohort()`. Where `CURRENT_COHORT_LABEL` renders a heading, use the event's `name` from the cohorts payload (Task 7 added `eventName` to it) with the slug as fallback.

- [ ] **Step 1:** Sweep the 21 admin routes (rule 1), `npx tsc --noEmit` after each few files.
- [ ] **Step 2:** Judge events ordering + visibility (rule 2).
- [ ] **Step 3:** Pitch timer cohort threading (rule 3).
- [ ] **Step 4:** Admin pages and components (rule 4).
- [ ] **Step 5:** Gate: `npx tsc --noEmit`, `npm run build`, and `grep -rn "CURRENT_COHORT\|safeCohort" src/ --include="*.ts" --include="*.tsx" | grep -v "lib/impact-lab/constants"` returns nothing.
- [ ] **Step 6: Commit**

```bash
git add src/app src/components
git commit -m "feat(impact-lab): admin and judge surfaces resolve events from the database"
```

---

### Task 11: Branding becomes DB-backed  *(requires PR #107 merged)*

**Files:**
- Modify: `src/lib/impact-lab/event-branding.ts`
- Modify: the three export call sites of `brandingForCohort` (on the post-#107 main: `src/lib/impact-lab/export-data.ts`, `src/lib/impact-lab/export-pdf.ts`, `src/lib/impact-lab/export-excel.ts` — confirm with `grep -rn "brandingForCohort" src/`)

**Interfaces:**
- Consumes: `getEventByCohort` (Task 4).
- Produces: `export async function brandingForCohort(cohort: string): Promise<EventBranding>` — same name and semantics, now async; the `EventBranding` interface, `IMPACT_LAB_BRANDING`, `AFRETEC_BRANDING`, and `REPORT_PRODUCER` exports are unchanged.

- [ ] **Step 1: Make the resolver DB-backed**

In `event-branding.ts`, replace the `BRANDING_BY_COHORT` lookup at the bottom (the constants above it stay exactly as they are — they are now the fallback layer, the evolution the module's own doc comment anticipates):

```ts
import { getEventByCohort } from "./event-store"

/** Code-constant fallbacks for the two events that predate the Event table. */
const BRANDING_BY_COHORT: Readonly<Record<string, EventBranding>> = {
  "afretec-makerthon-2026-08": AFRETEC_BRANDING,
}

/**
 * The branding a cohort's exports print, from the Event row when one exists.
 *
 * Never throws on an unknown cohort — an organiser generating a report mid
 * event must not hit an error page because a slug was typed differently
 * somewhere. Resolution order: Event row → per-cohort code constant →
 * Impact Lab default.
 */
export async function brandingForCohort(cohort: string): Promise<EventBranding> {
  const event = await getEventByCohort(cohort)
  if (event) {
    return {
      titleLead: event.titleLead,
      titleAccent: event.titleAccent,
      title: event.name,
      dates: event.dates,
      host: event.organisationName,
      location: event.location,
      formatNote: event.formatNote,
      ...(event.organisationName !== REPORT_PRODUCER
        ? { platformNote: `Run on the Impact Lab platform by ${REPORT_PRODUCER}` }
        : {}),
    }
  }
  return BRANDING_BY_COHORT[cohort] ?? IMPACT_LAB_BRANDING
}
```

(`REPORT_PRODUCER` is declared above in this module — move its declaration above this function if it currently sits below.)

- [ ] **Step 2: Await the call sites**

`grep -rn "brandingForCohort" src/` — at each call site, add `await` (all three exporters are already async server-side code paths; tsc names any that aren't).

- [ ] **Step 3: Gate and commit**

```bash
npx tsc --noEmit
npm run build
git add src/lib/impact-lab
git commit -m "feat(impact-lab): export branding resolves from the Event row"
```

---

### Task 12: Retire the env-var constants

**Files:**
- Modify: `src/lib/impact-lab/constants.ts` (shrink to `DEFAULT_COHORT` only)
- Modify: `src/lib/impact-lab/cohort-guard.ts` (drop the `isCohortActive` fallback import — replace `isCohortActive(cohort)` with `false`; pre-migration environments are gone once this ships together with the migration)
- Modify: `docs/impact-lab/16-running-another-event.md` (the runbook)
- Modify: whatever else `npx tsc --noEmit` names.

**Interfaces:**
- Consumes: everything above.
- Produces: `constants.ts` exports exactly one symbol, `DEFAULT_COHORT` (still the event-store fallback for pre-migration degrade). `ACTIVE_COHORT`, `CURRENT_COHORT`, `CURRENT_COHORT_LABEL`, `isCohortActive`, `safeCohort` no longer exist — any surviving consumer is a compile error, which is the point.

- [ ] **Step 1: Shrink constants.ts**

Replace the whole file with:

```ts
/**
 * The pre-tenancy fallback cohort. Every "which event?" question is now
 * answered from the Event table (src/lib/impact-lab/event-store.ts); this
 * slug remains only as the degrade target for an environment whose tenancy
 * migration has not run yet.
 */
export const DEFAULT_COHORT = "impact-lab-2026-07"
```

- [ ] **Step 2: Fix what the compiler names**

```bash
npx tsc --noEmit
```

Every error is an unconverted consumer of the deleted symbols. Convert each with the matching rule from Tasks 8–10 (member surface → `resolveMemberEvent`; admin surface → `resolveAdminCohort`/`defaultAdminCohort`; guard fallback → `false` per the file list above). Do NOT re-add any deleted export to silence an error.

- [ ] **Step 3: Update the runbook**

In `docs/impact-lab/16-running-another-event.md`, replace the `IMPACT_LAB_ACTIVE_COHORT`/`IMPACT_LAB_COHORT_LABEL`/redeploy instructions with the dashboard flow: Admin → Impact Lab → Events tab → create event (DRAFT) → Launch when ready → Close after → Archive later. State explicitly that several events can be LIVE at once and that closing one event no longer takes anything else offline.

- [ ] **Step 4: Full gate**

```bash
npm run verify:events
npm run verify:judging
npx tsc --noEmit
npm run build
grep -rn "IMPACT_LAB_ACTIVE_COHORT\|IMPACT_LAB_COHORT_LABEL\|CURRENT_COHORT\|safeCohort\|isCohortActive" src/
```

Expected: both verify scripts pass, tsc and build clean, grep returns nothing.

- [ ] **Step 5: Commit**

```bash
git add src docs
git commit -m "feat(impact-lab)!: retire IMPACT_LAB_ACTIVE_COHORT — events live in the database"
```

(The `!` is deliberate: deploying this without the migration + seed breaks event resolution — see the deploy checklist.)

---

## Deploy checklist (hand-off — NOT part of plan execution)

Executed by the driver session with the user, after the PR is reviewed and merged. In order, because step 4 depends on 1–3:

1. **Migrate production** over the SSH tunnel to the DB VPS (direct port 5433, never PgBouncer 6432), per the established runbook: `npx prisma migrate deploy` with the tunnel URL.
2. **Seed production**: `npm run seed:events` (dry-run, inspect) then `-- --apply`, same tunnel.
3. **Merge deploys** the code via Vercel auto-deploy from main.
4. **Remove the env vars** in Vercel: `IMPACT_LAB_ACTIVE_COHORT`, `IMPACT_LAB_COHORT_LABEL` (they are dead code after Task 12; removing them avoids a false belief they still do something). Redeploy is triggered by the merge anyway.
5. **Smoke-check**: admin Events tab lists both backfilled events as CLOSED; the July and August dashboards still render read-only; report export still prints Afretec branding for the August cohort.

## Self-review record

- **Spec coverage:** models/backfill → Tasks 1–2; lifecycle + no-redeploy status → Tasks 3, 6, 7; membership resolution incl. multi-event picker → Task 9; judge filter + admin default → Task 10; `checkEventAccess` two-tier auth → Tasks 5–6; DB-backed `guardClosedCohort` → Task 8; async DB-backed `brandingForCohort` → Task 11; `CURRENT_COHORT` deletion + runbook → Task 12; verify script → Tasks 3, 5, 12. P2021 degrade → Tasks 4, 5, 8, 11 (via store).
- **Known deviations from spec, both narrowings not omissions:** the spec's "org members manage via existing admin panel" is API-level only (page-level RBAC unchanged — spec §6 says CCK staff operate the UI until sub-project 6). `resolveMemberEvents`' pre-migration degrade returns a stub record for `DEFAULT_COHORT` membership so un-migrated environments behave exactly as today.
- **Type consistency:** `EventStatusValue`/`EventRecord`/`MemberEvent`/`EventAction` names and shapes checked across Tasks 3–11; `guardClosedCohort` async signature consistent between Tasks 8 and 12.
