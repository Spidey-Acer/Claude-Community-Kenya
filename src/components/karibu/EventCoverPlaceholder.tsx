/**
 * EventCoverPlaceholder — the deliberate stand-in for an event with no
 * poster photo of its own.
 *
 * Renders wherever `eventCover()` returns null. See the comment on that
 * function for why there is no pooled-photo fallback — this placeholder is
 * the other half of that decision: it must look intentional, not like a
 * broken image, since it appears on most event cards.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

export function EventCoverPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 flex items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-sand via-paper-alt to-sand-2",
        className,
      )}
    >
      {/* Faint diagonal texture, echoes the drift pattern used elsewhere in Karibu */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[repeating-linear-gradient(135deg,var(--clay)_0px,var(--clay)_2px,transparent_2px,transparent_18px)]"
      />
      <Image
        src="/images/cck-logo.webp"
        alt=""
        width={80}
        height={80}
        className="relative h-12 w-12 opacity-60 sm:h-16 sm:w-16 md:h-20 md:w-20"
      />
    </div>
  );
}
