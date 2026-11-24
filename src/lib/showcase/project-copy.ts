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
  | { skipped: true; reason: "slug-exists" }

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

/** Maps a Project to an APPROVED PROJECT submission, or reports a slug collision. */
export function projectToSubmission(
  project: Project,
  existingSlugs: Set<string>,
): ProjectCopyResult {
  const slug = projectSlug(project.name)
  if (existingSlugs.has(slug)) return { skipped: true, reason: "slug-exists" }

  const stack = Array.isArray(project.stack) ? (project.stack as string[]) : []
  return {
    skipped: false,
    data: {
      type: "PROJECT",
      status: "APPROVED",
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
