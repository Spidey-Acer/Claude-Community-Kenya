ALTER TABLE "impact_lab_match_runs"
  ADD COLUMN "judgingClosedAt" TIMESTAMP(3),
  ADD COLUMN "resultsPublishedAt" TIMESTAMP(3),
  ADD COLUMN "announcedWinners" JSONB,
  ADD COLUMN "resultsSnapshot" JSONB;

ALTER TABLE "impact_lab_scores"
  ADD COLUMN "writeupOnly" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "impact_lab_results_emails" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "impact_lab_results_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impact_lab_results_emails_runId_participantId_key"
  ON "impact_lab_results_emails" ("runId", "participantId");

CREATE INDEX "impact_lab_results_emails_runId_status_idx"
  ON "impact_lab_results_emails" ("runId", "status");

ALTER TABLE "impact_lab_results_emails"
  ADD CONSTRAINT "impact_lab_results_emails_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "impact_lab_match_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
