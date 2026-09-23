/**
 * Shared logic for the Guides library — zod schemas, slug generation, and
 * small formatting/JSON-LD helpers, kept as pure functions so the admin
 * routes and pages stay thin and the logic is unit-testable without a DB.
 */

import { z } from "zod"
import { toSlug } from "@/lib/utils"
import { zodSanitizeString, zodSanitizeMultilineText } from "@/lib/input-sanitization"
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
// what a Guide record may claim as its own fileSize. See upload-validation.ts
// for why this is 4MB, not the 25MB originally specified.
const MAX_GUIDE_FILE_BYTES = 4 * 1024 * 1024

/**
 * Host allowlist for fileUrl/coverUrl: only an https URL on a *.supabase.co
 * host is accepted. These values reach an <a href>, an <iframe src>, and
 * next/image — a `javascript:` or `data:` URL there is stored XSS, and any
 * other https host is still an open redirect / SSRF-flavoured hole plus a
 * next/image 500 for an unconfigured remote host. Reject, don't sanitize:
 * there is no legitimate reason a guide's file lives anywhere but the
 * bucket our own upload route writes to.
 */
export function isSupabaseHttpsUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === "https:" && url.hostname.endsWith(".supabase.co")
}

function supabaseUrlSchema(fieldName: string) {
  return z
    .string()
    .max(500)
    .refine(isSupabaseHttpsUrl, { message: `${fieldName} must be an https Supabase Storage URL` })
}

// Empty-string-from-a-form -> undefined, otherwise validated against the
// Supabase host allowlist above. A factory (not one shared instance) so
// each field's error message names the right field.
function optionalSupabaseUrl(fieldName: string) {
  return z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined))
    .refine((v) => v === undefined || isSupabaseHttpsUrl(v), {
      message: `${fieldName} must be an https Supabase Storage URL`,
    })
}

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
  fileUrl: supabaseUrlSchema("fileUrl"),
  fileSize: z.number().int().min(1).max(MAX_GUIDE_FILE_BYTES),
  pageCount: z.number().int().min(1).optional(),
  coverUrl: optionalSupabaseUrl("coverUrl"),
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
