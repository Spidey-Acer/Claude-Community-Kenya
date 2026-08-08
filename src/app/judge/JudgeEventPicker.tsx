"use client";

import { useCallback, useEffect, useState } from "react";
import { JudgeScoring } from "./JudgeScoring";
import { PitchTimer } from "./PitchTimer";

interface JudgeEvent {
  cohort: string;
  runId: string;
  runName: string;
  teamCount: number;
  rubricLabel: string;
  totalOutOf: number;
  judgingOpen: boolean;
}

/**
 * Sits between the access-code gate and the scoring screen. A score is
 * meaningless if the judge is unsure which event it belongs to, so this
 * fetches the events currently open for judging, picks the obvious one
 * automatically, and — once scoring starts — keeps the chosen event pinned
 * on screen for as long as the judge is on this page.
 *
 * Only events with judging open are ever offered, and the endpoint returns
 * the active event first, so "one event" is the common case at a single-event
 * hackathon and a judge should never have to tap through a list of one.
 */
export function JudgeEventPicker({ judgeName }: { judgeName: string }) {
  const [events, setEvents] = useState<JudgeEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JudgeEvent | null>(null);
  // Whether the currently open team on the scoring screen has an edit that
  // has not been saved — set by JudgeScoring, read here so "Switch event"
  // can warn before throwing it away.
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/impact-lab/judge-events");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not load events.");
        return;
      }
      const list = (json.events ?? []) as JudgeEvent[];
      setEvents(list);
      // Exactly one event open: go straight to scoring, no tap required.
      setSelected((prev) => prev ?? (list.length === 1 ? list[0] : null));
    } catch {
      setError("Could not load events. Check your connection.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function switchEvent() {
    if (
      dirty &&
      !window.confirm(
        "You have a score that hasn't been saved yet. Switch events and lose it?"
      )
    ) {
      return;
    }
    setSelected(null);
    setDirty(false);
  }

  if (error && !events) {
    return (
      <div className="rounded-xl border border-red/30 bg-red/5 p-5">
        <p className="text-sm text-red">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!events) {
    return <p className="text-sm text-text-dim">Loading events…</p>;
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-text-dim">
        No events are open for judging right now.
      </p>
    );
  }

  if (!selected) {
    return (
      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-text-dim">
          Which event are you judging, {judgeName}?
        </p>
        {events.map((event) => (
          <button
            key={event.cohort}
            type="button"
            onClick={() => setSelected(event)}
            className="block w-full rounded-xl border border-border-default bg-bg-card px-4 py-4 text-left transition-colors hover:border-green-primary/40"
          >
            <span className="block font-mono text-sm text-text-primary">
              {event.runName}
            </span>
            <span className="mt-1 block font-mono text-xs text-text-dim">
              {event.teamCount} team{event.teamCount === 1 ? "" : "s"} ·{" "}
              {event.rubricLabel} · out of {event.totalOutOf}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    // pb-24 clears the fixed pitch timer pinned to the bottom of the viewport
    // so it never covers the scorecard's own Save button.
    <div className="pb-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
            Judging
          </p>
          <p className="truncate font-mono text-sm text-text-primary">
            {selected.runName}
          </p>
          <p className="font-mono text-[11px] text-text-dim">
            {selected.rubricLabel} · out of {selected.totalOutOf}
          </p>
        </div>
        {/* Only worth offering when there is somewhere else to go — with one
            event open, switching would just reopen the same event. */}
        {events.length > 1 && (
          <button
            type="button"
            onClick={switchEvent}
            className="shrink-0 rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-green-primary/40 hover:text-green-primary"
          >
            Switch event
          </button>
        )}
      </div>
      <JudgeScoring cohort={selected.cohort} onDirtyChange={setDirty} />
      <PitchTimer cohort={selected.cohort} />
    </div>
  );
}
