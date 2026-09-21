-- impact_lab_public_event_link
--
-- Hand-authored, same idiom as 20260902120100_conversations_report_link: no
-- database was reachable from the session that wrote it (the pooler refuses
-- a non-SSL connection and presents a self-signed certificate), so the SQL
-- was generated with
--   npx prisma migrate diff --from-schema <schema before> \
--     --to-schema prisma/schema.prisma --script
-- and pasted verbatim. Nothing was run against any database.
--
-- Adds the explicit "this cohort ran at that public event" link. Until now
-- the only links were conversationsEventId (which means the event where
-- tracks were chosen, and was already pointing at the 29 August
-- Conversations night), the cohort slug, and the event title. AI Mashinani
-- 02 matched none of them, so its public page fell through to "whichever
-- cohort is LIVE" and published the Build Day winners as its own.
--
-- Additive and nullable: existing rows are unaffected and every resolver
-- treats NULL as "not linked".
--
-- MUST be verified before `prisma migrate deploy`: once a connection is
-- available, run `npx prisma migrate diff --from-config-datasource
-- --to-schema prisma/schema.prisma --script` and confirm it reports no
-- further changes.

-- AlterTable
ALTER TABLE "impact_lab_events" ADD COLUMN     "publicEventId" TEXT;

-- CreateIndex
CREATE INDEX "impact_lab_events_publicEventId_idx" ON "impact_lab_events"("publicEventId");

-- AddForeignKey
ALTER TABLE "impact_lab_events" ADD CONSTRAINT "impact_lab_events_publicEventId_fkey" FOREIGN KEY ("publicEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
