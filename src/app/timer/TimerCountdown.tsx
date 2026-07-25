"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface TimerCountdownProps {
  /** Deadline as an ISO string with an offset. Rendered in the viewer's zone. */
  deadlineIso: string;
  label: string;
}

interface Remaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function remainingFrom(deadlineMs: number, nowMs: number): Remaining {
  const totalMs = Math.max(0, deadlineMs - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Projector-facing countdown to the submission deadline.
 *
 * Renders nothing until mounted: the server and the room's clock will disagree
 * by seconds, and a hydration mismatch on the one screen everybody is watching
 * is worse than a beat of blankness.
 */
export function TimerCountdown({ deadlineIso, label }: TimerCountdownProps) {
  const reduceMotion = useReducedMotion();
  const deadlineMs = new Date(deadlineIso).getTime();
  const [left, setLeft] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setLeft(remainingFrom(deadlineMs, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  if (!Number.isFinite(deadlineMs)) {
    return (
      <p className="font-mono text-2xl text-red">
        That deadline is not a valid date.
      </p>
    );
  }

  if (!left) {
    return (
      <div
        className="h-[22vw] min-h-[140px]"
        aria-hidden="true"
        // Reserve the space the clock will occupy so nothing jumps on mount.
      />
    );
  }

  const closed = left.totalMs === 0;
  // Under five minutes the room needs to feel it, not read it.
  const urgent = !closed && left.totalMs <= 5 * 60 * 1000;
  const warning = !closed && !urgent && left.totalMs <= 30 * 60 * 1000;

  const colour = closed
    ? "text-red"
    : urgent
      ? "text-red"
      : warning
        ? "text-amber"
        : "text-green-primary";

  const deadlineLocal = new Date(deadlineMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.35em] text-text-dim sm:text-base">
        {closed ? "Submissions closed" : label}
      </p>

      <div
        role="timer"
        aria-live={urgent ? "assertive" : "off"}
        aria-label={
          closed
            ? "Submissions are closed"
            : `${left.hours} hours ${left.minutes} minutes remaining`
        }
        className={`font-mono font-bold tabular-nums leading-none ${colour} ${
          urgent && !reduceMotion ? "animate-pulse" : ""
        }`}
        style={{ fontSize: "clamp(3.5rem, 18vw, 16rem)" }}
      >
        {closed
          ? "00:00:00"
          : `${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`}
      </div>

      {!closed && (
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-text-dim sm:text-sm">
          hours · minutes · seconds
        </p>
      )}

      <p className="mt-2 font-mono text-base text-text-secondary sm:text-xl">
        {closed ? (
          <>The clock is the fairest judge in the room.</>
        ) : (
          <>
            Submissions close at{" "}
            <span className="text-text-primary">{deadlineLocal}</span>
          </>
        )}
      </p>
    </div>
  );
}
