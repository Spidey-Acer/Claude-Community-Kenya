/**
 * Backfill the tenancy tables with the two events that already ran.
 *
 * Idempotent: every write is an upsert keyed on the unique slug/cohort, so
 * running it twice changes nothing. Dry-run by default; pass --apply to write.
 *
 *   npm run seed:events            # report what would change
 *   npm run seed:events -- --apply # write
 */
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const APPLY = process.argv.includes("--apply")

interface OrgSeed {
  slug: string
  name: string
  contactEmail: string | null
}

interface EventSeed {
  orgSlug: string
  cohort: string
  name: string
  status: "CLOSED"
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
}

const ORGS: OrgSeed[] = [
  { slug: "cck", name: "Claude Community Kenya", contactEmail: "hello@claudekenya.org" },
  { slug: "c4dlab", name: "C4DLab, University of Nairobi", contactEmail: null },
]

const EVENTS: EventSeed[] = [
  {
    orgSlug: "cck",
    cohort: "impact-lab-2026-07",
    name: "Impact Lab: AI Mashinani",
    status: "CLOSED",
    titleLead: "Impact Lab:",
    titleAccent: "AI Mashinani",
    dates: "25–26 July 2026",
    location: "Nairobi, Kenya",
    formatNote:
      "An overnight build: teams formed in the evening, built through the night, " +
      "and judging ran from the small hours into the morning.",
  },
  {
    orgSlug: "c4dlab",
    cohort: "afretec-makerthon-2026-08",
    name: "Afretec Makerthon 2026",
    status: "CLOSED",
    titleLead: "Afretec",
    titleAccent: "Makerthon 2026",
    dates: "8 August 2026",
    location: "Nairobi, Kenya",
    formatNote:
      "Teams registered as existing startups and were formed before the event. Each team " +
      "pitched live for five minutes and was scored by a judging panel on eight criteria out " +
      "of 50.",
  },
]

async function main(): Promise<void> {
  console.log(APPLY ? "APPLY mode — writing." : "DRY RUN — pass --apply to write.")

  for (const org of ORGS) {
    const existing = await prisma.organisation.findUnique({ where: { slug: org.slug } })
    console.log(`organisation ${org.slug}: ${existing ? "exists" : "will create"}`)
    if (APPLY) {
      await prisma.organisation.upsert({
        where: { slug: org.slug },
        create: org,
        update: { name: org.name, contactEmail: org.contactEmail },
      })
    }
  }

  for (const event of EVENTS) {
    const org = await prisma.organisation.findUnique({ where: { slug: event.orgSlug } })
    if (!org) {
      if (APPLY) throw new Error(`organisation ${event.orgSlug} missing — cannot seed ${event.cohort}`)
      console.log(`event ${event.cohort}: would create under ${event.orgSlug} (org pending)`)
      continue
    }
    const { orgSlug: _orgSlug, ...data } = event
    const existing = await prisma.impactLabEvent.findUnique({ where: { cohort: event.cohort } })
    console.log(`event ${event.cohort}: ${existing ? "exists" : "will create"}`)
    if (APPLY) {
      await prisma.impactLabEvent.upsert({
        where: { cohort: event.cohort },
        // Backfill never overwrites a status an admin may have changed since.
        create: { ...data, organisationId: org.id },
        update: {},
      })
    }
  }

  // Every active platform admin becomes an OWNER of the CCK organisation.
  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, active: true },
    select: { id: true, email: true },
  })
  const cck = await prisma.organisation.findUnique({ where: { slug: "cck" } })
  console.log(`cck OWNER memberships for ${admins.length} platform admin(s)`)
  if (APPLY && cck) {
    for (const admin of admins) {
      await prisma.organisationMember.upsert({
        where: { organisationId_userId: { organisationId: cck.id, userId: admin.id } },
        create: { organisationId: cck.id, userId: admin.id, role: "OWNER" },
        update: {},
      })
    }
  }

  console.log("Done.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
