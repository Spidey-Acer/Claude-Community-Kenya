-- conversations_report_link
--
-- Hand-authored, same idiom as 20260828120000_conversations_live: no local DB
-- reachable in this session. Adds a written report to ConversationsPage and
-- links an ImpactLabEvent to the Conversations event whose report its
-- members should see on their dashboard.
--
-- MUST be verified before `prisma migrate deploy`: once the tunnel is back,
-- run `npx prisma migrate diff --from-config-datasource --to-schema
-- prisma/schema.prisma --script` and confirm it reports no further changes.

-- AlterTable
ALTER TABLE "conversations_pages" ADD COLUMN "reportSummary" TEXT;
ALTER TABLE "conversations_pages" ADD COLUMN "reportUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "impact_lab_events" ADD COLUMN "conversationsEventId" TEXT;

-- CreateIndex
CREATE INDEX "impact_lab_events_conversationsEventId_idx" ON "impact_lab_events"("conversationsEventId");

-- AddForeignKey
ALTER TABLE "impact_lab_events" ADD CONSTRAINT "impact_lab_events_conversationsEventId_fkey" FOREIGN KEY ("conversationsEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
