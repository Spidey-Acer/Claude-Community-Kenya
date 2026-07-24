-- Six new volunteer roles (event-day help was the loudest gap) and an optional
-- city/chapter so admins can route applications to Nairobi vs Mombasa.
ALTER TYPE "VolunteerRole" ADD VALUE 'EVENT_SUPPORT';
ALTER TYPE "VolunteerRole" ADD VALUE 'MENTOR';
ALTER TYPE "VolunteerRole" ADD VALUE 'DESIGNER';
ALTER TYPE "VolunteerRole" ADD VALUE 'PHOTOGRAPHER';
ALTER TYPE "VolunteerRole" ADD VALUE 'TECH_SUPPORT';
ALTER TYPE "VolunteerRole" ADD VALUE 'PARTNERSHIPS';

ALTER TABLE "volunteer_applications" ADD COLUMN "city" TEXT;
