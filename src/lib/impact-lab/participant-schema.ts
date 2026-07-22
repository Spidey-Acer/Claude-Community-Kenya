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

/** Same fields, all optional — for PATCH (edit) requests. */
export const participantUpdateSchema = participantDraftSchema.partial()

export type ParticipantDraft = z.infer<typeof participantDraftSchema>
