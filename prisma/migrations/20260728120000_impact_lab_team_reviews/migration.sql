CREATE TABLE "impact_lab_team_reviews" (
  "id" TEXT NOT NULL,
  "cohort" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "generatedBy" TEXT NOT NULL,
  "editedAt" TIMESTAMP(3),
  "editedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "impact_lab_team_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impact_lab_team_reviews_runId_teamId_key"
  ON "impact_lab_team_reviews" ("runId", "teamId");

CREATE INDEX "impact_lab_team_reviews_cohort_idx"
  ON "impact_lab_team_reviews" ("cohort");

ALTER TABLE "impact_lab_team_reviews"
  ADD CONSTRAINT "impact_lab_team_reviews_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "impact_lab_match_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
