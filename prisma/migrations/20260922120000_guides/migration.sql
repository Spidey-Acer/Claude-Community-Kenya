-- guides
--
-- Hand-authored, same idiom as 20260921120000_impact_lab_public_event_link: no
-- database was reachable from the session that wrote it (the pooler refuses a
-- non-SSL connection and presents a self-signed certificate), so the SQL was
-- generated with
--   npx prisma migrate diff --from-schema <schema before> \
--     --to-schema prisma/schema.prisma --script
-- and pasted verbatim. Nothing was run against any database.
--
-- Creates the `guides` table backing the /resources guides library: a
-- downloadable PDF the admin uploads once and publishes with no code deploy
-- per document. `audience` is a plain TEXT column (validated by a zod enum
-- in src/lib/guides.ts, not a Postgres enum) and `eventSlug` is a soft,
-- non-FK link to `events.slug` — the same join-by-slug idiom the Impact Lab
-- tables use for `cohort`, chosen because this link is optional and rarely
-- queried, not worth an FK.
--
-- New table only — no existing data is touched.
--
-- MUST be verified before `prisma migrate deploy`: once a connection is
-- available, run `npx prisma migrate diff --from-config-datasource
-- --to-schema prisma/schema.prisma --script` and confirm it reports no
-- further changes.

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "coverUrl" TEXT,
    "eventSlug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug");

-- CreateIndex
CREATE INDEX "guides_publishedAt_idx" ON "guides"("publishedAt");

-- CreateIndex
CREATE INDEX "guides_sortOrder_idx" ON "guides"("sortOrder");
