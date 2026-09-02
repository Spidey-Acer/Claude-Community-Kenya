"use client";

import type { MatchProfileTrack } from "./MatchProfileForm";

/**
 * Shared track-choice control for `TrackPicker` and `MatchProfileForm`. A
 * track is a required choice once an event declares any — there is no "Any
 * track" option — so this always renders one card per declared track, never
 * a fallback option. Real `<input type="radio">` elements (visually hidden)
 * back each card, so the group works with keyboard and screen readers the
 * same as a native radio set; only the label styling is custom.
 */
export function TrackRadioGroup({
  tracks,
  value,
  onChange,
  name,
  disabled,
}: {
  tracks: MatchProfileTrack[];
  /** The selected track's key, or "" when nothing has been chosen yet. */
  value: string;
  onChange: (key: string) => void;
  /** Groups the underlying radio inputs — must be unique per rendered instance. */
  name: string;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <legend className="sr-only">Choose your track</legend>
      {tracks.map((track) => {
        const selected = value === track.key;
        return (
          <label
            key={track.key}
            className={`flex min-h-11 cursor-pointer flex-col justify-center rounded border px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-green-primary/60 ${
              selected
                ? "border-green-primary bg-green-primary/10"
                : "border-border-default bg-bg-card hover:border-green-primary/40"
            } ${disabled ? "opacity-50" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={track.key}
              checked={selected}
              onChange={() => onChange(track.key)}
              className="sr-only"
            />
            <span className="font-mono text-sm font-bold text-text-primary">{track.label}</span>
            {/* The English gloss is the more useful second line for a reader
                who doesn't speak Kiswahili, so it wins over the description
                when both exist. Tracks with no gloss keep the description. */}
            {track.englishName ? (
              <span className="mt-0.5 text-xs leading-snug text-text-secondary">
                {track.englishName}
              </span>
            ) : (
              track.description && (
                <span className="mt-0.5 text-[11px] leading-snug text-text-dim">
                  {track.description}
                </span>
              )
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
