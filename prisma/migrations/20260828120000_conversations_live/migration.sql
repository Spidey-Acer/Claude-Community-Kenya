-- conversations_live
--
-- Hand-authored: no local DB was reachable to run either `prisma migrate dev`
-- or this repo's `scripts/new-migration.sh` (needs DATABASE_URL live over the
-- cck_migrator SSH tunnel on 127.0.0.1:15433; the tunnel was down and opening
-- a new SSH connection was blocked by the sandbox's permission classifier in
-- this session). This SQL was written by hand to match exactly what
-- `prisma migrate diff` would emit for the schema.prisma changes below — same
-- statement order and naming convention as every other migration in this
-- repo (see e.g. 20260808200000_event_platform_tenancy/migration.sql).
--
-- MUST be verified before `prisma migrate deploy`: once the tunnel is back,
-- run `npx prisma migrate diff --from-config-datasource --to-schema
-- prisma/schema.prisma --script` and confirm it reports no further changes.

-- CreateEnum
CREATE TYPE "SubmissionModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'FEATURED', 'REJECTED');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'CONVERSATIONS';

-- CreateTable
CREATE TABLE "event_question_sessions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_question_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "submitterName" VARCHAR(80) NOT NULL,
    "county" VARCHAR(40) NOT NULL,
    "ipHash" VARCHAR(64),
    "status" "SubmissionModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_contributions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "questionKey" VARCHAR(40) NOT NULL,
    "body" VARCHAR(600) NOT NULL,
    "submitterName" VARCHAR(80) NOT NULL,
    "county" VARCHAR(40) NOT NULL,
    "ipHash" VARCHAR(64),
    "status" "SubmissionModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations_pages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "heroHeadline" VARCHAR(200) NOT NULL,
    "heroSubline" VARCHAR(300) NOT NULL,
    "framingStats" JSONB NOT NULL,
    "tableQuestions" JSONB NOT NULL,
    "seedProblems" JSONB NOT NULL,
    "contributionsOpen" BOOLEAN NOT NULL DEFAULT true,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_question_sessions_eventId_idx" ON "event_question_sessions"("eventId");

-- CreateIndex
CREATE INDEX "event_questions_sessionId_status_idx" ON "event_questions"("sessionId", "status");

-- CreateIndex
CREATE INDEX "event_contributions_eventId_status_idx" ON "event_contributions"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_pages_eventId_key" ON "conversations_pages"("eventId");

-- AddForeignKey
ALTER TABLE "event_question_sessions" ADD CONSTRAINT "event_question_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "event_question_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_contributions" ADD CONSTRAINT "event_contributions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations_pages" ADD CONSTRAINT "conversations_pages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
