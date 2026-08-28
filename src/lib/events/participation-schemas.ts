// Zod validation for public event participation submissions (Conversations
// Live Q&A and problem-statement contributions). Consumed by
// src/app/api/events/[slug]/{questions,contributions}/route.ts.
//
// Deliberately does NOT import @/lib/prisma or anything that touches the
// database — this file is imported directly by the unit tests, and pulling
// in a PrismaClient would instantiate one at module load with no
// DATABASE_URL in the test environment.
//
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { z } from "zod"
import { KENYA_COUNTIES, MAX_QUESTION_LENGTH, MAX_CONTRIBUTION_LENGTH, MAX_NAME_LENGTH } from "@/lib/events/participation"
import { zodSanitizeString, zodSanitizeMultilineText } from "@/lib/input-sanitization"

/** Matches EventContribution.questionKey / ConversationsPage.tableQuestions[].key @db.VarChar(40). */
const MAX_QUESTION_KEY_LENGTH = 40

/**
 * Honeypot field. Real visitors never see or fill this input (hidden via
 * CSS on the form); a non-empty value marks the submission as automated.
 * Left unsanitized on purpose — the route only checks presence, never
 * stores or renders it.
 */
const honeypotField = z.string().optional()

const submitterFields = {
  submitterName: z.string().min(2).max(MAX_NAME_LENGTH).transform(zodSanitizeString),
  county: z.enum(KENYA_COUNTIES),
  website: honeypotField,
}

/** POST /api/events/[slug]/questions body. */
export const questionSubmissionSchema = z.object({
  body: z.string().min(10).max(MAX_QUESTION_LENGTH).transform(zodSanitizeMultilineText(MAX_QUESTION_LENGTH)),
  ...submitterFields,
})

export type QuestionSubmissionInput = z.infer<typeof questionSubmissionSchema>

/** POST /api/events/[slug]/contributions body. */
export const contributionSubmissionSchema = z.object({
  body: z.string().min(10).max(MAX_CONTRIBUTION_LENGTH).transform(zodSanitizeMultilineText(MAX_CONTRIBUTION_LENGTH)),
  questionKey: z.string().min(1).max(MAX_QUESTION_KEY_LENGTH).transform(zodSanitizeString),
  ...submitterFields,
})

export type ContributionSubmissionInput = z.infer<typeof contributionSubmissionSchema>
