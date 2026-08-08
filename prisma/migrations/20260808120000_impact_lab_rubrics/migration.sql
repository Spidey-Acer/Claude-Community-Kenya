-- The judging rubric a cohort is scored on, when an organiser has authored one.
-- Overrides the code constant in lib/impact-lab/judging-rubrics.ts for that
-- cohort; absence of a row means the constant stands.
CREATE TABLE "impact_lab_rubrics" (
  "id" TEXT NOT NULL,
  "cohort" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "scoring" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  "scoreLabels" JSONB,
  "source" TEXT NOT NULL,
  "createdByEmail" TEXT NOT NULL,
  "updatedByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "impact_lab_rubrics_pkey" PRIMARY KEY ("id")
);

-- One rubric per cohort. Saving upserts on this key.
CREATE UNIQUE INDEX "impact_lab_rubrics_cohort_key"
  ON "impact_lab_rubrics" ("cohort");
