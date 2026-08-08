-- A shared pitch countdown, one row per cohort. Any judge's Start applies to
-- the whole room, not just their own device — absence of a row means no
-- timer is currently running for that cohort.
CREATE TABLE "impact_lab_pitch_timers" (
  "cohort"    TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "seconds"   INTEGER NOT NULL DEFAULT 300,
  "startedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "impact_lab_pitch_timers_pkey" PRIMARY KEY ("cohort")
);
