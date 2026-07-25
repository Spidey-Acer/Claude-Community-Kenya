-- Event check-in for Impact Lab participants. Null checkedInAt means "not
-- checked in", which is what identifies the people a rematch needs to work
-- around. Additive and nullable, so this is safe to apply ahead of the deploy.
ALTER TABLE "impact_lab_participants" ADD COLUMN "checkedInAt" TIMESTAMP(3);
ALTER TABLE "impact_lab_participants" ADD COLUMN "checkedInBy" TEXT;
