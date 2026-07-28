-- Gallery storage moves from Supabase to Cloudflare R2.
--
-- meetup_photos.storageKey holds an R2 object key, not a URL. Persisting
-- absolute URLs bakes the public hostname into every row, so changing bucket
-- or CDN domain becomes a data migration rather than an env change. The
-- reader composes the {original,full,thumb} variants from the key.
--
-- Nullable on purpose: existing Supabase-hosted rows keep their absolute
-- url/thumbnailUrl and leave storageKey NULL. That null is the discriminator
-- the reader uses to decide which storage a photo lives in, so both can
-- coexist and the backfill does not have to be atomic with the deploy.
--
-- events.bundle* describe the pre-generated "download all" zip for an album.
-- bundleBytes lets the page state the download size before someone on mobile
-- data commits to it; bundleGeneratedAt is compared against the album's newest
-- photo to spot a stale bundle.
--
-- meetup_photos.sourceFilename tracks the camera filename a row was
-- backfilled from, so an interrupted backfill run can tell what already
-- landed and resume instead of duplicating. It exists only for that resume
-- check — never rendered, unlike caption, which the original backfill script
-- was reusing for this and which KaribuAlbum shows as the hover overlay and
-- button aria-label. Reusing caption meant a raw camera filename shipped as
-- a public description and screen-reader label for every backfilled photo.
--
-- Additive only — every column is nullable with no default, so this is safe to
-- apply ahead of the code deploy and safe to roll back by ignoring it.

ALTER TABLE "meetup_photos" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "meetup_photos" ADD COLUMN "sourceFilename" TEXT;

ALTER TABLE "events" ADD COLUMN "bundleKey" TEXT;
ALTER TABLE "events" ADD COLUMN "bundleBytes" INTEGER;
ALTER TABLE "events" ADD COLUMN "bundleGeneratedAt" TIMESTAMP(3);
