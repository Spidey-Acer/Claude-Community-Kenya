-- Key upvotes on voter identity instead of IP.
--
-- Written by hand. scripts/new-migration.sh correctly refused to generate this
-- (exit 2): it contains a DROP INDEX that is not in the unrepresentable-objects
-- register. The drop is intentional — it is half of a constraint swap — and the
-- generated ordering would not have worked anyway, because Prisma emits
-- `ADD COLUMN "voterKey" TEXT NOT NULL` with no default, which fails outright on
-- a table that already has rows. Preview has 1, production has 3.
--
-- The old rule, @@unique([submissionId, ipHash]), meant two members sharing a
-- NAT could not both upvote the same post. On Kenyan carrier networks that is
-- most of a room at an event.
--
-- Everything below runs in one transaction, so there is no moment where the old
-- constraint is gone and the new one is not yet enforcing.

-- 1. Add nullable, then backfill from the existing IP hash.
ALTER TABLE "community_upvotes" ADD COLUMN "voterKey" TEXT;
UPDATE "community_upvotes" SET "voterKey" = 'ip:' || "ipHash" WHERE "voterKey" IS NULL;

-- 2. Now it can be required.
ALTER TABLE "community_upvotes" ALTER COLUMN "voterKey" SET NOT NULL;

-- 3. ipHash keeps its data but stops being required. It is still recorded for
--    abuse forensics; it just no longer decides who counts as a distinct voter.
ALTER TABLE "community_upvotes" ALTER COLUMN "ipHash" DROP NOT NULL;

-- 4. Swap the uniqueness rule.
DROP INDEX IF EXISTS "community_upvotes_submissionId_ipHash_key";
CREATE UNIQUE INDEX "community_upvotes_submissionId_voterKey_key"
  ON "community_upvotes"("submissionId", "voterKey");
