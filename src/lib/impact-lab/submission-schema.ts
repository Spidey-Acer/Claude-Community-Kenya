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
import type { SubmissionRequirements } from "./submission-requirements"

// Raised mid-event: teams were hitting the ceiling while writing up what
// works versus what is mocked, and a submission you cannot finish is worse
// than a long one. Every one of these columns is Postgres `text` (Prisma
// `String`/`@db.Text`), so there is no storage limit behind these numbers —
// they exist only to bound abuse, and can be raised freely.
const MAX_LONG_TEXT = 10_000

/** Adds https:// when a scheme is absent; leaves empty input untouched. */
function withScheme(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const requiredUrl = z
  .string()
  .max(1000)
  .transform(withScheme)
  .refine((v) => v !== "", { message: "A link is required" })
  .transform(zodSanitizeUrl)
  .refine((v) => v !== "", { message: "That link is not a valid http(s) URL" })

// Empty input becomes null; anything supplied must survive sanitisation, so a
// rejected scheme surfaces as a validation error instead of a silent null.
const optionalUrl = z
  .string()
  .max(1000)
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

/**
 * By default, the pitch deck is the only required field. Everything else is
 * optional.
 *
 * The original form required eight fields including a repository URL, which
 * fitted the Impact Lab: a Claude Code hackathon where every team shipped
 * software and every team had a repo. It does not fit a mixed startup cohort
 * containing Black Soldier Fly biotechnology, hardware IoT and a healthcare
 * media platform — those teams could not submit at all.
 *
 * The organiser's ruling is that the deck is what judges actually score from,
 * so it is the one thing a submission cannot be without. Teams pitch live for
 * five minutes; the written fields are a convenience, not the evidence, and a
 * required field that stops a team submitting at 2 AM costs more than a blank
 * one. A team is identified by its team name, which comes from the run rather
 * than from this form, so a sparse submission is still attributable.
 *
 * This is only the default posture, though — see `buildSubmissionSchema`.
 * The 2 Sep 2026 cohort is the opposite case: a Claude Code hackathon where
 * the demo is live and slides are optional, so seven other fields are
 * required instead. `submission-requirements.ts` holds the per-cohort table;
 * this file only knows how to turn that table into a schema.
 */

/** Optional single-line text; absent or whitespace-only becomes "". */
function optionalText(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((v) => zodSanitizeString(v ?? ""))
}

/** Optional multi-line text; absent or whitespace-only becomes "". */
function optionalMultilineText(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((v) => zodSanitizeMultilineText(max)(v ?? ""))
}

/**
 * Like `optionalUrl`, but absent becomes `""` rather than `null`.
 *
 * `ImpactLabSubmission.repoUrl` is a non-nullable column and this is a live
 * event — widening it would mean a schema migration against production during
 * demos, to gain nothing a reader can see. Every consumer already guards with
 * `submission.repoUrl && …`, and "" is falsy, so an empty string behaves
 * identically to null at every call site.
 */
const optionalUrlAsEmpty = z
  .string()
  .max(1000)
  .optional()
  .transform((v) => withScheme(v ?? ""))
  .transform((v) => (v === "" ? "" : zodSanitizeUrl(v)))
  .refine((v) => v !== null, { message: "That link is not a valid http(s) URL" })
  .transform((v) => v ?? "")

/**
 * Builds the submission schema for a cohort's requirements. Every field
 * always sanitises the same way; `requirements.required` only decides
 * whether the sanitised result may be empty.
 *
 * `repoUrl` keeps `optionalUrlAsEmpty`'s "" fallback (not `optionalUrl`'s
 * null) when not required — see that helper's docstring on why the column
 * cannot be nullable — and switches to `requiredUrl` when it is.
 */
export function buildSubmissionSchema(requirements: SubmissionRequirements) {
  const isRequired = (field: keyof SubmissionInput) => requirements.required.has(field)

  return z.object({
    projectName: isRequired("projectName") ? requiredText(200) : optionalText(200),
    pitch: isRequired("pitch") ? requiredText(500) : optionalText(500),
    description: optionalMultilineText(MAX_LONG_TEXT),
    worksVsMocked: isRequired("worksVsMocked")
      ? requiredMultilineText(MAX_LONG_TEXT)
      : optionalMultilineText(MAX_LONG_TEXT),
    claudeUsage: isRequired("claudeUsage")
      ? requiredMultilineText(MAX_LONG_TEXT)
      : optionalMultilineText(MAX_LONG_TEXT),
    track: isRequired("track") ? requiredText(200) : optionalText(200),
    problemTackled: isRequired("problemTackled") ? requiredText(1000) : optionalText(1000),
    repoUrl: isRequired("repoUrl") ? requiredUrl : optionalUrlAsEmpty,
    demoUrl: isRequired("demoUrl") ? requiredUrl : optionalUrl,
    videoUrl: isRequired("videoUrl") ? requiredUrl : optionalUrl,
    slidesUrl: isRequired("slidesUrl") ? requiredUrl : optionalUrl,
    screenshotUrl: isRequired("screenshotUrl") ? requiredUrl : optionalUrl,
  })
}

/**
 * The default profile's schema — every cohort not named in
 * `submission-requirements.ts`. Kept as a standalone export so existing
 * callers that don't resolve a cohort still compile; the member routes use
 * `buildSubmissionSchema` with the caller's actual cohort instead.
 */
export const submissionInputSchema = buildSubmissionSchema({
  required: new Set(["slidesUrl"]),
  labels: {},
  trackSelect: false,
})

export type SubmissionInput = {
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
}

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
