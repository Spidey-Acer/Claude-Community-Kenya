-- AlterTable
ALTER TABLE "events" ADD COLUMN "capacity" INTEGER;

-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "slug" TEXT,
ADD COLUMN "longBio" TEXT,
ADD COLUMN "location" TEXT,
ADD COLUMN "tagline" TEXT,
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "team_members_slug_key" ON "team_members"("slug");

-- CreateIndex
CREATE INDEX "team_members_active_idx" ON "team_members"("active");

-- CreateIndex
CREATE INDEX "team_members_featured_idx" ON "team_members"("featured");
