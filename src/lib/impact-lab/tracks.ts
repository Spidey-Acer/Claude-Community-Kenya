/**
 * Impact Lab event tracks — organiser-defined problem lanes a participant
 * can declare (or leave as "Any"), so matching can group people who share a
 * track onto the same team.
 *
 * A track's `aliases` are the registration-answer tokens that mean this
 * track — e.g. a Luma question answered "work-and-jobs" resolves to the
 * track keyed "jobs" if "work-and-jobs" is listed as an alias. Matching
 * against a participant's raw `interests` values, not just the key, is what
 * lets an event's tracks be defined AFTER registration already collected
 * free-text answers.
 */

import { z } from "zod"
import type { Track } from "@/lib/matching/types"

export type { Track }

/** Validates one track; its parsed output satisfies the engine's `Track` shape. */
export const trackSchema = z.object({
  /** Slug identifying the track. Stable — used as Team.trackKey and in team names. */
  key: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Track key must be lowercase letters, digits and hyphens."),
  label: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).optional(),
  /** Registration-answer tokens that mean this track. Matched case-insensitively. */
  aliases: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
})

// Compile-time check that the schema's output shape matches the engine's
// `Track` interface — a mismatch here means tracks.ts and matching/types.ts
// drifted, not a mismatch at runtime.
const _trackShapeCheck: Track = {} as z.infer<typeof trackSchema>
void _trackShapeCheck


/** Same slugifier as luma.ts's territory mapping — lowercase, non-alphanumerics to hyphens. */
function slugifyToken(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Parse an event's stored `tracks` JSON. Tolerant by design — a malformed or
 * foreign JSON value (legacy row, hand-edited data) degrades to no tracks
 * rather than throwing, since a broken tracks column must not take down the
 * event or the matcher.
 */
export function parseTracks(json: unknown): Track[] {
  if (!Array.isArray(json)) return []
  const parsed = z.array(trackSchema).safeParse(json)
  return parsed.success ? parsed.data : []
}

/**
 * Resolve a participant's declared interests to a track key. Matches when any
 * interest token — slugified the same way registration territory answers are
 * — equals a track's key or one of its (also slugified) aliases. "any", ""
 * and unmatched tokens resolve to null, meaning "no declared track".
 */
export function resolveTrack(tracks: Track[], interests: string[]): string | null {
  if (tracks.length === 0) return null

  const aliasIndex = new Map<string, string>()
  for (const track of tracks) {
    aliasIndex.set(track.key, track.key)
    for (const alias of track.aliases) {
      aliasIndex.set(slugifyToken(alias), track.key)
    }
  }

  for (const raw of interests) {
    const token = slugifyToken(raw)
    if (!token || token === "any") continue
    const match = aliasIndex.get(token)
    if (match) return match
  }
  return null
}
