-- Drop redundant single-column cohort indexes: the (cohort, email) unique index
-- and the (cohort, isFinal) index already cover cohort-prefix lookups.
DROP INDEX IF EXISTS "impact_lab_participants_cohort_idx";
DROP INDEX IF EXISTS "impact_lab_match_runs_cohort_idx";

-- Index the foreign key (repo convention for user-linked models).
CREATE INDEX "impact_lab_match_runs_createdById_idx" ON "impact_lab_match_runs"("createdById");

-- Enforce "at most one final run per cohort" at the database level. The API
-- swaps the final flag in a transaction, but under read-committed isolation two
-- concurrent mark-final calls on different runs can write-skew into two finals;
-- this partial unique index makes that impossible. Prisma can't model partial
-- indexes, so it is defined here in raw SQL only.
CREATE UNIQUE INDEX "impact_lab_match_runs_one_final_per_cohort"
  ON "impact_lab_match_runs"("cohort")
  WHERE "isFinal";
