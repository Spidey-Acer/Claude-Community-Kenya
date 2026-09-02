"use client";

import type { JudgeTeamRow } from "@/lib/impact-lab/judge-team";
import { trackTone } from "@/lib/impact-lab/track-tone";
import { FOCUS_RING } from "./judge-ui";

/**
 * One team in the run list.
 *
 * The table number leads, in mono and bold, because that is how a judge is
 * directed to a team over a microphone. Everything else on the row answers the
 * two questions asked while walking: is this the right team, and have I
 * already scored it.
 */
export function TeamListRow({
  team,
  isSelected,
  isDesktop,
  scoredTotal,
  totalOutOf,
  onSelect,
}: {
  team: JudgeTeamRow;
  isSelected: boolean;
  /** On a phone the row expands in place; on a laptop it selects the pane. */
  isDesktop: boolean;
  /** This judge's own total, or null when they have not scored the team. */
  scoredTotal: number | null;
  totalOutOf: number;
  onSelect: () => void;
}) {
  const tone = trackTone(team.trackKey);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-expanded={isDesktop ? undefined : isSelected}
      aria-current={isDesktop && isSelected ? "true" : undefined}
      className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors ${FOCUS_RING} ${
        isSelected ? "bg-green-primary/5" : "hover:bg-bg-card"
      }`}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          {/* The dot is what a judge picks the row out by from a step back —
              the track label is already in the pill, so this is decoration
              for sighted scanning only and is hidden from a screen reader. */}
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`}
          />
          {team.table !== null && (
            <span className="font-mono text-base font-bold text-text-primary">
              Table {team.table}
            </span>
          )}
          <span className={`truncate rounded-full border px-2 py-0.5 font-mono text-xs uppercase tracking-wider lg:whitespace-normal ${tone.pill}`}>
            {team.trackLabel}
          </span>
        </span>
        <span className="mt-1 block truncate text-[15px] text-text-primary lg:whitespace-normal">
          {team.submission?.projectName ?? team.teamName}
        </span>
        <span className="mt-0.5 block truncate font-mono text-xs text-text-dim lg:whitespace-normal">
          {team.submission ? `${team.teamName} · ` : ""}
          {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
        </span>
      </span>

      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${
          scoredTotal === null
            ? "border-border-default text-text-dim"
            : "border-green-primary/40 bg-green-primary/10 text-green-primary"
        }`}
      >
        {scoredTotal === null ? "Not scored" : `Scored ${scoredTotal}`}
        {scoredTotal !== null && (
          <span className="sr-only"> out of {totalOutOf}</span>
        )}
      </span>
    </button>
  );
}
