-- Persist the reviewed team explanations (Claude or deterministic) with the
-- frozen run. Nullable: legacy runs fall back to deterministic explanations.
ALTER TABLE "impact_lab_match_runs" ADD COLUMN "explanations" JSONB;
