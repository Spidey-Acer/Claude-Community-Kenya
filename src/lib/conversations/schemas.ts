// Zod schemas for the Conversations Live admin surface: page config, result
// publish, moderation, and Q&A sessions. Field lengths mirror the Prisma
// column limits in schema.prisma (ConversationsPage's Json columns have no
// DB-level constraint, so these are the only enforcement).
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { z } from "zod"
import { zodSanitizeString, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { MAX_RESULT_RUNNERS_UP } from "./constants"

export const framingStatSchema = z.object({
  line: z.string().min(1).max(300).transform(zodSanitizeString),
  source: z.string().min(1).max(200).transform(zodSanitizeString),
})
export type FramingStat = z.infer<typeof framingStatSchema>

export const tableQuestionSchema = z.object({
  key: z.string().min(1).max(40).transform(zodSanitizeString),
  label: z.string().min(1).max(120).transform(zodSanitizeString),
  description: z.string().min(1).max(300).transform(zodSanitizeString),
})
export type TableQuestion = z.infer<typeof tableQuestionSchema>

export const seedProblemSchema = z.object({
  title: z.string().min(1).max(150).transform(zodSanitizeString),
  statement: z.string().min(1).max(600).transform(zodSanitizeMultilineText(600)),
  questionKey: z.string().min(1).max(40).transform(zodSanitizeString),
  buildWedge: z.string().max(300).optional().transform((v) => (v ? zodSanitizeString(v) : undefined)),
})
export type SeedProblem = z.infer<typeof seedProblemSchema>

export const resultEntrySchema = z.object({
  title: z.string().min(1).max(150).transform(zodSanitizeString),
  statement: z.string().min(1).max(600).transform(zodSanitizeMultilineText(600)),
})
export type ResultEntry = z.infer<typeof resultEntrySchema>

/** Body shape for PUT /api/admin/conversations/[eventId]/result. `publishedAt`
 * is never accepted from the client — the route stamps it server-side. */
export const resultInputSchema = z.object({
  winner: resultEntrySchema,
  runnersUp: z.array(resultEntrySchema).max(MAX_RESULT_RUNNERS_UP).default([]),
  note: z.string().max(500).optional().transform((v) => (v ? zodSanitizeString(v) : undefined)),
})
export type ResultInput = z.infer<typeof resultInputSchema>

/** The stored shape of ConversationsPage.result — resultInputSchema plus the
 * server-stamped publish timestamp. */
export interface ConversationsResult extends ResultInput {
  publishedAt: string
}

/** Body shape for PUT /api/admin/conversations/[eventId] (Config tab). All
 * fields optional — the route only touches what's sent. */
export const pageConfigUpdateSchema = z.object({
  heroHeadline: z.string().min(1).max(200).transform(zodSanitizeString).optional(),
  heroSubline: z.string().min(1).max(300).transform(zodSanitizeString).optional(),
  framingStats: z.array(framingStatSchema).optional(),
  tableQuestions: z.array(tableQuestionSchema).min(1).optional(),
  seedProblems: z.array(seedProblemSchema).optional(),
  contributionsOpen: z.boolean().optional(),
})
export type PageConfigUpdate = z.infer<typeof pageConfigUpdateSchema>

/** Body shape for POST /api/admin/conversations — attach a ConversationsPage
 * to an event. Overrides are optional; unset fields fall back to kit
 * defaults (see DEFAULT_TABLE_QUESTIONS) or empty collections. */
export const attachPageSchema = z.object({
  eventId: z.string().min(1),
  heroHeadline: z.string().min(1).max(200).transform(zodSanitizeString).optional(),
  heroSubline: z.string().min(1).max(300).transform(zodSanitizeString).optional(),
  framingStats: z.array(framingStatSchema).optional(),
  tableQuestions: z.array(tableQuestionSchema).min(1).optional(),
  seedProblems: z.array(seedProblemSchema).optional(),
  contributionsOpen: z.boolean().optional(),
})
export type AttachPageInput = z.infer<typeof attachPageSchema>

/** Body shape for PATCH /api/admin/moderation — a single queue-row
 * transition. `kind` disambiguates EventQuestion from EventContribution,
 * which share a status enum but live in different tables. */
export const moderationPatchSchema = z.object({
  kind: z.enum(["question", "contribution"]),
  id: z.string().min(1),
  status: z.enum(["APPROVED", "FEATURED", "REJECTED"]),
})
export type ModerationPatchInput = z.infer<typeof moderationPatchSchema>

/** Body shape for POST /api/admin/questions/sessions — create a session. */
export const sessionCreateSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1).max(150).transform(zodSanitizeString),
  prompt: z.string().min(1).max(1000).transform(zodSanitizeMultilineText(1000)),
  isOpen: z.boolean().optional().default(false),
})
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>

/** Body shape for PATCH /api/admin/questions/sessions — open/close/edit an
 * existing session. `id` travels in the body since the route is flat. */
export const sessionPatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(150).transform(zodSanitizeString).optional(),
  prompt: z.string().min(1).max(1000).transform(zodSanitizeMultilineText(1000)).optional(),
  isOpen: z.boolean().optional(),
})
export type SessionPatchInput = z.infer<typeof sessionPatchSchema>
