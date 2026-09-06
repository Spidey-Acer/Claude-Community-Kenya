/**
 * SupporterWall — Anthropic + venue-partner logo wall (home, /about). Ports
 * africahackon's partner carousel, minus the carousel: five real names is a
 * row, not a scroll. Venues without a logo asset render their name as a
 * serif wordmark instead of a "logo slot" placeholder — an annotation from
 * the canvas that must never render as shipped copy.
 */

import Image from "next/image";

export interface Supporter {
  name: string;
  /** Optional logo image. Falls back to a serif wordmark when absent. */
  logo?: string;
  href?: string;
}

interface SupporterWallProps {
  supporters: Supporter[];
  caption?: string;
  className?: string;
}

export function SupporterWall({ supporters, caption, className }: SupporterWallProps) {
  if (supporters.length === 0) return null;
  return (
    <div className={className}>
      <div className="mb-7 text-center font-inter text-xs font-semibold uppercase tracking-[0.22em] text-ink-muted">
        Supported by
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(supporters.length, 5)}, minmax(0, 1fr))` }}
      >
        {supporters.map((s) => (
          <Cell key={s.name} supporter={s} />
        ))}
      </div>
      {caption && (
        <p className="mt-[18px] text-center font-inter text-[13.5px] text-ink-muted">{caption}</p>
      )}
    </div>
  );
}

function Cell({ supporter }: { supporter: Supporter }) {
  const inner = supporter.logo ? (
    <Image src={supporter.logo} alt={supporter.name} width={140} height={32} className="h-[22px] w-auto object-contain" />
  ) : (
    <span className="text-center font-newsreader text-[16px] leading-[1.15] tracking-[0.01em] text-ink">
      {supporter.name}
    </span>
  );

  const cellClass =
    "flex h-[76px] items-center justify-center rounded-xl border border-sand bg-paper-card px-3.5 grayscale opacity-[0.78] transition-[filter,opacity] duration-200 hover:grayscale-0 hover:opacity-100";

  return supporter.href ? (
    <a href={supporter.href} target="_blank" rel="noopener noreferrer" className={cellClass}>
      {inner}
    </a>
  ) : (
    <div className={cellClass}>{inner}</div>
  );
}
