"use client";

/**
 * ProgressLine: a thin line that draws left to right on first scroll into view,
 * reusing the shared reveal observer. The track is always visible (degrade-safe);
 * only the clay fill animates. Split out of KaribuLearn so that file can stay a
 * server component.
 */

import { useEffect, useRef } from "react";
import { register, unregister } from "@/components/karibu/motion/observer";

export function ProgressLine() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    register(el);
    return () => unregister(el);
  }, []);
  return (
    <div className="mt-8 h-px w-full bg-on-panel-dark-muted/30" aria-hidden="true">
      <div ref={ref} data-progress className="h-px w-full bg-clay-light" />
    </div>
  );
}
