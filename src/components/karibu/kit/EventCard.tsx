/**
 * EventCard: one event as a link card in three shapes. `feature` is the big
 * "Next up" card (poster beside text), `row` is a date-led list row for the
 * upcoming band, `tile` is the poster-over-caption card for past events and
 * "More events". Server component: no state, so the listing's client island
 * can render it without shipping extra JS.
 */

import Image from "next/image";
import Link from "next/link";
import type { Event } from "@/lib/types";
import { eventCover } from "@/components/karibu/photos";
import { EventCoverPlaceholder } from "@/components/karibu/EventCoverPlaceholder";
import { BADGE_CLAY, BADGE_SAND, META } from "./tokens";
import { TYPE_LABEL, formatDate, parseEventDate } from "./event-format";

interface EventCardProps {
  event: Event;
  variant?: "feature" | "row" | "tile";
}

export function EventCard({ event, variant = "tile" }: EventCardProps) {
  if (variant === "feature") return <FeatureCard event={event} />;
  if (variant === "row") return <RowCard event={event} />;
  return <TileCard event={event} />;
}

function Badges({ event }: { event: Event }) {
  return (
    <>
      <span className={BADGE_CLAY}>{event.city}</span>
      <span className={BADGE_SAND}>{TYPE_LABEL[event.type]}</span>
    </>
  );
}

function FeatureCard({ event }: { event: Event }) {
  const date = parseEventDate(event.date);
  const dateLine = date
    ? `${formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${event.time ? ` · ${event.time}` : ""} · ${event.venue}, ${event.city}`
    : `${event.date}${event.time ? ` · ${event.time}` : ""} · ${event.venue}`;
  const free = event.type === "hackathon" || event.status === "registration-open";
  const cover = eventCover(event.posterUrl);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group grid overflow-hidden rounded-2xl border border-sand bg-paper-card transition-colors hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 md:grid-cols-[minmax(0,300px)_1fr] lg:grid-cols-[380px_1fr]"
    >
      <div className="frame-base frame-plate border-b border-sand md:border-b-0 md:border-r">
        {cover ? (
          <Image
            src={cover}
            alt={event.title}
            fill
            priority
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 300px, 100vw"
            className="object-contain"
          />
        ) : (
          <EventCoverPlaceholder event={event} size="lg" />
        )}
      </div>
      <div className="p-8 md:p-[34px]">
        <div className="mb-3.5 flex flex-wrap gap-2">
          <span className="rounded-full bg-band-bg px-2.5 py-1 font-inter text-xs font-semibold uppercase tracking-[0.08em] text-on-band">
            Next up
          </span>
          <Badges event={event} />
        </div>
        <p className={`${META} mb-2.5`}>{dateLine}</p>
        <h2 className="mb-3.5 font-newsreader text-[28px] leading-[1.1] text-ink sm:text-[32px]">{event.title}</h2>
        <p className="mb-5 font-inter text-[15px] leading-[1.55] text-ink-soft">{event.description}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-band-bg px-6 py-3 font-inter text-[14.5px] font-semibold text-on-band">
            {free ? "Register — free" : "View details"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RowCard({ event }: { event: Event }) {
  const date = parseEventDate(event.date);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="grid grid-cols-[84px_1fr] items-center gap-5 border-b border-sand py-5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay motion-reduce:transition-none sm:grid-cols-[120px_1fr_auto] sm:gap-[26px]"
    >
      <div className="text-center">
        <div className="font-inter text-xs font-semibold uppercase tracking-[0.1em] text-clay">
          {date ? formatDate(date, { month: "short" }) : ""}
        </div>
        <div className="font-newsreader text-[34px] leading-none text-ink sm:text-[38px]">
          {date ? formatDate(date, { day: "2-digit" }) : "—"}
        </div>
        <div className="font-inter text-xs text-ink-muted">
          {date ? formatDate(date, { weekday: "short" }) : ""}
          {event.time ? ` · ${event.time}` : ""}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex flex-wrap gap-2">
          <Badges event={event} />
        </div>
        <h3 className="font-newsreader text-[21px] font-normal leading-[1.15] text-ink sm:text-[23px]">{event.title}</h3>
      </div>
      <span className="col-span-2 mt-1 justify-self-start whitespace-nowrap rounded-full border border-sand-2 px-5 py-2.5 font-inter text-[13.5px] font-semibold text-ink sm:col-span-1 sm:mt-0 sm:justify-self-auto">
        Details
      </span>
    </Link>
  );
}

function TileCard({ event }: { event: Event }) {
  const date = parseEventDate(event.date);
  const label = date ? formatDate(date, { month: "short", year: "numeric" }) : event.date;
  const cover = eventCover(event.posterUrl);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block rounded-xl transition-transform duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 motion-reduce:transform-none"
    >
      <div className="frame-base frame-tile mb-2.5 rounded-xl border border-sand transition-colors duration-150 group-hover:border-clay">
        {cover ? (
          <Image
            src={cover}
            alt={event.title}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <EventCoverPlaceholder event={event} />
        )}
      </div>
      <div className="font-inter text-xs text-ink-muted">
        {[label, event.city, TYPE_LABEL[event.type]].filter(Boolean).join(" · ")}
      </div>
      <h3 className="font-newsreader text-[18px] font-normal text-ink">{event.title}</h3>
    </Link>
  );
}
