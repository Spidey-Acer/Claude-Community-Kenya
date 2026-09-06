"use client";

/**
 * HeroMedia — full-bleed poster image with a warm dark gradient scrim, and an
 * OPTIONAL video loop layered on top once it's safe to fetch one.
 *
 * No hero video file exists yet (see the 2026-09-05 structure-redesign spec,
 * Decision 2) — `videoSources` is undefined everywhere this renders today,
 * so it degrades to the poster alone. The attach logic is still built to the
 * decision's delivery rules so wiring in a real R2 render later is a
 * one-line prop change, not a rewrite:
 *
 *   - <video> carries autoplay/muted/loop/playsInline/preload="none" and a
 *     poster from the start.
 *   - <source> elements are appended (imperatively, via ref — never through
 *     React state, so nothing here trips react-hooks/set-state-in-effect)
 *     only after `window.load`, or immediately if the document is already
 *     `complete` (a client-side nav back to `/` won't fire `load` again).
 *   - Skipped entirely under 768px viewport, `prefers-reduced-motion:
 *     reduce`, or `navigator.connection.saveData` — poster-only in all three.
 *   - The poster is a real `next/image` with `priority`, so it stays the LCP
 *     candidate whether or not a video ever attaches, and nothing here can
 *     shift layout — both layers are `absolute inset-0` inside the caller's
 *     fixed-height box.
 */

import { useEffect, useRef } from "react";
import Image from "next/image";

interface VideoSource {
  src: string;
  type: string;
}

/** `navigator.connection` isn't in lib.dom yet — narrow just what we read. */
type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

interface HeroMediaProps {
  posterSrc: string;
  posterAlt: string;
  /** Omit until a real hero render exists in R2 — renders poster-only. */
  videoSources?: VideoSource[];
  /** Warm dark gradient so light text reads over any photo. Default on. */
  gradient?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function shouldSkipVideo(): boolean {
  if (typeof window === "undefined") return true;
  if (window.innerWidth < 768) return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if ((navigator as NavigatorWithConnection).connection?.saveData) return true;
  return false;
}

export function HeroMedia({
  posterSrc,
  posterAlt,
  videoSources,
  gradient = true,
  className,
  children,
}: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoSources?.length) return;

    function attach() {
      const video = videoRef.current;
      if (!video || shouldSkipVideo()) return;
      for (const source of videoSources!) {
        const el = document.createElement("source");
        el.src = source.src;
        el.type = source.type;
        video.appendChild(el);
      }
      video.load();
    }

    if (document.readyState === "complete") {
      attach();
      return;
    }
    window.addEventListener("load", attach, { once: true });
    return () => window.removeEventListener("load", attach);
  }, [videoSources]);

  return (
    <div className={`relative overflow-hidden bg-ink ${className ?? ""}`}>
      <Image src={posterSrc} alt={posterAlt} fill priority sizes="100vw" className="object-cover" />
      {videoSources?.length ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={posterSrc}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {gradient && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-scrim/20 via-scrim/45 to-scrim/[0.86]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-scrim/55 via-scrim/15 to-transparent"
            aria-hidden="true"
          />
        </>
      )}
      {children}
    </div>
  );
}
