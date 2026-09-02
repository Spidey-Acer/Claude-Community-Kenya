"use client";

import { useEffect, useRef } from "react";

/**
 * Run `tick` on an interval, but only while the tab is actually being looked
 * at — and once immediately whenever it comes back into view.
 *
 * A hackathon venue puts a hundred phones behind one NAT address, and the
 * member endpoints are rate-limited per IP. Polling backgrounded tabs would
 * spend that budget on screens nobody is reading, and the first thing someone
 * wants when they switch back is fresh data, not a wait of up to the full
 * interval.
 *
 * `tick` is held in a ref, so passing a fresh closure each render (the normal
 * case) does not restart the timer.
 */
export function useVisiblePoll(
  tick: () => void,
  intervalMs: number,
  enabled = true
): void {
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (!enabled) return;

    const runIfVisible = () => {
      if (document.visibilityState === "visible") tickRef.current();
    };

    const interval = setInterval(runIfVisible, intervalMs);
    document.addEventListener("visibilitychange", runIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", runIfVisible);
    };
  }, [intervalMs, enabled]);
}
