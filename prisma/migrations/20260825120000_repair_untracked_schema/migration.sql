-- Repair: bring the migration history back in line with the live databases.
--
-- Two objects were found in both `cck` (production) and `cck_preview` that no
-- migration creates. They were applied by an early `prisma db push` or by a
-- `migrate dev` whose output was never committed. Both databases are correct;
-- the *history* is what is missing them. A database rebuilt from
-- `prisma migrate deploy` alone would have shipped without the newsletter
-- table, and every newsletter signup would have 500'd.
--
-- Discovered with:
--   SHADOW_DATABASE_URL=... npx prisma migrate diff \
--     --from-migrations ./prisma/migrations --to-config-datasource --script
--
-- Every statement below is idempotent, so this migration is a no-op on the
-- databases that already have these objects and a fix on any that do not.
-- Nothing here drops or rewrites data.

-- 1. The subscribers table exists in schema.prisma (model NewsletterSubscriber)
--    and in both live databases, but in no migration. Note that
--    20260521175245_add_gallery_newsletter_potw creates `newsletter_issues` —
--    a different table. This one was never tracked.
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_key"
    ON "newsletter_subscribers"("email");

-- 2. `demo_requests.updatedAt` carries a database default in the migration
--    history but not in either live database. The live databases are the ones
--    that match schema.prisma: the field is `@updatedAt`, which Prisma sets
--    from the client on every write, so a database-side default is dead weight
--    that only masks a missing write. Drop it in history too.
--    ALTER COLUMN ... DROP DEFAULT is a no-op when there is no default.
ALTER TABLE "demo_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;
