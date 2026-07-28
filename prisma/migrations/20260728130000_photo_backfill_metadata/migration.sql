-- Two small additions on top of the R2 storage migration, both nullable with
-- no default — additive only, safe to apply ahead of the code deploy.
--
-- meetup_photos.sourceFilename tracks the camera filename a row was
-- backfilled from, so an interrupted backfill run can tell what already
-- landed and resume instead of duplicating. It exists only for that resume
-- check and is never rendered — unlike caption, which the original backfill
-- script was reusing for this. caption is what KaribuAlbum shows as the
-- photo's hover overlay and the grid button's aria-label, so reusing it
-- meant every backfilled photo shipped a raw camera filename as a public
-- description and screen-reader label.
--
-- meetup_photos.originalExt records the uploaded original's file extension
-- (jpg, png, heic, …). The full and thumb derivatives are always webp, but
-- the original keeps whatever format the camera produced, and that was not
-- persisted anywhere on the row. Without it, deleting a photo cannot address
-- its original object in R2 without listing the bucket by prefix — an
-- operation the R2 token may not be scoped for, and one dependent-outcome
-- extra round trip either way. Storing the three characters is cheaper and
-- exact.

ALTER TABLE "meetup_photos" ADD COLUMN "sourceFilename" TEXT;
ALTER TABLE "meetup_photos" ADD COLUMN "originalExt" TEXT;
