/**
 * Shared logic for the Guides library — zod schemas, slug generation, and
 * small formatting/JSON-LD helpers, kept as pure functions so the admin
 * routes and pages stay thin and the logic is unit-testable without a DB.
 */

import { z } from "zod"
import { toSlug } from "@/lib/utils"
import { zodSanitizeString, zodSanitizeMultilineText, zodSanitizeUrl } from "@/lib/input-sanitization"
import { SITE_CONFIG } from "@/lib/constants"

// ─── Audience ────────────────────────────────────────────────────────────────

// A plain string column, not a Prisma enum — see the model comment in
// schema.prisma. Validated here instead.
export const GUIDE_AUDIENCES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const
export type GuideAudience = (typeof GUIDE_AUDIENCES)[number]
export const guideAudienceSchema = z.enum(GUIDE_AUDIENCES)

export const GUIDE_AUDIENCE_LABELS: Record<GuideAudience, string> = {
  BEGINNER: "For beginners",
  INTERMEDIATE: "For intermediate builders",
  ADVANCED: "For advanced builders",
}

// ─── Validation ──────────────────────────────────────────────────────────────

// Matches MAX_PDF_BYTES in upload-validation.ts — kept as a separate constant
// because that file is about what the upload route accepts, this one is about
// what a Guide record may claim as its own fileSize.
const MAX_GUIDE_FILE_BYTES = 25 * 1024 * 1024

// Empty-string-from-a-form -> undefined, otherwise sanitize. Kept as a factory
// rather than one shared instance so each field transform is independently
// typed by zod's inference.
const optionalSanitizedUrl = () =>
  z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? zodSanitizeUrl(v) || undefined : undefined))

const optionalSanitizedSlug = () =>
  z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? zodSanitizeString(v) || undefined : undefined))

export const createGuideSchema = z.object({
  title: z.string().min(3).max(200).transform(zodSanitizeString),
  summary: z.string().min(10).max(1000).transform(zodSanitizeMultilineText()),
  audience: guideAudienceSchema,
  fileUrl: z.string().url(),
  fileSize: z.number().int().min(1).max(MAX_GUIDE_FILE_BYTES),
  pageCount: z.number().int().min(1).optional(),
  coverUrl: optionalSanitizedUrl(),
  eventSlug: optionalSanitizedSlug(),
  sortOrder: z.number().int().optional().default(0),
  published: z.boolean().optional().default(false),
})

export const updateGuideSchema = createGuideSchema.partial()

// ─── Slugs ───────────────────────────────────────────────────────────────────

/**
 * Pick a unique slug for a guide title against the slugs already in use.
 * Appends -2, -3, ... on collision, unlike the blog's timestamp-suffix
 * scheme — a guide's slug is a public, shareable URL, so it should read as
 * "build-day-notes", not "build-day-notes-m1x2y3".
 *
 * `takenSlugs` only needs to contain slugs sharing this title's base (the
 * caller can query by `startsWith(toSlug(title))` — see the guides API route).
 */
export function uniqueGuideSlug(title: string, takenSlugs: readonly string[]): string {
  const base = toSlug(title) || "guide"
  const taken = new Set(takenSlugs)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * "2.1 MB" / "480 KB" — one decimal place above 1MB so a guide's size reads
 * precisely. KaribuGalleryIndex's `formatBytes` rounds to whole MB, which is
 * fine for a multi-hundred-photo zip but too coarse for a handful of PDFs.
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1000))} KB`
}

/** "PDF · 2.1 MB · 24 pages" — page count omitted when not set. */
export function guideMetaLine(fileSize: number, pageCount?: number | null): string {
  const parts = ["PDF", formatFileSize(fileSize)]
  if (pageCount) parts.push(`${pageCount} pages`)
  return parts.join(" · ")
}

// ─── Structured data ─────────────────────────────────────────────────────────

export interface GuideJsonLdInput {
  slug: string
  title: string
  summary: string
  fileUrl: string
  publishedAt: Date | string
}

/** DigitalDocument JSON-LD for a guide's detail page. Run through serializeJsonLd before injecting. */
export function buildGuideJsonLd(guide: GuideJsonLdInput) {
  const datePublished =
    typeof guide.publishedAt === "string" ? guide.publishedAt : guide.publishedAt.toISOString()

  return {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: guide.title,
    description: guide.summary,
    url: `${SITE_CONFIG.url}/resources/guides/${guide.slug}`,
    contentUrl: guide.fileUrl,
    encodingFormat: "application/pdf",
    datePublished,
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  }
}
