/**
 * Impact Lab matching engine — track partitioning.
 *
 * Splits the eligible pool into per-track buckets before the main algorithm
 * runs, so no team spans two tracks. Two rules:
 *   1. A participant's track is resolved from their raw `interests` against
 *      the event's declared tracks (resolveTrack, tracks.ts). No resolvable
 *      track ("Any", empty, or no match) lands them in `unassigned` — round-
 *      robin distribution into the smallest bucket happens one layer up, in
 *      `runMatchingByTrack` (index.ts), because that step also needs to
 *      account for keep-together groups already placed.
 *   2. Buckets are keyed by track key. A track with zero resolvable
 *      participants still gets an (empty) bucket entry so callers can tell
 *      "no one wants this track" from "this track doesn't exist".
 */

import { resolveTrack } from "../impact-lab/tracks"
import type { MatchParticipant, MatchSettings } from "./types"

export interface TrackPartition {
  /** Track key → participants who declared that track. */
  buckets: Map<string, MatchParticipant[]>
  /** Participants whose interests resolved to no declared track ("Any" or unmatched). */
  unassigned: MatchParticipant[]
}

/**
 * Partition participants by declared track. Only participants already known
 * to be eligible (consentToMatch) need be passed in — this function does not
 * re-check consent, matching the rest of the engine's "caller filters, engine
 * trusts" convention.
 */
export function partitionParticipants(
  participants: MatchParticipant[],
  settings: MatchSettings
): TrackPartition {
  const buckets = new Map<string, MatchParticipant[]>()
  for (const track of settings.tracks) buckets.set(track.key, [])

  const unassigned: MatchParticipant[] = []
  for (const participant of participants) {
    const key = resolveTrack(settings.tracks, participant.interests)
    if (key && buckets.has(key)) {
      buckets.get(key)!.push(participant)
    } else {
      unassigned.push(participant)
    }
  }

  return { buckets, unassigned }
}
