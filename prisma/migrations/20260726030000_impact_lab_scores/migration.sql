-- Judge scorecards for Impact Lab. One row per judge per team; the weighted
-- total is derived in application code, never stored, so a correction to the
-- published weights cannot leave a stale total behind.
-- Additive only: safe to apply ahead of the code deploy.
CREATE TABLE "impact_lab_scores" (
    "id" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "judgeEmail" TEXT NOT NULL,
    "judgeName" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_lab_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impact_lab_scores_runId_teamId_judgeEmail_key"
    ON "impact_lab_scores"("runId", "teamId", "judgeEmail");

CREATE INDEX "impact_lab_scores_cohort_teamId_idx"
    ON "impact_lab_scores"("cohort", "teamId");

ALTER TABLE "impact_lab_scores"
    ADD CONSTRAINT "impact_lab_scores_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "impact_lab_match_runs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
