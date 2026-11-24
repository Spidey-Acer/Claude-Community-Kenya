/**
 * One-time copy: legacy `Project` rows into `CommunitySubmission` (type PROJECT).
 *
 * Idempotent: a project whose generated slug already exists as a submission is
 * skipped and reported, never overwritten, so a second run copies nothing.
 * Dry run prints counts only:
 *
 *   DATABASE_URL="postgres://..." npm run copy:projects -- --dry-run
 *   DATABASE_URL="postgres://..." npm run copy:projects
 *
 * Rows are created one by one (each in its own transaction) because slugs are
 * checked as we go; createMany would hide collisions between two projects.
 */

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { projectToSubmission } from "../src/lib/showcase/project-copy"

const dryRun = process.argv.includes("--dry-run")

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set, e.g. DATABASE_URL="postgres://..." npm run copy:projects -- --dry-run')
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) })
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } })
    const rows = await prisma.communitySubmission.findMany({ select: { slug: true } })
    const existingSlugs = new Set(rows.map((row) => row.slug))

    let approved = 0
    let pending = 0
    const skippedSlugs: string[] = []
    for (const project of projects) {
      const result = projectToSubmission(project, existingSlugs)
      if (result.skipped) {
        skippedSlugs.push(project.name)
        continue
      }
      if (!dryRun) {
        await prisma.$transaction([prisma.communitySubmission.create({ data: result.data })])
      }
      existingSlugs.add(result.data.slug)
      if (result.data.status === "APPROVED") approved += 1
      else pending += 1
    }

    const label = dryRun ? "copy" : "copied"
    console.log(`${label} ${approved + pending} (approved ${approved}, pending ${pending}), ${dryRun ? "skip" : "skipped"} ${skippedSlugs.length} (projects: ${skippedSlugs.join(", ")})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
