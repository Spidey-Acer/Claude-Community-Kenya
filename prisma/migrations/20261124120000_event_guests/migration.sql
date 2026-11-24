-- event_guests
--
-- Hand-authored, same idiom as 20260922120000_guides: no database was touched
-- by the session that wrote it. The SQL below was generated with
--   npx prisma migrate diff --from-schema <schema before> \
--     --to-schema prisma/schema.prisma --script
-- and pasted verbatim. Nothing was run against any database.
--
-- Creates `event_guests`, the Luma guest list behind the "I'm attending" card
-- on /events/[slug]/attending. It holds an HMAC-SHA-256 of each guest email
-- (key: env ATTENDING_HMAC_KEY, never stored) plus the approval status, and
-- nothing else: no email, name, phone or registration answers. Rows are
-- removed 2 days after the event by /api/cron/purge-event-guests, or at once
-- by the admin "Delete guest list now" action; deleting an event cascades.
--
-- New table only. No existing data is touched.
--
-- MUST be verified before `prisma migrate deploy`: once a connection is
-- available, run `npx prisma migrate diff --from-config-datasource
-- --to-schema prisma/schema.prisma --script` and confirm it reports no
-- further changes.

-- CreateTable
CREATE TABLE "event_guests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "emailHmac" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_guests_eventId_emailHmac_key" ON "event_guests"("eventId", "emailHmac");

-- AddForeignKey
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
