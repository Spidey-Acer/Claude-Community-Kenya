-- CreateEnum
CREATE TYPE "CommunityResourceType" AS ENUM ('MCP', 'PROMPT', 'WORKFLOW', 'TOOL');

-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "community_submissions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CommunityResourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "url" TEXT,
    "repoUrl" TEXT,
    "installInstructions" TEXT,
    "tags" JSONB NOT NULL,
    "submitterName" TEXT,
    "submitterContact" TEXT,
    "status" "CommunityStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "status" "CommunityStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_upvotes" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_submissions_slug_key" ON "community_submissions"("slug");

-- CreateIndex
CREATE INDEX "community_submissions_status_idx" ON "community_submissions"("status");

-- CreateIndex
CREATE INDEX "community_submissions_type_idx" ON "community_submissions"("type");

-- CreateIndex
CREATE INDEX "community_submissions_status_type_idx" ON "community_submissions"("status", "type");

-- CreateIndex
CREATE INDEX "community_comments_submissionId_status_idx" ON "community_comments"("submissionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_upvotes_submissionId_ipHash_key" ON "community_upvotes"("submissionId", "ipHash");

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "community_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_upvotes" ADD CONSTRAINT "community_upvotes_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "community_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
