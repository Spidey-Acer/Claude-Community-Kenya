-- Email verification fields on users
ALTER TABLE "users"
  ADD COLUMN "emailVerificationToken" TEXT,
  ADD COLUMN "emailVerificationExpires" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_emailVerificationToken_key"
  ON "users"("emailVerificationToken");

-- Optional userId FK on submission tables
ALTER TABLE "speaker_applications"   ADD COLUMN "userId" TEXT;
ALTER TABLE "idea_submissions"       ADD COLUMN "userId" TEXT;
ALTER TABLE "join_applications"      ADD COLUMN "userId" TEXT;
ALTER TABLE "demo_requests"          ADD COLUMN "userId" TEXT;
ALTER TABLE "volunteer_applications" ADD COLUMN "userId" TEXT;
ALTER TABLE "community_submissions"  ADD COLUMN "userId" TEXT;

CREATE INDEX "speaker_applications_userId_idx"   ON "speaker_applications"("userId");
CREATE INDEX "idea_submissions_userId_idx"       ON "idea_submissions"("userId");
CREATE INDEX "join_applications_userId_idx"      ON "join_applications"("userId");
CREATE INDEX "demo_requests_userId_idx"          ON "demo_requests"("userId");
CREATE INDEX "volunteer_applications_userId_idx" ON "volunteer_applications"("userId");
CREATE INDEX "community_submissions_userId_idx"  ON "community_submissions"("userId");

ALTER TABLE "speaker_applications"
  ADD CONSTRAINT "speaker_applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "idea_submissions"
  ADD CONSTRAINT "idea_submissions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "join_applications"
  ADD CONSTRAINT "join_applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "demo_requests"
  ADD CONSTRAINT "demo_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "volunteer_applications"
  ADD CONSTRAINT "volunteer_applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "community_submissions"
  ADD CONSTRAINT "community_submissions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
