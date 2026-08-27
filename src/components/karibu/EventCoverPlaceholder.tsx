/**
 * EventCoverPlaceholder — the deliberate stand-in for an event with no
 * poster photo of its own.
 *
 * Renders wherever `eventCover()` returns null. See the comment on that
 * function for why there is no pooled-photo fallback — this placeholder is
 * the other half of that decision: it must look intentional, not like a
 * broken image, since it appears on most event cards.
 *
 * It used to be one sand gradient with the CCK logo centred in it, identical
 * for every event. On a grid of ten poster-less events that reads as the same
 * brand asset stamped ten times, not as ten events. So the placeholder now
 * composes a printed bill out of the only thing we can state truthfully about
 * an event without a photo: its own words. City and month set as an eyebrow,
 * the title set large, a motif keyed to the event *type*, and a paper tone
 * keyed to a hash of the slug so no two neighbouring cards land on the same
 * one. Nothing here claims to depict anybody.
 */

import Image from "next/image";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Background motif per event type — the texture says something true about
 * what the event *is*, rather than decorating the card at random.
 * Concentric rings for a gathering, a bench grid for a workshop, stacked
 * rules for a talk, dense hatch for a hackathon.
 */
const TYPE_MOTIF: Record<Event["type"], string> = {
  meetup:
    "bg-[repeating-radial-gradient(circle_at_88%_120%,var(--clay)_0_1px,transparent_1px_20px)]",
  workshop:
    "bg-[repeating-linear-gradient(0deg,var(--clay)_0_1px,transparent_1px_16px),repeating-linear-gradient(90deg,var(--clay)_0_1px,transparent_1px_16px)]",
  "career-talk":
    "bg-[repeating-linear-gradient(0deg,var(--clay)_0_1.5px,transparent_1.5px_13px)]",
  hackathon:
    "bg-[repeating-linear-gradient(135deg,var(--clay)_0_2px,transparent_2px_11px)]",
};

/**
 * Paper tones, mixed off the Karibu tokens so they follow dark mode instead
 * of freezing a light-theme hex into the card.
 */
const TONES = [
  "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--clay)_7%,var(--paper-card)),var(--paper-alt))]",
  "bg-[linear-gradient(135deg,var(--sand),color-mix(in_oklab,var(--sand-2)_70%,var(--paper-card)))]",
  "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--clay)_14%,var(--paper-alt)),var(--paper-card))]",
  "bg-[linear-gradient(135deg,var(--paper-alt),color-mix(in_oklab,var(--sand)_75%,var(--paper-card)))]",
] as const;

/** Stable 32-bit hash — same slug always picks the same tone. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Their titles routinely lead with the city ("Nairobi | Claude in
 * Production Workshop") and the eyebrow already carries the city, so drop
 * the prefix rather than saying Nairobi twice on one card.
 */
function coverTitle(title: string, city?: string | null): string {
  const bar = title.indexOf("|");
  if (bar > 0) {
    const head = title.slice(0, bar).trim();
    if (!city || head.toLowerCase() === city.toLowerCase()) return title.slice(bar + 1).trim();
  }
  return title;
}

/**
 * The eyebrow carries the event *type* and nothing else. City and month are
 * already printed under every card that uses this placeholder; repeating
 * them here made the cover read as a duplicate of its own caption rather
 * than as artwork. Type is the one fact the card doesn't otherwise state.
 */
const TYPE_EYEBROW: Record<Event["type"], string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  "career-talk": "Career talk",
  hackathon: "Hackathon",
};

/** Day numeral + month, for the large variant. */
function splitDate(date: string): { day: string; month: string } | null {
  const dt = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    day: dt.toLocaleString("en-US", { day: "numeric" }),
    month: dt.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

/**
 * `sm` leads with the title, `lg` leads with the date — and that split is
 * about what sits next to the cover, not about how much room there is.
 *
 * On a grid card the caption underneath is 18px, so a 26px title inside the
 * frame reads as the printed bill above its own caption. But every place the
 * large variant appears, the surrounding layout already sets the title big:
 * 32px beside the featured card, a 52px `<h1>` directly above the detail
 * hero. Repeating it there is the same word twice at almost the same size.
 * So the large variant prints the date instead — real information the card
 * doesn't otherwise state at that scale, and it echoes the day-numeral block
 * already used by the upcoming-events list on the same page.
 */
export function EventCoverPlaceholder({
  event,
  size = "sm",
  className,
}: {
  event: Pick<Event, "slug" | "title" | "type" | "city" | "date">;
  size?: "sm" | "lg";
  className?: string;
}) {
  const tone = TONES[hash(event.slug) % TONES.length];
  const dateParts = splitDate(event.date);

  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 flex flex-col justify-center overflow-hidden", tone, className)}
    >
      {/* Motif sits under the type, faint enough that the words stay the subject. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-[0.09]",
          TYPE_MOTIF[event.type],
        )}
      />

      {/* Stamp, bottom-right — a mark on the bill, not the bill itself. */}
      <Image
        src="/images/cck-logo.webp"
        alt=""
        width={64}
        height={64}
        className={cn(
          "pointer-events-none absolute opacity-40",
          size === "lg" ? "bottom-6 right-6 h-11 w-11" : "bottom-3.5 right-3.5 h-7 w-7",
        )}
      />

      <div className={cn("relative", size === "lg" ? "p-7 pr-20 md:p-10 md:pr-28" : "p-5 pr-12")}>
        <div
          className={cn(
            "mb-2 font-inter font-semibold uppercase tracking-[0.18em] text-clay",
            size === "lg" ? "text-[11.5px]" : "text-[10px]",
          )}
        >
          {[TYPE_EYEBROW[event.type], size === "lg" ? event.city : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {size === "lg" && dateParts ? (
          <>
            <div className="font-newsreader leading-[0.9] tracking-[-0.02em] text-ink text-[56px] md:text-[76px]">
              {dateParts.day}
            </div>
            <div className="mt-1.5 font-inter text-[15px] font-medium text-ink-soft md:text-[17px]">
              {dateParts.month}
            </div>
          </>
        ) : (
          <div className="line-clamp-3 font-newsreader text-[26px] leading-[1.06] tracking-[-0.01em] text-ink">
            {coverTitle(event.title, event.city)}
          </div>
        )}
      </div>
    </div>
  );
}
