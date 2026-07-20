/**
 * Skeleton — token-driven shimmer placeholder for route-level loading states.
 *
 * Renders a `.k-skeleton` block (see globals.css) that inherits the Karibu
 * paper/ink tokens, so it is automatically correct in light and dark mode.
 * Size and shape come from the caller via `className` (e.g. `h-4 w-40`,
 * `rounded-full` for avatars). Stagger sibling shimmers with `delay`.
 *
 * Pages composing skeletons should wrap them in <SkeletonPage> so screen
 * readers announce a single "Loading" status instead of decorative noise.
 */

import { cn } from "@/lib/utils";

/** One shimmering placeholder block. Purely decorative (aria-hidden). */
export function Skeleton({
  className,
  delay = 0,
}: {
  className?: string;
  /** Shimmer stagger in seconds. */
  delay?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("k-skeleton", className)}
      style={delay ? ({ "--sk-delay": `${delay}s` } as React.CSSProperties) : undefined}
    />
  );
}

/** Accessible wrapper for a page-level skeleton composition. */
export function SkeletonPage({
  label = "Loading page",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
