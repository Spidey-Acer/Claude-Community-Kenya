import type { Audience, Intent, Experience } from "@/lib/karibu/types";

export interface Recommendable {
  id: string;
  type: "event" | "resource" | "community";
  title: string;
  audiences: Audience[];
  intents?: Intent[];
  city?: string | null;
  date?: Date | null;
  featured?: boolean;
}

export interface RecommendInput {
  audience: Audience | null;
  intent: Intent | null;
  experience: Experience | null;
  city: string | null;
}

/**
 * Computes a relevance score for a recommendable item against a visitor's
 * audience signals. Higher score = better match.
 *
 * Weights: audience 5, intent 3, city 2, learn_basics+never_used 2,
 * featured 0.4, recency 1/(weeks_until_event).
 */
export function score(item: Recommendable, input: RecommendInput): number {
  if (!input.audience) return 0;
  let s = 0;
  if (item.audiences.includes(input.audience)) s += 5;
  if (input.intent && item.intents?.includes(input.intent)) s += 3;
  if (item.city && input.city && item.city.toLowerCase() === input.city.toLowerCase()) s += 2;
  if (item.featured) s += 0.4;
  if (item.date) {
    const daysAway = Math.max(1, Math.ceil((item.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const weeks = daysAway / 7;
    s += 1 / weeks;
  }
  if (input.experience === "never_used" && item.intents?.includes("learn_basics")) s += 2;
  return s;
}

/**
 * Returns the top N recommendable items for a visitor, ranked by score.
 * Falls back to featured items when the visitor has no audience set.
 */
export function rank<T extends Recommendable>(items: T[], input: RecommendInput, limit = 3): T[] {
  if (!input.audience) {
    return items.filter((i) => i.featured).slice(0, limit);
  }
  return [...items]
    .map((i) => ({ i, s: score(i, input) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.i);
}
