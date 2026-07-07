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

export function Marquee({ items }: MarqueeProps) {
  const Track = () => (
    <div className="flex items-center gap-[26px] py-[11px] font-inter text-[13px] font-semibold uppercase tracking-[0.12em] text-[#FBF0E8] whitespace-nowrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-[26px]">
          <span>{item}</span>
          <ClaudeMark className="h-3 w-3 text-[#F0B49B]" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      data-marquee
      className="overflow-hidden border-b border-clay-dark bg-clay"
      aria-hidden="true"
    >
      <div
        data-mq-track
        className="flex w-max"
        style={{ animation: "karibu-marquee 26s linear infinite" }}
      >
        <Track />
        <Track />
      </div>
    </div>
  );
}
