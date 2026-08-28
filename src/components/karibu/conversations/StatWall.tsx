/**
 * StatWall — the framing-stats grid on a Conversations event page. Each card
 * pairs one line with its source, person-first rather than ministry-first
 * (the line reads like a fact about people, the source is the small print
 * underneath, never the headline). Server component.
 */

import { Reveal } from "@/components/karibu/motion/Reveal";
import type { ConversationsFramingStat } from "@/lib/conversations/queries";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

export function StatWall({ stats }: { stats: ConversationsFramingStat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className={`${WRAP} pb-14`} aria-label="Why this matters">
      <Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, i) => (
            <div key={i} className="rounded-2xl border border-sand bg-paper-card p-6">
              <p className="mb-3 font-newsreader text-[19px] leading-[1.35] text-ink">{stat.line}</p>
              {stat.source && (
                <p className="font-inter text-[11.5px] uppercase tracking-[0.06em] text-ink-muted">
                  {stat.source}
                </p>
              )}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
