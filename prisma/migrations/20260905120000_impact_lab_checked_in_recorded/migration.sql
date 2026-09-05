-- An organiser's own door count (e.g. read off Luma), entered on the export
-- admin surface. Nullable Int: existing rows and runs where nobody has
-- entered a door count yet store NULL, and exports fall back to the
-- platform's own self-service check-in count, honestly labelled, exactly as
-- before this migration.
ALTER TABLE "impact_lab_match_runs" ADD COLUMN "checkedInRecorded" INTEGER;
