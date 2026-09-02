"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { MatchProfileTrack } from "./MatchProfileForm";
import { TrackRadioGroup } from "./TrackRadioGroup";
import { useOwnTrack } from "./useOwnTrack";

/** The caller's team, when one exists — enough to seed and label the control. */
interface PickerTeam {
  trackKey?: string | null;
  /** Shown only to reassure that a track change does not move the team. */
  table?: number | null;
}

/**
 * Track-change control for the dashboard. Two modes, one control:
 *
 * - No team yet (`team` absent): changes the caller's OWN declared track via
 *   PUT /api/impact-lab/profile. It moves nobody; it feeds the next matching
 *   run.
 * - Team revealed (`team` present): moves the WHOLE team via
 *   POST /api/impact-lab/team/track. Changing only your own track once teams
 *   are out looked broken — the team card and the track guide both read the
 *   team's track, so nothing the member could see ever moved.
 *
 * The table never changes in either mode: people have already sat down.
 */
export function TrackPicker({
  cohort,
  tracks,
  team,
  onTeamTrackChanged,
}: {
  /** The event this participant belongs to — appended as `?cohort=` on every fetch. */
  cohort?: string;
  /** The active event's declared tracks. Caller only renders this when non-empty. */
  tracks: MatchProfileTrack[];
  /**
   * The caller's revealed team. Present switches this control into
   * move-the-whole-team mode; absent (or null) keeps the personal-track
   * behaviour for a member with no team yet.
   */
  team?: PickerTeam | null;
  /** Called after a successful team move so the caller can refetch the team. */
  onTeamTrackChanged?: () => void;
}) {
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const teamMode = Boolean(team);
  const { trackKey: ownTrackKey, loading } = useOwnTrack(cohort, tracks);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed the radio group from the profile fetch once it settles — a plain
  // useState(ownTrackKey) initializer would freeze on "" from the first
  // render, before the fetch has a chance to resolve it. Personal mode only;
  // team mode seeds from the team below.
  useEffect(() => {
    if (teamMode || loading) return;
    setSelectedTrack(ownTrackKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed when the fetch itself settles, not on every keystroke of the select
  }, [loading, teamMode]);

  // Team mode re-seeds whenever the team's track actually changes, so the
  // group follows a refetch (including one triggered by a teammate's move)
  // instead of freezing on the value from first render.
  useEffect(() => {
    if (!teamMode) return;
    setSelectedTrack(team?.trackKey ?? "");
  }, [teamMode, team?.trackKey]);

  /** PUT the caller's own `interests`. Returns the line to show on success. */
  async function savePersonalTrack(): Promise<string> {
    const res = await fetch(`/api/impact-lab/profile${cohortQuery}`, {
      method: "PUT",
      headers: await csrfHeaders(),
      body: JSON.stringify({ interests: [selectedTrack] }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Could not save your track. Try again.");
    }
    return "Saved. Applies at the next team confirmation.";
  }

  /** Move the whole team. The server resolves which team from the session. */
  async function saveTeamTrack(): Promise<string> {
    const res = await fetch(`/api/impact-lab/team/track${cohortQuery}`, {
      method: "POST",
      headers: await csrfHeaders(),
      body: JSON.stringify({ trackKey: selectedTrack }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Could not change your team's track. Try again.");
    }
    return json.message || "Your team's track is changed.";
  }

  async function handleSave() {
    setSuccessMessage(null);
    setError(null);
    if (!selectedTrack) {
      setError("Pick a track before saving.");
      return;
    }
    setSaving(true);
    try {
      const message = teamMode ? await saveTeamTrack() : await savePersonalTrack();
      setSuccessMessage(message);
      if (teamMode) onTeamTrackChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const currentKey = teamMode ? (team?.trackKey ?? "") : selectedTrack;
  const currentLabel = tracks.find((t) => t.key === currentKey)?.label ?? "not chosen";
  // In team mode the current track comes from the already-loaded team prop,
  // so there is nothing to wait for and nothing to disable.
  const busy = saving || (!teamMode && loading);

  return (
    <section
      className="rounded-lg border border-border-default bg-bg-secondary p-5"
      aria-label={teamMode ? "Change your team's track" : "Change your track"}
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
        {"// ./change-track"}
      </p>
      <h3 className="font-mono text-base font-bold text-text-primary">
        {teamMode ? "Your team's track" : "Your track"}
      </h3>
      <p className="mt-1 mb-3 text-sm text-text-secondary">
        {teamMode ? "Your team is in" : "Your track"}:{" "}
        <span className="font-mono text-text-primary">
          {!teamMode && loading ? "…" : currentLabel}
        </span>
      </p>
      {teamMode && (
        <p className="mb-3 text-sm text-text-secondary">
          This moves your whole team. Your table stays the same. Agree it with
          your teammates first.
        </p>
      )}
      <div className="space-y-3">
        <TrackRadioGroup
          name="dashboard-track-picker"
          tracks={tracks}
          value={selectedTrack}
          onChange={(key) => {
            setSelectedTrack(key);
            setSuccessMessage(null);
            setError(null);
          }}
          disabled={busy}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-3 py-2 text-xs font-mono font-semibold text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-50 sm:w-auto"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saving ? "Saving…" : teamMode ? "Move my team" : "Save"}
        </button>
      </div>
      {successMessage && (
        <p
          className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-green-primary"
          role="status"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {successMessage}
        </p>
      )}
      {error && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-red">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}
