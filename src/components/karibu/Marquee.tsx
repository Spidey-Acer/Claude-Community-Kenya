/**
 * Marquee — scrolling clay band under the nav for the Karibu identity.
 *
 * Dumb/presentational: caller supplies the item strings (built from real
 * community stats). The track is duplicated for a seamless CSS loop (six
 * copies of each phrase between the two halves), so the whole animated track
 * is `aria-hidden` and a screen reader instead gets a single `sr-only` copy of
 * the phrases — the content once, not six times. The global reduced-motion
 * reset pauses the visible loop for users who opt out. Separators use the
 * official Claude mark.
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
    <div className="flex items-center gap-[26px] py-[11px] font-inter text-[13px] font-semibold uppercase tracking-[0.12em] text-[#FBF0E8] whitespace-nowrap">
      {Array.from({ length: REPEATS_PER_HALF }).flatMap((_, r) =>
        items.map((item, i) => (
          <span key={`${r}-${i}`} className="flex items-center gap-[26px]">
            <span>{item}</span>
            <ClaudeMark className="h-3 w-3 text-[#F0B49B]" />
          </span>
        )),
      )}
    </div>
  );

  return (
    <div data-marquee className="overflow-hidden border-b border-clay-dark bg-clay">
      {/* Screen readers get the phrase list once; the scrolling track below is
       * a purely decorative, six-times-duplicated loop. */}
      <span className="sr-only">{items.join(" · ")}</span>
      <div
        data-mq-track
        className="flex w-max"
        style={{ animation: "karibu-marquee 26s linear infinite" }}
        aria-hidden="true"
      >
        <Half />
        <Half />
      </div>
    </div>
  );
}
