"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  JUDGE_TAB_STORAGE_KEY,
  resolveJudgeTab,
  type JudgeBriefCriterion,
  type JudgeTab,
} from "@/lib/impact-lab/judge-brief";
import type { Track } from "@/lib/impact-lab/tracks";
import { JudgeBrief } from "./JudgeBrief";
import { JudgeScoring } from "./JudgeScoring";
import { PitchTimer } from "./PitchTimer";

interface JudgeEvent {
  cohort: string;
  runId: string;
  runName: string;
  teamCount: number;
  rubricLabel: string;
  totalOutOf: number;
  /**
   * The brief's material. Optional in the type only because it arrives over
   * the wire: an older or partial response must degrade to a brief without
   * that section rather than crash the screen a judge is scoring on.
   */
  tracks?: Track[];
  criteria?: JudgeBriefCriterion[];
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
 *
 * Once an event is chosen this also owns the Score/Brief tabs. The brief is
 * per-event — it shows that event's tracks and that event's rubric — so it
 * cannot exist before this screen knows which event is being judged.
 */
/** The two panels, in the order they appear on screen. */
const TABS: { key: JudgeTab; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "brief", label: "Brief" },
];

export function JudgeEventPicker({ judgeName }: { judgeName: string }) {
  const [events, setEvents] = useState<JudgeEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JudgeEvent | null>(null);
  // Whether the currently open team on the scoring screen has an edit that
  // has not been saved — set by JudgeScoring, read here so "Switch event"
  // can warn before throwing it away.
  const [dirty, setDirty] = useState(false);
  // Which panel is on screen. Starts on the brief and is corrected once
  // `JudgeScoring` reports whether this judge has scored anything — see
  // `settleTab`.
  const [tab, setTab] = useState<JudgeTab>("brief");
  // True once the tab has been decided, by the judge tapping one or by the
  // first report from the scoring screen. Stops a later report from yanking
  // the panel out from under someone mid-read.
  const tabSettled = useRef(false);

  /**
   * Decide the opening panel from the remembered choice and whether this judge
   * is already part-way through. Runs at most once per mount.
   */
  const settleTab = useCallback((hasScored: boolean) => {
    if (tabSettled.current) return;
    tabSettled.current = true;
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(JUDGE_TAB_STORAGE_KEY);
    } catch {
      // Private browsing or a blocked storage partition: fall back to the
      // has-scored default rather than losing the screen over a preference.
      stored = null;
    }
    setTab(resolveJudgeTab(stored, hasScored));
  }, []);

  /** A judge tapping a tab. Remembered for the rest of this browser session. */
  function chooseTab(next: JudgeTab) {
    tabSettled.current = true;
    setTab(next);
    try {
      window.sessionStorage.setItem(JUDGE_TAB_STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice is not a reason to refuse it.
    }
  }

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
            className="shrink-0 rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-green-primary/40 hover:text-green-primary print:hidden"
          >
            Switch event
          </button>
        )}
      </div>

      {/* Not sticky: the scoring panel already pins its own search bar to the
          top of the viewport, and two stacked sticky bars on a phone leave
          almost no room for the team being scored. */}
      <div className="mb-4 flex gap-2 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => chooseTab(t.key)}
            aria-pressed={tab === t.key}
            className={`min-h-11 flex-1 rounded-lg border px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
              tab === t.key
                ? "border-green-primary bg-green-primary/15 text-green-primary"
                : "border-border-default bg-bg-card text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Both panels stay mounted and are toggled with `hidden`. Unmounting the
          scorecard to read the brief would throw away an unsaved sheet and
          refetch the teams — mid-demo, on a phone, that is the one thing this
          screen must never do. */}
      <div hidden={tab !== "brief"}>
        <JudgeBrief
          tracks={selected.tracks ?? []}
          criteria={selected.criteria ?? []}
        />
      </div>
      <div hidden={tab !== "score"}>
        <JudgeScoring
          cohort={selected.cohort}
          onDirtyChange={setDirty}
          onScoredChange={settleTab}
        />
      </div>
      <div className="print:hidden">
        <PitchTimer cohort={selected.cohort} />
      </div>
    </div>
  );
}
