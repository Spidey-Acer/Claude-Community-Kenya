/**
 * @module tool-schema
 * @purpose Zod schema for the `record_visitor` AI tool call.
 *
 * Validates arguments before they are persisted to the karibu session cookie
 * or used to personalise the site. Exported type `RecordVisitorArgs` is used
 * by the tool handler so it never touches unvalidated input.
 */

import { z } from "zod";
import { AUDIENCES, INTENTS, EXPERIENCES } from "@/lib/karibu/types";

/**
 * Validates the arguments passed to the `record_visitor` tool.
 *
 * @remarks
 * - `audience` is required; all other fields are optional.
 * - `name` and `city` must be supplied only when the user volunteered them —
 *   never inferred or guessed.
 * - `language` is restricted to the two supported locales: `"en"` and `"sw"`.
 *
 * @example
 * const result = recordVisitorSchema.safeParse({ audience: "dev", intent: "build" });
 * if (!result.success) throw new Error("Invalid tool args");
 */
export const recordVisitorSchema = z.object({
  audience: z.enum(AUDIENCES),
  intent: z.enum(INTENTS).optional(),
  experience: z.enum(EXPERIENCES).optional(),
  name: z.string().min(1).max(80).optional(),
  city: z.string().min(1).max(80).optional(),
  language: z.enum(["en", "sw"]).optional(),
});

export type RecordVisitorArgs = z.infer<typeof recordVisitorSchema>;

export const RECORD_VISITOR_TOOL_DESCRIPTION =
  "Records what you've learned about the visitor so we can personalize the site for them. " +
  "Only call once per conversation, when you have at least the audience and ideally intent and experience. " +
  "Do not include name/city/language unless the user volunteered them.";
