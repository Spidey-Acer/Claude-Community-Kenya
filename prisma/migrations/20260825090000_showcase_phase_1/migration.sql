-- Community Showcase, Phase 1.
--
-- Generated with `prisma migrate diff --from-config-datasource --to-schema`.
-- One line was removed from the generated output by hand: a
-- `DROP INDEX "impact_lab_match_runs_one_final_per_cohort"`.
--
-- That index is NOT drift. It was created deliberately in
-- 20260722120000_impact_lab_hardening and is present in every database. It is a
-- *partial* unique index (`ON impact_lab_match_runs (cohort) WHERE "isFinal"`),
-- and Prisma's schema language cannot express a WHERE predicate — so every diff
-- against schema.prisma will keep proposing to drop it, forever. Dropping it
-- would let a cohort have two final match runs.
--
-- See docs/database/unrepresentable-objects.md for the full register and the
-- rule that governs generating migrations in this repo.

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('SUBMISSION', 'COMMENT', 'UPDATE');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'ABUSE', 'OFF_TOPIC', 'PLAGIARISM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "CommunityResourceType" ADD VALUE 'SHOWCASE';

-- AlterTable
ALTER TABLE "community_comments" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "community_submissions" ADD COLUMN     "builtWith" JSONB,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "followerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "media" JSONB,
ADD COLUMN     "needs" JSONB,
ADD COLUMN     "reactionCounts" JSONB;

-- CreateTable
CREATE TABLE "showcase_reactions" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterIp" TEXT,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "showcase_reactions_submissionId_idx" ON "showcase_reactions"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_reactions_submissionId_userId_emoji_key" ON "showcase_reactions"("submissionId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "content_reports_status_createdAt_idx" ON "content_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "content_reports_targetType_targetId_idx" ON "content_reports"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "community_comments_userId_idx" ON "community_comments"("userId");

-- CreateIndex
CREATE INDEX "community_submissions_type_status_lastActivityAt_idx" ON "community_submissions"("type", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "community_submissions_eventId_idx" ON "community_submissions"("eventId");

-- AddForeignKey
ALTER TABLE "community_submissions" ADD CONSTRAINT "community_submissions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_reactions" ADD CONSTRAINT "showcase_reactions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "community_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_reactions" ADD CONSTRAINT "showcase_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
