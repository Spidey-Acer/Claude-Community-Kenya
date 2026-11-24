/**
 * Pure mapping from a legacy `Project` row to a `CommunitySubmission` create
 * payload, used by scripts/copy-projects-to-submissions.ts.
 *
 * Kept free of database access so the idempotence rule is unit-testable: a
 * project whose generated slug already exists is skipped, never overwritten.
 */

import type { Prisma, Project } from "@/generated/prisma/client"

const MAX_SLUG_LENGTH = 60
const MAX_SHORT_DESCRIPTION_LENGTH = 300

export type ProjectCopyResult =
  | { skipped: false; data: Prisma.CommunitySubmissionCreateInput }
  | { skipped: true; reason: "slug-exists" | "empty-slug" }

/** Kebab-case of the project name, at most 60 chars, no leading or trailing dash. */
export function projectSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "")
}

/** Cuts text to `max` chars at a word boundary; short text is returned whole. */
function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()
}

/**
 * Maps a Project to a PROJECT submission, or reports why it was skipped
 * (slug collision, or a name that yields an empty slug).
 *
 * `featured` was the legacy moderation gate (the public list shows only
 * featured projects), so only a featured project, or one that ran as Project
 * of the Week (`potwAt`), is APPROVED. Everything else becomes PENDING and
 * lands in the moderation queue rather than going live unreviewed.
 */
export function projectToSubmission(
  project: Project,
  existingSlugs: Set<string>,
): ProjectCopyResult {
  const slug = projectSlug(project.name)
  // A name with no letters or digits slugs to "", which would collide with
  // every other such project and produce an unroutable page.
  if (slug === "") return { skipped: true, reason: "empty-slug" }
  if (existingSlugs.has(slug)) return { skipped: true, reason: "slug-exists" }

  const isPublished = project.featured === true || project.potwAt !== null
  const stack = Array.isArray(project.stack) ? (project.stack as string[]) : []
  return {
    skipped: false,
    data: {
      type: "PROJECT",
      status: isPublished ? "APPROVED" : "PENDING",
      featured: project.featured,
      slug,
      title: project.name,
      submitterName: project.builder,
      shortDescription: cutAtWord(project.description, MAX_SHORT_DESCRIPTION_LENGTH),
      fullDescription: project.description,
      url: project.demoUrl,
      repoUrl: project.repoUrl,
      tags: [],
      builtWith: { models: [], skills: stack, mcps: [] },
      createdAt: project.createdAt,
      lastActivityAt: project.createdAt,
    },
  }
}
