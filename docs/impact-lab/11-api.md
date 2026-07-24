# 11 — API Layer

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

The API is where the pure engine meets the real world: authentication, the
database, CSRF, rate limiting, audit logging. Every route follows the repo's
established admin pattern — nothing bespoke.

## Shared helpers (`src/lib/impact-lab/`)

Small modules that keep the routes thin and the engine boundary clean:

- **`mappers.ts`** — `toMatchParticipant(row)` turns a Prisma row into the
  engine's plain `MatchParticipant`. This is *the* boundary that lets the engine
  stay Prisma-free: the DB layer imports the engine's types, never the reverse.
- **`settings.ts`** — validates the organiser's (partial) settings with Zod and
  merges them over `DEFAULT_SETTINGS`. Weights merge field-by-field, so tweaking
  one weight doesn't reset the others.
- **`participant-schema.ts`** — one Zod schema (`participantDraftSchema`) shared
  by create, edit, and import, with the repo's sanitizers applied to every text
  field. Arrays are validated and trimmed.
- **`csv.ts`** — dependency-free RFC-4180 CSV serialization for exports.

## Participant routes

| Route | Method | Permission | Notes |
|-------|--------|-----------|-------|
| `/participants` | GET | `view` | List a cohort |
| `/participants` | POST | `create` | Create one; 409 on duplicate email |
| `/participants/[id]` | PATCH | `edit` | Edit; guards email uniqueness |
| `/participants/[id]` | DELETE | `delete` | Delete |
| `/participants/import` | POST | `create` | Bulk upsert on (cohort, email) |
| `/participants/export` | GET | `view` | CSV download |

Every mutating route: `withCsrfProtection` → `checkApiPermission` → Zod validate
→ act → `logAudit`. That ordering is deliberate — reject a forged or
unauthorized request before touching the body or the database.

## CSV import is resilient, not all-or-nothing

The client parses the CSV, maps columns, and splits multi-value cells, then posts
an array of drafts. The server validates **each row independently**: a bad row is
collected into an `errors[]` list with its row number, and the rest still import.
The response reports `{ created, updated, failed, errors }`. For a deadline
import from a Google Form export, "18 imported, 2 need fixing (rows 5, 11)" is far
more useful than a single rejection of the whole file.

Import upserts on `(cohort, email)` — re-importing a corrected sheet updates
existing people instead of duplicating them, which the scoped unique index makes
safe.

## Luma guest-list import is auto-detected

`isLumaExport(headers)` ([`luma.ts`](../../src/lib/impact-lab/luma.ts)) flags a
CSV as a Luma export by the presence of Luma's own `guest_id` and
`approval_status` columns. When detected, `mapLumaRows` maps Luma's custom
registration questions onto participant drafts by case-insensitive header
**prefix**, so a minor wording tweak in the Luma form doesn't silently break
the import; only `approval_status === "approved"` rows become participants,
with `notApproved` and `missingEmail` counted so the organiser sees the split
rather than a silently truncated list.

Every approved, emailed guest now imports with `consentToMatch: true` and
`consentToShareContact: true` — an organiser decision (2026-07-24) that
everyone who registered for a team-formation event is matchable and may share
contact details with teammates, with an opt-out still available from the
participant's own profile afterward. This replaces the earlier behaviour of
importing full-team declarers with `consentToMatch: false` for manual locked
placement: pre-formed teams named in the "if you have team-mates" question now
stay together automatically through the together-groups mechanism
([06](./06-algorithm.md)) instead of requiring the organiser to hand-build a
locked team.

## Why `blockedTeammates` is in export but not the AI payload

The participant CSV export includes `blockedTeammates` because it's the
organiser's own working data — they're the audience. The *AI layer* never sees it
([10-ai-layer.md](./10-ai-layer.md)), and the **final-teams** export
([13, runs](./06-algorithm.md)) only includes contact details for participants who
set `consentToShareContact`. Different audiences, different disclosure — decided
per route, not globally.

## Match, explain, and run routes

Built on the same pattern (next commit):

- `POST /match` — map cohort participants → engine → `runMatching` → return the
  result. Pure computation; nothing saved.
- `POST /explain` — hand a result to the Claude layer; rate-limited and audited.
- `/runs` — save a result as a frozen named run, list runs, view a snapshot,
  mark one final (atomic swap — unset the previous final in a transaction), and
  export the final teams.
