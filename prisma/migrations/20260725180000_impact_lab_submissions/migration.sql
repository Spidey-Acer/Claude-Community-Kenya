-- Team project submissions for Impact Lab, plus the submission window on the
-- run that published the teams. Additive and nullable, so this is safe to apply
-- to production ahead of the code deploy.
CREATE TABLE "impact_lab_submissions" (
    "id" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "worksVsMocked" TEXT NOT NULL,
    "claudeUsage" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "problemTackled" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "demoUrl" TEXT,
    "videoUrl" TEXT,
    "slidesUrl" TEXT,
    "screenshotUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdByEmail" TEXT NOT NULL,
    "lastEditedByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_lab_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impact_lab_submissions_runId_teamId_key"
    ON "impact_lab_submissions"("runId", "teamId");

CREATE INDEX "impact_lab_submissions_cohort_status_idx"
    ON "impact_lab_submissions"("cohort", "status");

ALTER TABLE "impact_lab_submissions"
    ADD CONSTRAINT "impact_lab_submissions_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "impact_lab_match_runs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "impact_lab_match_runs" ADD COLUMN "submissionsCloseAt" TIMESTAMP(3);
