-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ORGANISER');

-- CreateEnum
CREATE TYPE "ImpactLabEventStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_members" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'ORGANISER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_lab_events" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ImpactLabEventStatus" NOT NULL DEFAULT 'DRAFT',
    "titleLead" TEXT NOT NULL,
    "titleAccent" TEXT NOT NULL,
    "dates" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "formatNote" TEXT NOT NULL,
    "groundRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_lab_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_members_organisationId_userId_key" ON "organisation_members"("organisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "impact_lab_events_cohort_key" ON "impact_lab_events"("cohort");

-- CreateIndex
CREATE INDEX "impact_lab_events_organisationId_idx" ON "impact_lab_events"("organisationId");

-- CreateIndex
CREATE INDEX "impact_lab_events_status_idx" ON "impact_lab_events"("status");

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impact_lab_events" ADD CONSTRAINT "impact_lab_events_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

