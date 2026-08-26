/**
 * Marquee — scrolling clay band under the nav for the Karibu identity.
 *
 * Dumb/presentational: caller supplies the item strings (built from real
 * community stats). The track is duplicated for a seamless CSS loop; the
 * global reduced-motion reset pauses it for users who opt out. Separators use
 * the official Claude mark.
 */

import { ClaudeMark } from "@/components/karibu/ClaudeMark";

interface MarqueeProps {
  /** Ordered list of short phrases to scroll. Built from live data by caller. */
  items: string[];
}

// Repeats of the phrase set per half. The track is two identical halves and
// the animation translates by exactly one half (-50%), so the loop is seamless
// ONLY if one half is at least as wide as the viewport. Repeating the set a few
// times per half guarantees that even on ultra-wide screens (no visible gap).
const REPEATS_PER_HALF = 3;

export function Marquee({ items }: MarqueeProps) {
  const Half = () => (
    <div className="flex items-center gap-[26px] py-[11px] font-inter text-[13px] font-semibold uppercase tracking-[0.12em] text-on-clay-panel whitespace-nowrap">
      {Array.from({ length: REPEATS_PER_HALF }).flatMap((_, r) =>
        items.map((item, i) => (
          <span key={`${r}-${i}`} className="flex items-center gap-[26px]">
            <span>{item}</span>
            <ClaudeMark className="h-3 w-3 text-on-clay-panel-soft" />
          </span>
        )),
      )}
    </div>
  );

  return (
    <div
      data-marquee
      className="overflow-hidden border-b border-clay-dark bg-clay-panel"
      aria-hidden="true"
    >
      <div
        data-mq-track
        className="flex w-max"
        style={{ animation: "karibu-marquee 26s linear infinite" }}
      >
        <Half />
        <Half />
      </div>
    </div>
  );
}
