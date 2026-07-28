-- Adds admin-configurable social link overrides to site_settings.
-- All columns are nullable: NULL means "not configured", and the app falls
-- back to the hardcoded constant in src/lib/constants.ts (see
-- src/lib/social-links.ts). Purely additive — no data migration needed.

ALTER TABLE "site_settings"
  ADD COLUMN "whatsappUrl" TEXT,
  ADD COLUMN "discordUrl" TEXT,
  ADD COLUMN "twitterUrl" TEXT,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "youtubeUrl" TEXT,
  ADD COLUMN "githubUrl" TEXT,
  ADD COLUMN "lumaNairobiUrl" TEXT,
  ADD COLUMN "lumaMombasaUrl" TEXT;
