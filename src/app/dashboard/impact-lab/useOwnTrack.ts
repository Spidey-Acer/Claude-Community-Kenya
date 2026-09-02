"use client";

import { useEffect, useState } from "react";
import { resolveTrack, type Track } from "@/lib/impact-lab/tracks";
import type { MatchProfileTrack } from "./MatchProfileForm";

interface ProfileResponse {
  success?: boolean;
  profile?: { interests?: string[] };
}

/**
 * Resolve a member's saved `interests` to one of the event's track keys, or
 * "" when none of them names a track.
 *
 * Registration answers are alias tokens ("family-kids-community"), not track
 * keys — comparing `interests[0]` to `track.key` misses most of the room. The
 * shared `resolveTrack` slugifies and checks every interest against each
 * track's key AND its aliases. `MatchProfileTrack` makes the guide fields
 * optional (a track may predate them), so defaults are filled in before the
 * cast — `resolveTrack` iterates `aliases` and would throw on undefined.
 */
export function resolveOwnTrack(
  tracks: MatchProfileTrack[],
  interests: string[]
): string {
  const complete: Track[] = tracks.map((track) => ({
    ...track,
    aliases: track.aliases ?? [],
    rules: track.rules ?? [],
  }));
  return resolveTrack(complete, interests) ?? "";
}

/**
 * The caller's own declared track key, resolved from GET
 * /api/impact-lab/profile against the event's declared tracks. Shared by
 * `TrackPicker` (to seed the select) and `TeamReveal` (to detect a mismatch
 * against the team's track) so both read the same fetch/resolve logic
 * instead of duplicating it.
 */
export function useOwnTrack(
  cohort: string | undefined,
  tracks: MatchProfileTrack[]
): { trackKey: string; loading: boolean } {
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const [trackKey, setTrackKey] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/impact-lab/profile${cohortQuery}`)
      .then((res) => res.json() as Promise<ProfileResponse>)
      .then((json) => {
        if (!active) return;
        setTrackKey(resolveOwnTrack(tracks, json.profile?.interests ?? []));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracks is a stable prop from the server-rendered event
  }, [cohortQuery]);

  return { trackKey, loading };
}
