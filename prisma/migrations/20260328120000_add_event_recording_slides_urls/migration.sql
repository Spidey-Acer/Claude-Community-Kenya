-- AlterTable: add missing event columns
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "recordingUrl" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "slidesUrl" TEXT;

-- AlterTable: add missing project columns
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
