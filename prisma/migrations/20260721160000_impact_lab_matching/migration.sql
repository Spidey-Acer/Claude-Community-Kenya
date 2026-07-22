-- CreateEnum
CREATE TYPE "ImpactLabExperience" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateTable
CREATE TABLE "impact_lab_participants" (
    "id" TEXT NOT NULL,
    "cohort" TEXT NOT NULL DEFAULT 'impact-lab-2026-07',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "institution" TEXT,
    "experienceLevel" "ImpactLabExperience" NOT NULL DEFAULT 'BEGINNER',
    "primaryRole" TEXT NOT NULL,
    "secondaryRoles" TEXT[],
    "technicalSkills" TEXT[],
    "interests" TEXT[],
    "availability" TEXT[],
    "projectIdeas" TEXT,
    "preferredTeammates" TEXT[],
    "blockedTeammates" TEXT[],
    "consentToMatch" BOOLEAN NOT NULL DEFAULT false,
    "consentToShareContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_lab_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_lab_match_runs" (
    "id" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "participantsSnapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impact_lab_match_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impact_lab_participants_cohort_idx" ON "impact_lab_participants"("cohort");

-- CreateIndex
CREATE UNIQUE INDEX "impact_lab_participants_cohort_email_key" ON "impact_lab_participants"("cohort", "email");

-- CreateIndex
CREATE INDEX "impact_lab_match_runs_cohort_idx" ON "impact_lab_match_runs"("cohort");

-- CreateIndex
CREATE INDEX "impact_lab_match_runs_cohort_isFinal_idx" ON "impact_lab_match_runs"("cohort", "isFinal");

-- AddForeignKey
ALTER TABLE "impact_lab_match_runs" ADD CONSTRAINT "impact_lab_match_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
