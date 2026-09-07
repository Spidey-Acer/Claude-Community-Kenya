/**
 * Marquee — the clay band that sits above the nav on every Karibu page.
 *
 * Static, despite the name (kept so the import sites don't churn). It used to
 * scroll on an infinite CSS loop; Peter's ruling on 2026-09-06 was that a
 * moving strip reads as amateur, so the band now holds still and the phrase
 * list was cut to what is not already said elsewhere on the page.
 *
 * Because nothing is duplicated any more, the content is read once by
 * assistive tech directly — no `sr-only` copy, no `aria-hidden` clone track.
 * Separators use the official Claude mark and are decorative.
 */

import { Fragment } from "react";
import { ClaudeMark } from "@/components/karibu/ClaudeMark";

interface MarqueeProps {
  /** Ordered list of short phrases. Built from live data by the caller. */
  items: string[];
}

export function Marquee({ items }: MarqueeProps) {
  if (items.length === 0) return null;

  return (
    <div data-marquee className="border-b border-band-bg-hover bg-band-bg">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-[26px] gap-y-1 px-6 py-[11px] font-inter text-[12.5px] font-semibold uppercase tracking-[0.12em] text-on-band md:px-10">
        {items.map((item, i) => (
          <Fragment key={item}>
            {/* ClaudeMark carries its own aria-hidden + focusable="false". */}
            {i > 0 && <ClaudeMark className="h-3 w-3 shrink-0 text-on-band-light" />}
            <span>{item}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
