-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "potwAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "meetup_photos" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "photographer" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetup_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_issues" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_potwAt_idx" ON "projects"("potwAt");

-- CreateIndex
CREATE INDEX "meetup_photos_eventId_idx" ON "meetup_photos"("eventId");

-- CreateIndex
CREATE INDEX "meetup_photos_featured_idx" ON "meetup_photos"("featured");

-- CreateIndex
CREATE INDEX "meetup_photos_order_idx" ON "meetup_photos"("order");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_issues_slug_key" ON "newsletter_issues"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_issues_number_key" ON "newsletter_issues"("number");

-- CreateIndex
CREATE INDEX "newsletter_issues_publishedAt_idx" ON "newsletter_issues"("publishedAt");

-- CreateIndex
CREATE INDEX "newsletter_issues_status_idx" ON "newsletter_issues"("status");

-- AddForeignKey
ALTER TABLE "meetup_photos" ADD CONSTRAINT "meetup_photos_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
