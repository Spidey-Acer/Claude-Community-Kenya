# Database objects Prisma cannot express

Some PostgreSQL objects this schema depends on cannot be written in
`schema.prisma`. Prisma has no syntax for them, so every `prisma migrate diff`
run compares the database against a datamodel that does not contain them and
proposes to **drop** them. It will do this forever. It is not drift and it is
not fixable by editing the schema.

This file is the register. If a diff proposes dropping something listed here,
delete that line from the generated migration. If a diff proposes dropping
something **not** listed here, stop — that is real drift or a real mistake.

## The register

### `impact_lab_match_runs_one_final_per_cohort`

```sql
CREATE UNIQUE INDEX impact_lab_match_runs_one_final_per_cohort
  ON impact_lab_match_runs (cohort) WHERE "isFinal";
```

- **Created by:** `20260722120000_impact_lab_hardening`
- **Present in:** `cck` (production), `cck_preview`
- **Enforces:** one final match run per cohort.
- **Why Prisma cannot express it:** it is a *partial* index. `@@unique` has no
  `WHERE` clause, and introspection reads the index back as a plain
  `@@unique([cohort])` — which is a different, stricter constraint that would
  reject every non-final run.
- **If dropped:** a cohort can be published with two competing final match runs
  and nothing rejects the second one.

## The rule for generating migrations in this repo

`prisma migrate dev` is **not used here.** It is built for a disposable
development database: when it sees anything in the database it cannot account
for — including everything in the register above — it offers to reset, which
means dropping every row in it. Both of our databases carry real data.

Generate migrations with the diff instead:

```bash
bash scripts/new-migration.sh <snake_case_name>
```

That script runs `prisma migrate diff`, strips exactly the registered objects,
and **refuses to write anything** if the diff contains any other destructive
statement. Read what it produces before applying it.

Apply migrations with `prisma migrate deploy`, never `migrate dev`.

## Checking for real drift

The diff that answers "has anything been changed in a database outside of
migrations?" replays the migration history into a throwaway database and
compares that against the live one:

```bash
export SHADOW_DATABASE_URL="<same as DATABASE_URL, database name replaced with cck_shadow>"
npx prisma migrate diff --from-migrations ./prisma/migrations --to-config-datasource --script
```

Expect the registered objects to appear in that output. Anything else is real.

This check was run on 2026-08-25 and found two untracked objects
(`newsletter_subscribers`, and a stale default on `demo_requests.updatedAt`),
both repaired by `20260825120000_repair_untracked_schema`.
