/**
 * Validates organiser-supplied match settings and merges them over the engine
 * defaults, so a partial settings object from the admin form always resolves to
 * a complete, valid MatchSettings the engine can run.
 */

import { z } from "zod"
import { DEFAULT_SETTINGS, DEFAULT_WEIGHTS, type MatchSettings } from "@/lib/matching"

const weightsSchema = z
  .object({
    roleCoverage: z.number().min(0).max(10),
    skillBalance: z.number().min(0).max(10),
    experienceBalance: z.number().min(0).max(10),
    interestAlignment: z.number().min(0).max(10),
    availabilityOverlap: z.number().min(0).max(10),
    participantPreferences: z.number().min(0).max(10),
  })
  .partial()

const lockedTeamSchema = z.object({
  name: z.string().max(80).optional(),
  memberEmails: z.array(z.string().email()).max(10),
})

export const settingsSchema = z
  .object({
    desiredTeamSize: z.number().int().min(2).max(8),
    minTeamSize: z.number().int().min(1).max(8),
    maxTeamSize: z.number().int().min(2).max(10),
    numberOfTeams: z.number().int().min(1).max(200).nullable(),
    allowUnassignedParticipants: z.boolean(),
    requireBuilder: z.boolean(),
    requirePresenter: z.boolean(),
    preventBeginnerOnlyTeams: z.boolean(),
    distributeAdvancedParticipants: z.boolean(),
    keepPreferredTogether: z.boolean(),
    lockedTeams: z.array(lockedTeamSchema),
    weights: weightsSchema,
  })
  .partial()

/**
 * Merge a validated partial settings object over the engine defaults. Weights
 * and lockedTeams merge explicitly so a partial weights map keeps the default
 * values for the weights the organiser didn't touch.
 */
export function resolveSettings(input: unknown): MatchSettings {
  const parsed = settingsSchema.parse(input ?? {})
  const resolved: MatchSettings = {
    ...DEFAULT_SETTINGS,
    ...parsed,
    numberOfTeams: parsed.numberOfTeams ?? null,
    lockedTeams: parsed.lockedTeams ?? DEFAULT_SETTINGS.lockedTeams,
    weights: { ...DEFAULT_WEIGHTS, ...(parsed.weights ?? {}) },
  }
  // Cross-field check zod can't express when a bound is omitted: an inverted
  // range silently produces garbage teams, so reject it here (routes → 400).
  if (resolved.minTeamSize > resolved.maxTeamSize) {
    throw new Error("minTeamSize cannot exceed maxTeamSize")
  }
  return resolved
}
