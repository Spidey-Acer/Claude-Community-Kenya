-- Per-event tracks for Impact Lab matching. Nullable JSONB: an event with no
-- tracks (existing rows, or organisers who don't need the feature) stores
-- NULL and matching runs unpartitioned, same as before this migration.
ALTER TABLE "impact_lab_events" ADD COLUMN "tracks" JSONB;
