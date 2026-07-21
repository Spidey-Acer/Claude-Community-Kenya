# 01 — Data Model

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.
> Each doc in this folder explains one logical chunk so the feature doubles as a
> learning reference.

## What we added

Two Prisma models and one enum in `prisma/schema.prisma`, plus a hand-authored
migration at `prisma/migrations/20260721160000_impact_lab_matching/`.

- `ImpactLabParticipant` — one hackathon applicant.
- `ImpactLabMatchRun` — a frozen snapshot of one matching run.
- `ImpactLabExperience` — `BEGINNER | INTERMEDIATE | ADVANCED`.

## Decisions worth understanding

### 1. Why a new experience enum instead of reusing `Experience`

The repo already has an `Experience` enum, but it tracks *Claude familiarity*
(`never_used → claude_ai → claude_code → api_builder`). The matcher needs a
generic *skill ladder* to balance strong and new builders across teams. Those are
different axes — forcing one to serve both would couple the matcher to a
Claude-specific vocabulary it has no reason to care about. New enum, clean model.

**Lesson:** reuse a type only when the *meaning* matches, not just the shape.

### 2. Native `String[]` over `Json` arrays

Older models in this repo store arrays as `Json` (e.g. `BlogPost.tags`). Newer
ones use Postgres native arrays (`Event.audiences Audience[]`). We use `String[]`
for `technicalSkills`, `interests`, etc. because:

- The matcher iterates and set-intersects these constantly — native arrays are
  typed as `string[]` by Prisma with no `JSON.parse`/casting at every read.
- They're queryable (`has`, `hasSome`) if we ever need to filter server-side.

### 3. `@@unique([cohort, email])` — scoped uniqueness

Email is unique *within a cohort*, not globally. The same person can attend a
future Impact Lab under a new cohort string without a collision, and CSV re-import
into the same cohort can safely upsert on `(cohort, email)`.

### 4. Snapshotting: `settings` + `participantsSnapshot` + `result` as `Json`

A match run captures everything it needs to be re-read identically later, even
after participants are edited or deleted. This is the antidote to the audited
project's localStorage approach — runs are durable rows, not browser state. We
store them as `Json` because their shape is owned by the matching engine
(`src/lib/matching/types.ts`), not the database; the DB is just a safe.

### 5. `isFinal` enforced in the API layer, not the DB

Postgres can express "at most one final per cohort" with a partial unique index,
but that would make swapping the final run a two-statement dance that can
transiently violate the constraint. Enforcing it in the API (unset the old final,
set the new one, in a transaction) keeps the swap atomic and the rule readable
where it's actually applied. Documented as a deliberate trade-off.

### 6. `createdBy` uses `onDelete: SetNull`

Every user-linked model in this repo detaches rather than cascades
(`onDelete: SetNull`). Deleting an admin should never delete the match-run
history they happened to generate. We follow the house pattern.

## Applying the migration

This environment has no `DATABASE_URL`, so the migration SQL was hand-authored to
match Prisma's own output format (compare against
`prisma/migrations/20260324091654_community_hub/`). Against a real database:

```bash
npm run db:migrate      # prisma migrate dev — applies the pending migration
```

Because the SQL already reflects the exact schema diff, `migrate dev` applies it
as-is without generating a second migration. **Never** `prisma migrate reset` on
a database with real applications in it.
