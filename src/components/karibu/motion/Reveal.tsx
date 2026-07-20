"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { register, unregister } from "./observer";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Optional stagger index (0-based). CSS caps the delay at 6 steps. */
  index?: number;
}

/**
 * Degrade-safe reveal wrapper. Renders a visible `<div data-reveal>`; the
 * before-paint `.js` class (layout.tsx) + globals.css turn that into an
 * opacity/transform entrance, and the shared observer adds `.in-view` once on
 * scroll. No JS → content stays fully visible. Reduced-motion → instant.
 */
export function Reveal({ children, className, index }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    register(el);
    return () => unregister(el);
  }, []);

  const style = index != null ? ({ "--i": index } as CSSProperties) : undefined;

  return (
    <div ref={ref} data-reveal="" className={className} style={style}>
      {children}
    </div>
  );
}
