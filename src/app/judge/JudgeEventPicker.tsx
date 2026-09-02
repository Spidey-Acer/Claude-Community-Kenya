"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  JUDGE_TAB_STORAGE_KEY,
  resolveJudgeTab,
  type JudgeBriefCriterion,
  type JudgeTab,
} from "@/lib/impact-lab/judge-brief";
import type { OnStage } from "@/lib/impact-lab/roster";
import type { Track } from "@/lib/impact-lab/tracks";
import { CHIP, CHIP_OFF, CHIP_ON, EYEBROW, GHOST_BUTTON } from "./judge-ui";
import { JudgeBrief, type JudgePanelMember } from "./JudgeBrief";
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
  judges?: JudgePanelMember[];
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

export function JudgeEventPicker({
  judgeName,
  onSignOut,
}: {
  judgeName: string;
  /** Clears the judge session. Lives in the header, discreetly. */
  onSignOut: () => void;
}) {
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
  // Whether a team is open on the scoring screen. The pitch timer collapses to
  // a slim strip while one is, so it and the scorecard's pinned action bar
  // stack instead of overlapping.
  const [teamOpen, setTeamOpen] = useState(false);
  // The team the desk has on stage. Owned here rather than in `JudgeScoring`
  // because the only 2s poll on this screen belongs to `PitchTimer`, and the
  // two are siblings — see `PitchTimer`'s `onStageChange`.
  const [onStage, setOnStage] = useState<OnStage | null>(null);

  /**
   * Take the poll's reading, keeping the previous object when nothing changed.
   *
   * The poll hands over a fresh object every 2s. Storing it unconditionally
   * would re-render the whole scorecard — and re-fire its auto-open effect —
   * twice a second for a value that changes once per pitch.
   */
  const handleOnStage = useCallback((next: OnStage | null) => {
    setOnStage((prev) =>
      prev?.teamId === next?.teamId && prev?.since === next?.since ? prev : next
    );
  }, []);

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
      <Shell judgeName={judgeName} onSignOut={onSignOut}>
        <div className="rounded-lg border border-red/30 bg-red/5 p-5">
          <p className="text-[15px] text-red">{error}</p>
          <button type="button" onClick={() => void load()} className={`mt-3 ${GHOST_BUTTON}`}>
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  if (!events) {
    return (
      <Shell judgeName={judgeName} onSignOut={onSignOut}>
        <p className="text-[15px] text-text-dim">Loading events…</p>
      </Shell>
    );
  }

  if (events.length === 0) {
    return (
      <Shell judgeName={judgeName} onSignOut={onSignOut}>
        <p className="text-[15px] text-text-dim">
          No events are open for judging right now.
        </p>
      </Shell>
    );
  }

  if (!selected) {
    return (
      <Shell judgeName={judgeName} onSignOut={onSignOut}>
        <div className="space-y-3">
          <p className={EYEBROW}>Which event are you judging?</p>
          {events.map((event) => (
            <button
              key={event.cohort}
              type="button"
              onClick={() => setSelected(event)}
              className="block w-full rounded-lg border border-border-default bg-bg-secondary px-4 py-4 text-left transition-colors hover:border-green-primary/40"
            >
              <span className="block font-mono text-[15px] text-text-primary">
                {event.runName}
              </span>
              <span className="mt-1 block font-mono text-xs text-text-dim">
                {event.teamCount} team{event.teamCount === 1 ? "" : "s"} ·{" "}
                {event.rubricLabel} · out of {event.totalOutOf}
              </span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      judgeName={judgeName}
      onSignOut={onSignOut}
      tabs={
        <div className="flex gap-2 print:hidden">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => chooseTab(entry.key)}
              aria-pressed={tab === entry.key}
              className={`${CHIP} flex-1 ${tab === entry.key ? CHIP_ON : CHIP_OFF}`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-xs uppercase tracking-wider text-text-dim">
          {selected.runName} · {selected.rubricLabel} · out of {selected.totalOutOf}
        </p>
        {/* Only worth offering when there is somewhere else to go — with one
            event open, switching would just reopen the same event. */}
        {events.length > 1 && (
          <button type="button" onClick={switchEvent} className={`${GHOST_BUTTON} print:hidden`}>
            Switch event
          </button>
        )}
      </div>

      {/* Both panels stay mounted and are toggled with `hidden`. Unmounting the
          scorecard to read the brief would throw away an unsaved sheet and
          refetch the teams — mid-demo, on a phone, that is the one thing this
          screen must never do. A hidden panel hides its own fixed children
          too, so the scorecard's action bar cannot bleed onto the brief. */}
      <div hidden={tab !== "brief"} className="pb-20">
        <JudgeBrief
          tracks={selected.tracks ?? []}
          criteria={selected.criteria ?? []}
          judges={selected.judges ?? []}
        />
      </div>
      <div hidden={tab !== "score"}>
        <JudgeScoring
          cohort={selected.cohort}
          onStage={onStage}
          onDirtyChange={setDirty}
          onScoredChange={settleTab}
          onOpenTeamChange={setTeamOpen}
        />
      </div>
      <div className="print:hidden">
        {/* Collapsed while a team is open, so the scorecard's action bar —
            pinned directly above it — has a fixed height to sit on. */}
        <PitchTimer
          cohort={selected.cohort}
          compact={tab === "score" && teamOpen}
          onStageChange={handleOnStage}
        />
      </div>
    </Shell>
  );
}

/**
 * The frame every judge screen sits in: who is signed in, the way out, and
 * (once an event is chosen) the Score/Brief tabs — all sticky, because on a
 * phone the alternative is scrolling back up past thirty-six teams to change
 * panel.
 */
function Shell({
  judgeName,
  onSignOut,
  tabs,
  children,
}: {
  judgeName: string;
  onSignOut: () => void;
  /** The tab row. Absent before an event is chosen. */
  tabs?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border-default bg-bg-primary/95 backdrop-blur print:static print:border-0">
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-green-primary">
                Impact Lab · judging
              </p>
              <p className="truncate font-mono text-base font-bold text-text-primary">
                {judgeName}
              </p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className={`${GHOST_BUTTON} shrink-0 print:hidden`}
            >
              Sign out
            </button>
          </div>
          {tabs ? <div className="py-2">{tabs}</div> : <div className="pb-3" />}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">{children}</div>
    </div>
  );
}
