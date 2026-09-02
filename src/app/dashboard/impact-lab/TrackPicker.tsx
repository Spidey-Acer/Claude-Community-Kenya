"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { MatchProfileTrack } from "./MatchProfileForm";
import { TrackRadioGroup } from "./TrackRadioGroup";
import { useOwnTrack } from "./useOwnTrack";

/**
 * Standalone track-change control for the dashboard. Unlike
 * `MatchProfileForm`'s track select (only reachable while filling out the
 * full profile, before teams exist), this renders on its own wherever a
 * participant might want to change their mind after the fact — including
 * once teams are revealed — and saves only `interests`, never touching the
 * rest of the profile. The change doesn't move anyone off their current
 * team; it takes effect the next time organisers re-run matching.
 */
export function TrackPicker({
  cohort,
  tracks,
}: {
  /** The event this participant belongs to — appended as `?cohort=` on every fetch. */
  cohort?: string;
  /** The active event's declared tracks. Caller only renders this when non-empty. */
  tracks: MatchProfileTrack[];
}) {
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const { trackKey, loading } = useOwnTrack(cohort, tracks);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the select from the resolved profile once the fetch settles — a
  // plain useState(trackKey) initializer would freeze on "" from the first
  // render, before the fetch has a chance to resolve it.
  useEffect(() => {
    if (!loading) setSelectedTrack(trackKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed when the fetch itself settles, not on every keystroke of the select
  }, [loading]);

  async function handleSave() {
    setSaved(false);
    setError(null);
    if (!selectedTrack) {
      setError("Pick a track before saving.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/impact-lab/profile${cohortQuery}`, {
        method: "PUT",
        headers: await csrfHeaders(),
        body: JSON.stringify({ interests: selectedTrack ? [selectedTrack] : [] }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not save your track. Try again.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const currentLabel = tracks.find((t) => t.key === selectedTrack)?.label ?? "not chosen";

  return (
    <section
      className="rounded-lg border border-border-default bg-bg-secondary p-5"
      aria-label="Change your track"
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
        {"// ./change-track"}
      </p>
      <p className="mb-3 text-sm text-text-secondary">
        Your track: <span className="font-mono text-text-primary">{loading ? "…" : currentLabel}</span>
      </p>
      <div className="space-y-3">
        <TrackRadioGroup
          name="dashboard-track-picker"
          tracks={tracks}
          value={selectedTrack}
          onChange={(key) => {
            setSelectedTrack(key);
            setSaved(false);
            setError(null);
          }}
          disabled={loading || saving}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-3 py-2 text-xs font-mono font-semibold text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-50 sm:w-auto"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {saved && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-green-primary">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Saved. Applies at the next team confirmation.
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
