/**
 * Validation for a team's project submission.
 *
 * URLs get the scheme they were typed without ("github.com/x" becomes
 * "https://github.com/x") and are then sanitised. zodSanitizeUrl returns ""
 * for a rejected scheme rather than throwing, so every URL field refines on
 * non-empty afterwards — otherwise "javascript:alert(1)" would be stored
 * silently as an empty string instead of being reported to the submitter.
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

export const submissionInputSchema = z.object({
  projectName: z.string().min(1).max(120).transform(zodSanitizeString),
  pitch: z.string().min(1).max(200).transform(zodSanitizeString),
  description: z
    .string()
    .min(1)
    .max(MAX_LONG_TEXT)
    .transform(zodSanitizeMultilineText(MAX_LONG_TEXT)),
  worksVsMocked: z
    .string()
    .min(1)
    .max(MAX_LONG_TEXT)
    .transform(zodSanitizeMultilineText(MAX_LONG_TEXT)),
  claudeUsage: z
    .string()
    .min(1)
    .max(MAX_LONG_TEXT)
    .transform(zodSanitizeMultilineText(MAX_LONG_TEXT)),
  track: z.string().min(1).max(80).transform(zodSanitizeString),
  problemTackled: z.string().min(1).max(300).transform(zodSanitizeString),
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
