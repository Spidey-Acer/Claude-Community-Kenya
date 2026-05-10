import { rank, type Recommendable } from "@/lib/recommendations";
import type { AudienceState } from "@/contexts/AudienceContext";
import Link from "next/link";

interface Props {
  audienceState: AudienceState;
  items: Recommendable[];
}

const TYPE_STYLES: Record<Recommendable["type"], { label: string; color: string; border: string }> = {
  event: { label: "EVENT", color: "text-amber", border: "border-amber" },
  resource: { label: "RESOURCE", color: "text-cyan", border: "border-cyan" },
  community: { label: "COMMUNITY", color: "text-purple-400", border: "border-purple-400" },
};

/**
 * Renders the "Made for you" 3-up recommendation block.
 *
 * Calls the recommendation engine (rank()) with the visitor's audience
 * signals and renders the top 3. Returns null when no items match
 * (e.g., when the visitor has no audience set and there are no featured
 * items to fall back to).
 */
export function MadeForYou({ audienceState, items }: Props) {
  const ranked = rank(items, {
    audience: audienceState.audience,
    intent: audienceState.intent,
    experience: audienceState.experience,
    city: audienceState.city,
  });
  if (ranked.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex justify-between items-end mb-4">
        <div>
          <span className="font-mono text-xs text-amber tracking-wider">MADE FOR YOU</span>
          <h2 className="font-sans text-2xl text-text-primary mt-1">3 things to start with</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ranked.map((item) => {
          const style = TYPE_STYLES[item.type];
          const href =
            item.type === "event"
              ? `/events/${item.id}`
              : item.type === "resource"
                ? `/blog/${item.id}`
                : `/community/${item.id}`;
          return (
            <Link
              key={item.id}
              href={href}
              className={`block bg-white/[0.03] border border-border-default border-l-2 ${style.border} p-4 rounded transition-colors hover:bg-white/[0.06]`}
            >
              <span className={`font-mono text-[9px] ${style.color}`}>{style.label}</span>
              <div className="font-sans text-base sm:text-sm md:text-base text-text-primary font-semibold mt-1 leading-tight line-clamp-2">
                {item.title}
              </div>
              {item.date && (
                <div className="text-text-secondary text-xs mt-1">
                  {item.date.toISOString().slice(0, 10)}
                  {item.city ? ` · ${item.city}` : ""}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
