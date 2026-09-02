"use client";

import { useEffect, useState } from "react";
import type { MatchProfileTrack } from "./MatchProfileForm";

interface ProfileResponse {
  success?: boolean;
  profile?: { interests?: string[] };
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
        const current = json.profile?.interests?.[0];
        setTrackKey(tracks.some((t) => t.key === current) ? current! : "");
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
