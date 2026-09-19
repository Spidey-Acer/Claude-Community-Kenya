/**
 * StatsCard — the impact strip that overlaps the hero's bottom edge.
 *
 * Four real, server-rendered numbers: events hosted, builders reached,
 * cities, and the founding date. No CountUp here — spec item 2 was "hero
 * stat server-renders '~0 members' and counts up client-side"; this card
 * exists so the fix is structural, not just a prop change: the real number
 * is what paints, always. Overlap is achieved by the caller wrapping this in
 * a container with a negative top margin (see KaribuHome's Hero + StatsCard
 * pairing), not by this component reaching outside its own box.
 */

interface StatsCardProps {
  eventsHosted: number;
  buildersReached: number;
  cities: string[];
  /** Short form, e.g. "Jan '26". */
  sinceLabel: string;
  /** e.g. "first meetup, Westlands". */
  sinceDetail: string;
  className?: string;
}

function Cell({
  big,
  label,
  last,
}: {
  big: string;
  label: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`px-6 py-2 sm:px-8 ${last ? "" : "border-b border-sand pb-5 sm:border-b-0 sm:border-r sm:pb-2"}`}>
      <div className="font-newsreader text-[32px] leading-none tracking-[-0.02em] text-ink sm:text-[40px]">
        {big}
      </div>
      <div className="mt-2.5 font-inter text-[13px] leading-[1.4] text-ink-muted sm:text-[13.5px]">
        {label}
      </div>
    </div>
  );
}

export function StatsCard({
  eventsHosted,
  buildersReached,
  cities,
  sinceLabel,
  sinceDetail,
  className,
}: StatsCardProps) {
  return (
    <div
      className={`rounded-2xl border border-sand bg-paper-card py-7 shadow-[0_24px_48px_-24px_rgba(35,32,27,0.35)] ${className ?? ""}`}
    >
      <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:gap-y-0">
        <Cell big={`${eventsHosted}`} label="Events hosted" />
        <Cell
          big={`~${buildersReached.toLocaleString()}`}
          label={
            <>
              Builders reached
              <br />
              across WhatsApp, Discord &amp; socials
            </>
          }
        />
        <Cell
          big={`${cities.length}`}
          label={
            <>
              Cities
              <br />
              {cities.join(" · ")}
            </>
          }
        />
        <Cell
          big={sinceLabel}
          label={
            <>
              Since
              <br />
              {sinceDetail}
            </>
          }
          last
        />
      </div>
    </div>
  );
}
