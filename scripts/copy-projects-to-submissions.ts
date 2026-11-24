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
import { preflightProblems } from "../src/lib/showcase/copy-preflight"

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
    // Read-only schema check, in dry-run and real mode alike, before any work.
    const projectEnumRows = await prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'CommunityResourceType' AND e.enumlabel = 'PROJECT'`
    const featuredColumnRows = await prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'community_submissions' AND column_name = 'featured'`
    const problems = preflightProblems({ projectEnumRows, featuredColumnRows })
    if (problems.length > 0) {
      console.error(`Schema check failed, nothing was copied:\n- ${problems.join("\n- ")}`)
      process.exitCode = 1
      return
    }

    const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } })
    const rows = await prisma.communitySubmission.findMany({ select: { slug: true } })
    const existingSlugs = new Set(rows.map((row) => row.slug))

    let approved = 0
    let pending = 0
    const skippedSlugs: string[] = []
    const emptySlugNames: string[] = []
    for (const project of projects) {
      const result = projectToSubmission(project, existingSlugs)
      if (result.skipped) {
        if (result.reason === "empty-slug") emptySlugNames.push(project.name)
        else skippedSlugs.push(project.name)
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
    if (emptySlugNames.length > 0) {
      console.log(`skipped ${emptySlugNames.length} with an empty slug (rename and rerun): ${emptySlugNames.map((name) => JSON.stringify(name)).join(", ")}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
