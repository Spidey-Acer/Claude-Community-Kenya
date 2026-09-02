"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MatchProfileTrack } from "./MatchProfileForm";
import { useOwnTrack } from "./useOwnTrack";

/**
 * The participant-facing guide to an event's tracks.
 *
 * Tracks are named in Kiswahili (Elimu / Kilimo / Kazi) and not everyone in
 * the room reads Kiswahili, so every track shows its English name alongside
 * the label, plus the problem, who it helps, the fixed rules, an illustration
 * of one working answer, and the question judges will ask. The reader's own
 * track sorts first and opens by default; the other two collapse, because a
 * participant on a phone should not have to scroll past two tracks that
 * aren't theirs to reach the one that is.
 *
 * Read-only. Changing a track is `TrackPicker`'s job.
 */

/** Eyebrow style shared by the section header and each block label. */
const EYEBROW = "font-mono text-[11px] uppercase tracking-wider text-text-dim";
/** Body copy: slightly larger on phones, where this is mostly read. */
const BODY = "text-[15px] sm:text-sm leading-relaxed text-text-secondary break-words";

export function TrackGuide({
  cohort,
  tracks,
  teamTrackKey,
}: {
  /** The event this participant belongs to — scopes the profile fetch. */
  cohort?: string;
  /** The event's declared tracks. Caller only renders this when non-empty. */
  tracks: MatchProfileTrack[];
  /**
   * The track of the team the reader has been placed on, when teams are out.
   * Takes precedence over their own declared track: once a team exists, the
   * team's track is the one they are actually building in.
   */
  teamTrackKey?: string | null;
}) {
  const { trackKey: ownTrackKey, loading } = useOwnTrack(cohort, tracks);
  const highlightKey = teamTrackKey ?? ownTrackKey;

  // Which cards are expanded. The highlighted track opens by default, but
  // `ownTrackKey` only arrives after the profile fetch resolves — a useState
  // initializer would freeze on "" and leave every card shut. Seed once when
  // the fetch settles (same pattern as TrackPicker), and never re-seed after,
  // so a reader's own toggles are not clobbered.
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(teamTrackKey ? [teamTrackKey] : [])
  );
  useEffect(() => {
    if (loading || !ownTrackKey) return;
    setOpenKeys((prev) => new Set(prev).add(ownTrackKey));
  }, [loading, ownTrackKey]);

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Highlighted track first, everything else in the order the organisers
  // declared it. A stable sort keeps that order intact for the rest.
  const ordered = [...tracks].sort((a, b) => {
    if (a.key === highlightKey && highlightKey) return -1;
    if (b.key === highlightKey && highlightKey) return 1;
    return 0;
  });

  return (
    <section aria-label="The tracks">
      <p className={`${EYEBROW} mb-2`}>{"// ./tracks"}</p>
      <h2 className="font-mono text-base font-bold text-text-primary">The tracks</h2>
      <p className={`${BODY} mt-1`}>
        The problem and the rules are fixed. The build is yours. Read your track
        twice, the other two once.
      </p>

      <div className="mt-4 space-y-3">
        {ordered.map((track) => (
          <TrackCard
            key={track.key}
            track={track}
            highlighted={Boolean(highlightKey) && track.key === highlightKey}
            open={openKeys.has(track.key)}
            onToggle={() => toggle(track.key)}
          />
        ))}
      </div>
    </section>
  );
}

/** One expandable track card: always-visible header, collapsible detail. */
function TrackCard({
  track,
  highlighted,
  open,
  onToggle,
}: {
  track: MatchProfileTrack;
  highlighted: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const rules = track.rules ?? [];
  // `description` is the short line every legacy track already has; it stands
  // in for `problem` until an organiser writes the longer version.
  const problem = track.problem?.trim() || track.description?.trim() || "";
  const hasAnyDetail = Boolean(
    problem ||
      track.beneficiary?.trim() ||
      rules.length > 0 ||
      track.build?.trim() ||
      track.judgesAsk?.trim()
  );

  return (
    <article
      className={`rounded-lg border bg-bg-secondary ${
        highlighted ? "border-green-primary/40" : "border-border-default"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-start justify-between gap-3 rounded-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-primary/60 sm:p-5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold text-text-primary break-words">
              {track.label}
            </span>
            {highlighted && (
              <span className="rounded border border-green-primary/40 bg-green-primary/10 px-2 py-0.5 font-mono text-[11px] text-green-primary">
                Your track
              </span>
            )}
          </span>
          {track.englishName && (
            <span className="mt-0.5 block text-sm text-text-secondary break-words">
              {track.englishName}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`mt-1 h-4 w-4 shrink-0 text-text-dim transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {!hasAnyDetail && <p className={BODY}>Details coming soon.</p>}

          {problem && (
            <Block label="The problem">
              <p className={BODY}>{problem}</p>
            </Block>
          )}

          {track.beneficiary?.trim() && (
            <Block label="Who it helps">
              <p className={BODY}>{track.beneficiary}</p>
            </Block>
          )}

          {rules.length > 0 && (
            <Block label="Fixed rules">
              <ul className="space-y-1.5">
                {rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-green-primary"
                    />
                    <span className="text-[15px] leading-relaxed text-text-primary break-words sm:text-sm">
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {track.build?.trim() && (
            <Block label="One answer, not the answer">
              <p className={BODY}>{track.build}</p>
            </Block>
          )}

          {track.judgesAsk?.trim() && (
            <Block label="What the judges ask">
              <p className={`${BODY} border-l-2 border-green-primary/40 pl-3 italic`}>
                {track.judgesAsk}
              </p>
            </Block>
          )}
        </div>
      )}
    </article>
  );
}

/** An eyebrow-labelled block inside a track's expanded detail. */
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`${EYEBROW} mb-1.5`}>{label}</p>
      {children}
    </div>
  );
}
