"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { FOCUS_RING, TIMER_COMPACT_HEIGHT } from "./judge-ui";

interface TimerState {
  startedAt: string;
  seconds: number;
  startedBy: string;
  serverNow: string;
}

// Duplicated from pitch-timer-store.ts on purpose: that module imports
// `@/lib/prisma`, which must never reach a client bundle. The server is the
// source of truth and validates the same range on write.
const DEFAULT_SECONDS = 300;

const POLL_MS = 2000;
const TICK_MS = 250;
const AMBER_AT_SECONDS = 60;
const RED_AT_SECONDS = 10;

function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Two short beeps, ~150ms each with a small gap — well under a second total.
 *  Web Audio only: no audio files, no asset pipeline for this page. */
function playEndSound(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const beep = (start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.01);
      gain.gain.setValueAtTime(0.35, start + 0.13);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.16);
    };
    const now = ctx.currentTime;
    beep(now);
    beep(now + 0.22);
  } catch {
    // Best-effort. The visual TIME'S UP state is what is guaranteed.
  }
}

/**
 * Shared 5-minute pitch countdown, pinned to the bottom of the judge scoring
 * screen. Any judge's Start applies to the whole room: state lives in the
 * database (`/api/impact-lab/pitch-timer`), not in this component, and every
 * device polls and re-derives the same countdown from `startedAt`.
 *
 * Fixed rather than sticky-in-flow so it never reflows or covers the
 * scorecard's own controls — the page adds bottom padding to clear it
 * instead (see JudgeScoring.tsx).
 *
 * `compact` collapses it to a 48px strip while a team is being scored. The
 * scorecard's action bar is pinned directly above it at `bottom-12`, so the
 * two agree on that height rather than overlapping — see `TIMER_COMPACT_HEIGHT`
 * in judge-ui.ts.
 */
export function PitchTimer({
  cohort,
  compact = false,
}: {
  cohort: string;
  /** Slim strip mode, used while a team is open on the scoring screen. */
  compact?: boolean;
}) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [offsetMs, setOffsetMs] = useState(0); // serverNow - Date.now(), from the last read
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const endedForRef = useRef<string | null>(null); // startedAt already alerted for
  const lastSecRef = useRef<number | null>(null);

  // Autoplay policy blocks sound until THIS device has had a user gesture,
  // and that gesture may land anywhere on the page — not necessarily on this
  // component's own buttons. Arm (or resume) on the first interaction.
  useEffect(() => {
    function arm() {
      if (!audioCtxRef.current) {
        try {
          const Ctor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (Ctor) audioCtxRef.current = new Ctor();
        } catch {
          // Web Audio unavailable on this device — sound stays silent, the
          // visual end state still fires.
        }
      } else if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
    }
    window.addEventListener("pointerdown", arm, { passive: true });
    window.addEventListener("keydown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/impact-lab/pitch-timer?cohort=${encodeURIComponent(cohort)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) return;
      const next = json.timer as TimerState | null;
      setTimer((prev) => {
        if (next && (!prev || prev.startedAt !== next.startedAt)) {
          setAnnouncement(`Timer started by ${next.startedBy}.`);
        }
        return next;
      });
      if (next) setOffsetMs(new Date(next.serverNow).getTime() - Date.now());
    } catch {
      // A missed poll is silent — the next one tries again in 2s. Surfacing a
      // network blip as an on-screen error would be noisier than the miss.
    }
  }, [cohort]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Ticks locally between polls so the display counts down smoothly rather
  // than jumping once every 2s. Never counts down from a local guess: every
  // tick re-derives from `startedAt + seconds`, corrected by `offsetMs`.
  useEffect(() => {
    const id = setInterval(() => {
      if (!timer) {
        setRemainingSeconds(null);
        lastSecRef.current = null;
        return;
      }
      const correctedNow = Date.now() + offsetMs;
      const endsAt = new Date(timer.startedAt).getTime() + timer.seconds * 1000;
      const sec = Math.max(0, Math.ceil((endsAt - correctedNow) / 1000));
      setRemainingSeconds(sec);

      const prevSec = lastSecRef.current;
      lastSecRef.current = sec;
      if (prevSec === null) return;

      if (prevSec > 60 && sec <= 60) {
        setAnnouncement("One minute left.");
      }
      if (prevSec > 0 && sec <= 0 && endedForRef.current !== timer.startedAt) {
        endedForRef.current = timer.startedAt;
        setAnnouncement("Time's up.");
        playEndSound(audioCtxRef.current);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [timer, offsetMs]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/impact-lab/pitch-timer?cohort=${encodeURIComponent(cohort)}`,
        {
          method: "POST",
          headers: await csrfHeaders(),
          body: JSON.stringify({ seconds: DEFAULT_SECONDS }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not start the timer.");
        return;
      }
      const next = json.timer as TimerState;
      endedForRef.current = null;
      setTimer(next);
      setOffsetMs(new Date(next.serverNow).getTime() - Date.now());
      setAnnouncement(`Timer started by ${next.startedBy}.`);
    } catch {
      setError("Could not start the timer. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/impact-lab/pitch-timer?cohort=${encodeURIComponent(cohort)}`,
        { method: "DELETE", headers: await csrfHeaders() }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not stop the timer.");
        return;
      }
      setTimer(null);
      setRemainingSeconds(null);
      endedForRef.current = null;
    } catch {
      setError("Could not stop the timer. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const isOver = timer !== null && remainingSeconds === 0;
  const colorClass =
    remainingSeconds === null
      ? "text-text-dim"
      : remainingSeconds <= RED_AT_SECONDS
        ? "text-red"
        : remainingSeconds <= AMBER_AT_SECONDS
          ? "text-amber"
          : "text-green-primary";

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t bg-bg-primary/95 px-4 backdrop-blur ${
        compact ? `${TIMER_COMPACT_HEIGHT} flex items-center py-0` : "py-2"
      } ${isOver ? "border-red/50 bg-red/5" : "border-border-default"}`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          {/* Dropped in the slim strip: with a team open, the 48px of height
              belongs to the number, not to a label the judge has already read. */}
          {!compact && (
            <p className="truncate font-mono text-xs uppercase tracking-wider text-text-dim">
              Pitch timer{timer ? ` · started by ${timer.startedBy}` : ""}
            </p>
          )}
          <p
            className={`font-mono font-bold tabular-nums ${
              compact ? "text-lg" : "text-2xl"
            } ${colorClass}`}
          >
            {remainingSeconds === null
              ? "No timer"
              : isOver
                ? "TIME'S UP"
                : formatMMSS(remainingSeconds)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy}
            className={`min-h-11 ${FOCUS_RING} rounded-lg border border-green-primary/40 bg-green-primary/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-50`}
          >
            {timer ? "Restart 5:00" : "Start 5:00"}
          </button>
          {timer && (
            <button
              type="button"
              onClick={() => void stop()}
              disabled={busy}
              className={`min-h-11 ${FOCUS_RING} rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary transition-colors hover:border-red/40 hover:text-red disabled:opacity-50`}
            >
              Stop
            </button>
          )}
        </div>
      </div>
      {error && !compact && (
        <p role="alert" className="mx-auto mt-1 max-w-6xl text-xs text-red">
          {error}
        </p>
      )}
      {/* Meaningful moments only — started, one minute left, time up. A live
          region ticking every second would announce the countdown itself,
          which is exactly the noise a screen reader user does not want. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
