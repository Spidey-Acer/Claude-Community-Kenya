-- AlterTable: add Karibu attribution fields to join_applications
ALTER TABLE "join_applications" ADD COLUMN "karibuAudience" "Audience";
ALTER TABLE "join_applications" ADD COLUMN "karibuIntent" "Intent";
ALTER TABLE "join_applications" ADD COLUMN "karibuSessionId" TEXT;

-- CreateIndex
CREATE INDEX "join_applications_karibuAudience_idx" ON "join_applications"("karibuAudience");
