/**
 * Validation + sanitization for a participant record, shared by the create,
 * edit, and CSV-import routes. Arrays arrive already split (the CSV importer maps
 * columns and splits multi-value cells client-side); here we validate and clean.
 */

import { z } from "zod"
import {
  zodSanitizeEmail,
  zodSanitizeMultilineText,
  zodSanitizeString,
} from "@/lib/input-sanitization"

const tokenArray = z
  .array(z.string().max(80))
  .max(30)
  .default([])
  .transform((values) => values.map((v) => v.trim()).filter(Boolean))

const emailArray = z
  .array(z.string().max(254))
  .max(30)
  .default([])
  .transform((values) =>
    values.map((v) => zodSanitizeEmail(v)).filter(Boolean)
  )

export const participantDraftSchema = z.object({
  fullName: z.string().min(1).max(120).transform(zodSanitizeString),
  email: z.string().email().max(254).transform(zodSanitizeEmail),
  phone: z.string().max(30).optional().nullable(),
  institution: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v ? zodSanitizeString(v) : null)),
  experienceLevel: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
    .default("BEGINNER"),
  primaryRole: z.string().min(1).max(60).transform(zodSanitizeString),
  secondaryRoles: tokenArray,
  technicalSkills: tokenArray,
  interests: tokenArray,
  availability: tokenArray,
  projectIdeas: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v ? zodSanitizeMultilineText(2000)(v) : null)),
  preferredTeammates: emailArray,
  blockedTeammates: emailArray,
  consentToMatch: z.boolean().default(false),
  consentToShareContact: z.boolean().default(false),
})


/**
 * Update-only variants of the array fields: no `.default([])`, so a PATCH
 * that omits a list leaves it untouched instead of emptying it.
 */
const updateTokenArray = z
  .array(z.string().max(80))
  .max(30)
  .optional()
  .transform((values) => (values ? values.map((v) => v.trim()).filter(Boolean) : undefined))

const updateEmailArray = z
  .array(z.string().max(254))
  .max(30)
  .optional()
  .transform((values) =>
    values ? values.map((v) => zodSanitizeEmail(v)).filter(Boolean) : undefined
  )

/**
 * Same fields, all optional — for PATCH (edit) requests.
 *
 * Built from `.omit` + `.extend` rather than a plain `.partial()`: Zod's
 * `.partial()` keeps a field's `.default(false)` behaviour, so a PATCH body
 * that never mentions `consentToMatch`/`consentToShareContact` (e.g. "just
 * change the track") parsed to `{ consentToMatch: false, consentToShareContact:
 * false, ...track }` and the route wrote that straight into the update —
 * silently revoking both consents on every unrelated edit. The two fields are
 * redeclared as plain `.optional()` booleans with no default, so an absent
 * key stays absent and the route's `data: validation.data` only ever touches
 * the fields the caller actually sent.
 */
export const participantUpdateSchema = z.object({
  fullName: participantDraftSchema.shape.fullName.optional(),
  email: participantDraftSchema.shape.email.optional(),
  phone: participantDraftSchema.shape.phone,
  institution: participantDraftSchema.shape.institution,
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  primaryRole: participantDraftSchema.shape.primaryRole.optional(),
  secondaryRoles: updateTokenArray,
  technicalSkills: updateTokenArray,
  interests: updateTokenArray,
  availability: updateTokenArray,
  projectIdeas: participantDraftSchema.shape.projectIdeas,
  preferredTeammates: updateEmailArray,
  blockedTeammates: updateEmailArray,
  consentToMatch: z.boolean().optional(),
  consentToShareContact: z.boolean().optional(),
})

export type ParticipantDraft = z.infer<typeof participantDraftSchema>
