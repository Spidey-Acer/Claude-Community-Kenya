-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('dev', 'non_tech_pro', 'student', 'founder', 'creator');

-- CreateEnum
CREATE TYPE "Intent" AS ENUM ('learn_basics', 'find_event', 'find_collaborators', 'build', 'hire_or_partner', 'other');

-- CreateEnum
CREATE TYPE "Experience" AS ENUM ('never_used', 'claude_ai', 'claude_code', 'api_builder');

-- AlterTable: add audience tags to events
ALTER TABLE "events" ADD COLUMN "audiences" "Audience"[] DEFAULT ARRAY[]::"Audience"[];
ALTER TABLE "events" ADD COLUMN "intents" "Intent"[] DEFAULT ARRAY[]::"Intent"[];

-- AlterTable: add audience tags to blog_posts
ALTER TABLE "blog_posts" ADD COLUMN "audiences" "Audience"[] DEFAULT ARRAY[]::"Audience"[];
ALTER TABLE "blog_posts" ADD COLUMN "intents" "Intent"[] DEFAULT ARRAY[]::"Intent"[];

-- AlterTable: add audience tags to projects
ALTER TABLE "projects" ADD COLUMN "audiences" "Audience"[] DEFAULT ARRAY[]::"Audience"[];

-- CreateTable
CREATE TABLE "onboarding_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cookieId" TEXT,
    "audience" "Audience",
    "intent" "Intent",
    "experience" "Experience",
    "name" TEXT,
    "city" TEXT,
    "language" TEXT,
    "conversation" JSONB,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_sessions_cookieId_key" ON "onboarding_sessions"("cookieId");

-- CreateIndex
CREATE INDEX "onboarding_sessions_cookieId_idx" ON "onboarding_sessions"("cookieId");

-- CreateIndex
CREATE INDEX "onboarding_sessions_userId_idx" ON "onboarding_sessions"("userId");

-- CreateIndex
CREATE INDEX "onboarding_sessions_audience_idx" ON "onboarding_sessions"("audience");

-- AddForeignKey
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
