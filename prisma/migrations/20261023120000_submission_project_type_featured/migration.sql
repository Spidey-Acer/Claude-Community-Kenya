-- submission_project_type_featured
--
-- Hand-authored, same idiom as 20260922120000_guides: no database was touched.
-- Generated with
--   npx prisma migrate diff --from-schema <schema before> \
--     --to-schema prisma/schema.prisma --script
-- and pasted verbatim. Nothing was run against any database.
--
-- Adds the PROJECT submission type (projects move into community_submissions)
-- and a `featured` flag for curated placement on the showcase.

-- AlterEnum
ALTER TYPE "CommunityResourceType" ADD VALUE 'PROJECT';

-- AlterTable
ALTER TABLE "community_submissions" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;
