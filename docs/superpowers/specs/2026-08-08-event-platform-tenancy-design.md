# Multi-tenant event platform — design

**Date:** 2026-08-08
**Status:** Approved (approach C: full multi-tenancy now)
**Scope of this spec:** the overall architecture, and detailed requirements for
**sub-project 1: tenancy core**. Sub-projects 2–6 are summarised for context and
get their own specs.

## Why

The Impact Lab platform just ran its second event — the Afretec Makerthon
(8 August 2026, hosted by C4DLab, University of Nairobi) — on machinery built
for its first. It worked, but every event-specific fact had to be found and
generalised mid-event: the rubric, the judge event picker, the admin cohort
selector, the submission field rules, the report branding. The post-mortem
found structural gaps no amount of per-event patching fixes:

- **45% of teams were never judged** because submission was a de facto judging
  gate nobody announced — the platform had no way to state or enforce an
  event's own ground rules.
- **Switching events requires editing an env var and redeploying**
  (`IMPACT_LAB_ACTIVE_COHORT`), and doing so takes the previous event offline.
  Two events cannot be live at once.
- **Event configuration lives in code constants** (`judging-rubrics.ts`,
  `event-branding.ts`), so a new event means a developer, a PR, and a deploy.
- **Feedback coverage was 7 of 33 scorecards** — organisers had no tooling to
  turn scores into feedback teams actually receive.

The destination, per the founder's decision, is **a product other organisers
use**: any organisation runs its own hackathon on the platform, with CCK as
the platform operator. The late-August deadline needs only CCK self-serving
its own event through the admin UI — but the data and authorization model is
built multi-tenant from day one so that opening up to external organisers is
additive, not a rewrite.

## Goals

1. An `Event` is a database row an admin creates, configures, and takes
   through its lifecycle from the dashboard — no env vars, no deploys.
2. Every event belongs to an `Organisation`. Authorization is scoped: an
   organisation's members manage only their own events; platform admins (CCK
   staff) manage all.
3. Multiple events can be live simultaneously.
4. Existing production data (two cohorts, nine tables) is untouched — the
   migration is purely additive.

## Non-goals (for sub-project 1)

- Per-event config editing UI (tracks, submission fields, rubric wiring,
  judge codes) — **sub-project 2**.
- Event-creation wizard and the Claude setup advisor — **sub-project 3**.
- Participant comms / non-submitter chasing — **sub-project 4**.
- Claude-drafted team feedback and report narrative — **sub-project 5**.
- A standalone organiser portal for external organisers (signup, invites,
  onboarding) — **sub-project 6, post-August**. Until then, org-scoped events
  are managed from the existing admin panel by CCK staff.

## Architecture

### New models (Prisma)

```prisma
enum OrgRole {
  OWNER
  ORGANISER
}

enum EventStatus {
  DRAFT     // being set up; invisible to participants and judges
  LIVE      // participants can form teams and submit; judges can score
  CLOSED    // read-only for participants; reports and exports available
  ARCHIVED  // hidden from default listings; data retained
}

model Organisation {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  logoUrl      String?
  contactEmail String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  members OrganisationMember[]
  events  Event[]

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

model Event {
  id             String      @id @default(cuid())
  organisationId String
  /// The join key into the nine cohort-keyed Impact Lab tables. Unique —
  /// Event is the authoritative registry of cohort slugs.
  cohort         String      @unique
  name           String
  status         EventStatus @default(DRAFT)

  // Branding — replaces the code constants in event-branding.ts.
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

Sub-project 2 adds config columns to `Event` (`tracks Json?`,
`submissionFields Json?`, `judgeCodeHash String?`) in its own migration.

### The cohort string stays — Event owns it, nothing rewrites it

The cohort string is embedded in nine Impact Lab tables (participants, match
runs, scorecards, submissions, rubric overrides, pitch timer, …). **They all
keep their `cohort` columns unchanged.** `Event.cohort` (unique) becomes the
registry those strings resolve through. No foreign keys are added to the nine
tables in this sub-project — the join is by slug, matching how every existing
query already works. FKs can be introduced later if drift ever becomes a real
problem (YAGNI until then).

### Backfill (part of the migration's seed step)

| Organisation | Events |
|---|---|
| `cck` — Claude Community Kenya | `impact-lab-2026-07` (CLOSED) |
| `c4dlab` — C4DLab, University of Nairobi | `afretec-makerthon-2026-08` (CLOSED) |

Branding values are copied verbatim from the constants in
`src/lib/impact-lab/event-branding.ts`. Existing CCK admin users
(`SUPER_ADMIN`/`ADMIN`) are added as `OWNER` members of the CCK organisation.
C4DLab gets no members yet — platform admins manage its event, which is
exactly the operator relationship the Afretec weekend actually had.

Backfill runs as an idempotent seed script (`scripts/seed-events.ts`,
dry-run by default, `--apply` to write), following the house pattern from
`seed-hackathon-cohort.ts`.

### Event lifecycle replaces the env var

`IMPACT_LAB_ACTIVE_COHORT` and `IMPACT_LAB_COHORT_LABEL` are retired.
Status transitions happen from the admin dashboard (platform admin or org
member) with no redeploy.

**Refinement from the presented design:** the approved sketch had five
statuses including `JUDGING`. The spec uses four. Judging and submission
windows are already fine-grained flags on the match run (`judgingOpen`,
`submissionsCloseAt`) — a `JUDGING` status would be a second source of truth
for the same fact, and the Afretec event needed judging and submissions open
*concurrently*, which a linear status can't express. `LIVE` covers the whole
active period; the run flags say what is open within it.

What each status gates:

- **DRAFT** — excluded from participant resolution, the judge event picker,
  and public surfaces. Visible only in admin.
- **LIVE** — full behaviour as today: team formation, submissions (subject to
  `submissionsCloseAt`), judging (subject to `judgingOpen`).
- **CLOSED** — all participant and judge writes rejected (the existing
  `guardClosedCohort` becomes DB-backed: it reads the event's status instead
  of a hardcoded list). Reads, reports, exports still work.
- **ARCHIVED** — as CLOSED, and hidden from default admin/judge listings.

### Resolution — "which event?" without a global constant

This is the one place existing behaviour genuinely changes, so it is the most
heavily tested part of sub-project 1.

- **Participants** (`/dashboard/impact-lab`, member API routes): resolved by
  membership, not by a global. Look up the caller's participant rows (keyed by
  email) across all `LIVE` events, newest first. Zero rows → the current
  "no team" experience. One row → that event (the overwhelmingly common
  case). Multiple rows → an event picker, mirroring the judge picker shipped
  for Afretec.
- **Judges**: already solved — the judge event picker lists final runs with
  judging open; its query gains a `status: LIVE` filter.
- **Admin**: already solved — the cohort selector from PR #102 becomes an
  event selector backed by the `Event` table. The default selection changes
  from `CURRENT_COHORT` (env-derived) to the most recently created
  non-archived event.
- **`CURRENT_COHORT` is deleted** at the end of sub-project 1, along with
  `safeCohort`'s env-based fallback. Any call site that cannot name its event
  by then is a bug this refactor is designed to surface at compile time.
- **`brandingForCohort()`** becomes async and DB-backed (reading the Event
  row) with the existing code constants as fallback — the exact evolution its
  own doc comment anticipates. Callers (the three export paths) already run
  server-side and async.

### Authorization — two orthogonal layers

Site roles (`UserRole`) are untouched and become the **platform tier**:
`SUPER_ADMIN`/`ADMIN` (CCK staff) pass every event check. `OrganisationMember`
is the **tenant tier**: membership grants access to that organisation's events
only.

One new helper in `src/lib/impact-lab/event-access.ts`:

```ts
/** Authorizes the caller for an event: platform admin, or member of the
 *  event's organisation. Returns the event row on success so callers never
 *  fetch it twice. */
async function checkEventAccess(eventIdOrCohort: string):
  Promise<{ authorized: true; event: Event } | { authorized: false; response: NextResponse }>
```

Every admin Impact Lab API route swaps its bare `checkApiPermission("impact-lab", …)`
call for `checkApiPermission` **plus** `checkEventAccess` — platform
permission says *what actions* the role allows; event access says *which
events* it allows them on. Public participant/judge routes are unchanged:
they authorize by session membership and judge cookie as today.

### Error handling

House patterns, unchanged:

- Missing tables (P2021) before the migration reaches an environment →
  degrade: resolution helpers fall back to the code-constant behaviour and
  admin config surfaces return 503 naming the migration, as `rubric-store.ts`
  does today.
- Resolution helpers never throw on unknown cohorts — an event row that
  doesn't exist resolves to safe fallbacks (Impact Lab branding, no access),
  never an error page mid-event.
- Status transitions validate server-side (no LIVE → DRAFT once participants
  exist; ARCHIVED requires CLOSED first).

### Testing

- `scripts/verify-events.ts` — assertion script in the style of
  `verify-judging.ts` (63 assertions): resolution precedence (zero / one /
  many live events per participant), status gating per surface, backfill
  idempotency, access-check matrix (platform admin × org member × outsider ×
  each status).
- Gate before every commit: `npx tsc --noEmit` and `npm run build` clean.
- Migration rehearsed against a local database with the production schema
  before it goes anywhere near the VPS; applied to production over the SSH
  tunnel (direct port, not PgBouncer) per the established runbook.

## Sub-project sequence

1. **Tenancy core** *(this spec)* — models, migration, backfill, lifecycle,
   resolution, access control, env-var retirement.
2. **Event config** — tracks, ground-rules display, submission-field config
   (the "deck-only" Afretec lesson as a per-event setting), per-event judge
   codes, rubric wiring; freeze rules per the table in the approved design.
3. **Creation wizard + Claude setup advisor** — propose-only, server
   revalidates, per the rubric-extract pattern.
4. **Activation** — participant comms, non-submitter chasing, Claude drafts.
5. **Claude authoring** — team feedback drafts, report narrative.
6. **Organiser portal** — external organisers, invites, onboarding
   *(post-August)*.

**Late-August MVP = sub-projects 1–3.**
