/**
 * Shared vocabulary for the community showcase.
 *
 * Route validation and UI chips both read from here so a need key rendered as
 * a filter can never drift from one the API will accept.
 */

export const NEEDS_OPTIONS = [
  "testers",
  "co-founder",
  "frontend-dev",
  "backend-dev",
  "mobile-dev",
  "designer",
  "data",
  "intro",
  "funding",
  "feedback",
] as const

export type NeedKey = (typeof NEEDS_OPTIONS)[number]

export const NEED_LABELS: Record<NeedKey, string> = {
  testers: "Testers",
  "co-founder": "Co-founder",
  "frontend-dev": "Frontend dev",
  "backend-dev": "Backend dev",
  "mobile-dev": "Mobile dev",
  designer: "Designer",
  data: "Data",
  intro: "An intro",
  funding: "Funding",
  feedback: "Feedback",
}

export function isNeedKey(value: string): value is NeedKey {
  return (NEEDS_OPTIONS as readonly string[]).includes(value)
}

/** Fixed set. Adding one is a product decision, not a config tweak. */
export const REACTION_EMOJI = ["🔥", "🙌", "🧠", "😂", "🚀"] as const

export type ReactionEmoji = (typeof REACTION_EMOJI)[number]

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value)
}

export const MAX_MEDIA_PER_POST = 5
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_DEMO_BYTES = 15 * 1024 * 1024

/**
 * Content types a presigned upload URL may be minted for.
 *
 * The bytes still decide what a file really is — that happens in finalize. This
 * list exists for a different reason: the content type is baked into the
 * signature and stored on the object, and R2 serves the bucket from a public
 * domain. Signing for `text/html` would put an attacker-authored page on that
 * origin, reachable whether or not finalize ever accepts it. Doubles as the
 * `accept` attribute for the composer's file input.
 */
export const UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
] as const

export function isUploadContentType(value: string): boolean {
  return (UPLOAD_CONTENT_TYPES as readonly string[]).includes(value)
}

/**
 * Report reasons, as plain strings rather than the Prisma `ReportReason` enum.
 *
 * The report control is a client component, and importing a generated Prisma
 * enum into one pulls `@prisma/client/runtime` into the browser bundle — which
 * fails the build outright ("the chunking context does not support external
 * modules"). The values here must stay identical to the enum in schema.prisma;
 * the test beside this file asserts that.
 */
export const REPORT_REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "ABUSE", label: "Abuse or harassment" },
  { value: "OFF_TOPIC", label: "Off topic" },
  { value: "PLAGIARISM", label: "Plagiarism" },
  { value: "OTHER", label: "Something else" },
] as const

export type ReportReasonValue = (typeof REPORT_REASONS)[number]["value"]
