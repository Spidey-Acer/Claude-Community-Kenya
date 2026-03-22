-- CreateEnum
CREATE TYPE "VolunteerRole" AS ENUM ('SOCIAL_MEDIA_MANAGER', 'COMMUNITY_MANAGER', 'CONTENT_CREATOR', 'EVENT_COORDINATOR');

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "discordMembers" INTEGER NOT NULL DEFAULT 0,
    "whatsappMembers" INTEGER NOT NULL DEFAULT 0,
    "linkedinMembers" INTEGER NOT NULL DEFAULT 0,
    "eventsHeld" INTEGER NOT NULL DEFAULT 0,
    "citiesActive" JSONB NOT NULL DEFAULT '["Nairobi", "Mombasa"]',
    "resourceCount" INTEGER NOT NULL DEFAULT 0,
    "websiteStatus" TEXT NOT NULL DEFAULT 'live',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "VolunteerRole" NOT NULL,
    "experience" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "linkedIn" TEXT,
    "github" TEXT,
    "twitter" TEXT,
    "portfolio" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_applications_pkey" PRIMARY KEY ("id")
);
