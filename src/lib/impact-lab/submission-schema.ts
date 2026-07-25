/**
 * Validation for a team's project submission.
 *
 * URLs get the scheme they were typed without ("github.com/x" becomes
 * "https://github.com/x") and are then sanitised. zodSanitizeUrl returns ""
 * for a rejected scheme rather than throwing, so every URL field refines on
 * non-empty afterwards — otherwise "javascript:alert(1)" would be stored
 * silently as an empty string instead of being reported to the submitter.
 *
 * Required text fields follow the same shape: sanitise first, refine on
 * non-empty afterwards. zodSanitizeString/zodSanitizeMultilineText trim and
 * strip markup, so a raw string that looks non-empty ("   ", "<b></b>") can
 * still sanitise down to "". Checking .min(1) on the raw input would miss
 * that and let a blank submission through silently.
 */

import { z } from "zod"
import {
  zodSanitizeMultilineText,
  zodSanitizeString,
  zodSanitizeUrl,
} from "@/lib/input-sanitization"

const MAX_LONG_TEXT = 2000

/** Adds https:// when a scheme is absent; leaves empty input untouched. */
function withScheme(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const requiredUrl = z
  .string()
  .max(300)
  .transform(withScheme)
  .refine((v) => v !== "", { message: "A link is required" })
  .transform(zodSanitizeUrl)
  .refine((v) => v !== "", { message: "That link is not a valid http(s) URL" })

// Empty input becomes null; anything supplied must survive sanitisation, so a
// rejected scheme surfaces as a validation error instead of a silent null.
const optionalUrl = z
  .string()
  .max(300)
  .optional()
  .transform((v) => withScheme(v ?? ""))
  .transform((v) => (v === "" ? null : zodSanitizeUrl(v)))
  .refine((v) => v !== "", { message: "That link is not a valid http(s) URL" })

/**
 * A required single-line field: sanitise, then refine on non-empty. Catches
 * whitespace-only and markup-only input, which .min(1) on the raw string
 * would miss since sanitising happens after that check.
 */
function requiredText(max: number) {
  return z
    .string()
    .max(max)
    .transform(zodSanitizeString)
    .refine((v) => v !== "", { message: "This field is required" })
}

/** Same as requiredText, but for multi-line fields using the multiline sanitiser. */
function requiredMultilineText(max: number) {
  return z
    .string()
    .max(max)
    .transform(zodSanitizeMultilineText(max))
    .refine((v) => v !== "", { message: "This field is required" })
}

export const submissionInputSchema = z.object({
  projectName: requiredText(120),
  pitch: requiredText(200),
  description: requiredMultilineText(MAX_LONG_TEXT),
  worksVsMocked: requiredMultilineText(MAX_LONG_TEXT),
  claudeUsage: requiredMultilineText(MAX_LONG_TEXT),
  track: requiredText(80),
  problemTackled: requiredText(300),
  repoUrl: requiredUrl,
  demoUrl: optionalUrl,
  videoUrl: optionalUrl,
  slidesUrl: optionalUrl,
  screenshotUrl: optionalUrl,
})

export type SubmissionInput = z.infer<typeof submissionInputSchema>

/** What the member GET returns — the form's fields plus who last touched it. */
export interface SubmissionView {
  projectName: string
  pitch: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  track: string
  problemTackled: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
  screenshotUrl: string | null
  /** Teammate display name, resolved from the cohort; email is never exposed. */
  lastEditedByName: string
  updatedAt: string
}
