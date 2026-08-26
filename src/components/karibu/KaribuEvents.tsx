"use client";

/**
 * KaribuEvents — warm-light "Events" page for the Karibu identity.
 *
 * Ports events.dc.html: header + filter chips, a featured "Next up" card, a
 * month-banded list of upcoming events, and a past-events grid. All events
 * come from the DB (getEvents). Filter chips are derived from the real data —
 * no chip is shown for a city or type that has no events.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Event } from "@/lib/types";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { eventCover } from "@/components/karibu/photos";
import { EventCoverPlaceholder } from "@/components/karibu/EventCoverPlaceholder";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const FLIP_EASE = [0.16, 1, 0.3, 1] as const;

const TYPE_LABEL: Record<Event["type"], string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  "career-talk": "Career talk",
  hackathon: "Hackathon",
};
const TYPE_PLURAL: Record<Event["type"], string> = {
  meetup: "Meetups",
  workshop: "Workshops",
  "career-talk": "Career talks",
  hackathon: "Hackathons",
};

const UPCOMING_STATUSES: Event["status"][] = ["upcoming", "registration-open"];

function parseDate(d: string): Date | null {
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
const fmt = (dt: Date, opts: Intl.DateTimeFormatOptions) =>
  dt.toLocaleString("en-US", opts);

type Filter = { key: string; label: string };

export function KaribuEvents({ events }: { events: Event[] }) {
  const [active, setActive] = useState("all");
  const reduce = useReducedMotion();
  const { whatsapp } = useSocialLinks();

  // Filtering re-orders events in place (FLIP) rather than hard-cutting, so the
  // relationship between the old and new list stays legible. Under reduced
  // motion we drop the layout tween AND the enter/exit offset entirely (Framer
  // defaults to reducedMotion:"never", so it will NOT do this for us) — items
  // just cross-fade, no movement.
  const flip = {
    layout: !reduce,
    initial: reduce ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: { duration: 0.28, ease: FLIP_EASE },
  } as const;

  // Build chips from real data: All + present cities + present types.
  const filters = useMemo<Filter[]>(() => {
    const cities = [...new Set(events.map((e) => e.city).filter(Boolean))];
    const types = [...new Set(events.map((e) => e.type))];
    return [
      { key: "all", label: "All" },
      ...cities.map((c) => ({ key: `city:${c}`, label: c })),
      ...types.map((t) => ({ key: `type:${t}`, label: TYPE_PLURAL[t] })),
    ];
  }, [events]);

  const filtered = useMemo(() => {
    if (active === "all") return events;
    const idx = active.indexOf(":");
    const kind = active.slice(0, idx);
    const value = active.slice(idx + 1);
    return events.filter((e) => (kind === "city" ? e.city === value : e.type === value));
  }, [events, active]);

  const upcoming = useMemo(
    () =>
      filtered
        .filter((e) => UPCOMING_STATUSES.includes(e.status))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [filtered],
  );
  const past = useMemo(
    () =>
      filtered
        .filter((e) => e.status === "completed")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filtered],
  );

  const featured = upcoming[0];
  const rest = upcoming.slice(1);
  const bandLabel = monthRange(rest.length ? rest : upcoming);

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Events header">
        <Reveal>
          <div className="mb-4 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay">
            Events · Matukio
          </div>
          <h1 className="mb-[18px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Where we meet.
          </h1>
          <p className="mb-7 max-w-[560px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Free, in-person gatherings across Kenya. Everyone welcome — bring a
            laptop and your curiosity.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {filters.map((f) => {
              const on = f.key === active;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActive(f.key)}
                  aria-pressed={on}
                  className={`rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors ${
                    on
                      ? "bg-ink text-paper-card"
                      : "border border-sand-2 bg-paper-card font-medium text-ink-soft hover:border-ink"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* Featured "Next up" */}
      {featured && (
        <section className={`${WRAP} py-5`} aria-label="Next event">
          <Reveal>
            <FeaturedCard event={featured} />
          </Reveal>
        </section>
      )}

      {/* Upcoming list */}
      {rest.length > 0 && (
        <section className={`${WRAP} pb-10 pt-2`} aria-label="Upcoming events">
          <Reveal>
            <div className="mb-2 border-b border-sand pb-3 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              {bandLabel}
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              {rest.map((ev) => (
                <motion.div key={ev.slug} {...flip}>
                  <ListRow event={ev} />
                </motion.div>
              ))}
            </AnimatePresence>
          </Reveal>
        </section>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && past.length === 0 && (
        <section className={`${WRAP} py-16`}>
          <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
            <p className="mb-4 font-newsreader text-[24px] text-ink">
              No events in this filter yet.
            </p>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
              >
                Get notified on WhatsApp
              </a>
            )}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section className={`${WRAP} pb-16 pt-2`} aria-label="Past events">
          <Reveal>
            <div className="mb-4 border-b border-sand pb-3 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              Past · picha
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {past.map((ev) => (
                  <motion.div key={ev.slug} {...flip}>
                    <PastCard event={ev} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}

/* ─────────────────────────── Featured ─────────────────────────── */

function FeaturedCard({ event }: { event: Event }) {
  const dt = parseDate(event.date);
  const dateLine = dt
    ? `${fmt(dt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${event.time ? ` · ${event.time}` : ""} · ${event.venue}, ${event.city}`
    : `${event.date}${event.time ? ` · ${event.time}` : ""} · ${event.venue}`;
  const free = event.type === "hackathon" || event.status === "registration-open";
  const cover = eventCover(event.posterUrl);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group grid overflow-hidden rounded-2xl border border-sand bg-paper-card transition-colors hover:border-clay md:grid-cols-2"
    >
      <div className="relative min-h-[220px] overflow-hidden md:min-h-[280px]">
        {cover ? (
          <Image
            src={cover}
            alt={event.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 590px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <EventCoverPlaceholder />
        )}
        <span className="absolute left-4 top-4 rounded-full bg-clay px-3 py-1.5 font-inter text-xs font-semibold uppercase tracking-[0.08em] text-paper-card">
          Next up
        </span>
      </div>
      <div className="p-8 md:p-[34px]">
        <div className="mb-3.5 flex flex-wrap gap-2">
          <Badge tone="clay">{event.city}</Badge>
          <Badge tone="sand">{TYPE_LABEL[event.type]}</Badge>
        </div>
        <div className="mb-2.5 font-inter text-[13.5px] text-ink-muted">{dateLine}</div>
        <h2 className="mb-3.5 font-newsreader text-[28px] leading-[1.1] text-ink sm:text-[32px]">
          {event.title}
        </h2>
        <p className="mb-5 font-inter text-[15px] leading-[1.55] text-ink-soft">
          {event.description}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-clay px-6 py-3 font-inter text-[14.5px] font-semibold text-paper-card">
            {free ? "Register — free" : "View details"}
          </span>
          {typeof event.attendeeCount === "number" && (
            <span className="font-inter text-[13px] text-ink-muted">
              {event.attendeeCount} registered
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────── List row ─────────────────────────── */

function ListRow({ event }: { event: Event }) {
  const dt = parseDate(event.date);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="grid grid-cols-[84px_1fr] items-center gap-5 border-b border-sand py-5 transition-opacity hover:opacity-80 sm:grid-cols-[120px_1fr_auto] sm:gap-[26px]"
    >
      <div className="text-center">
        <div className="font-inter text-[11.5px] font-semibold uppercase tracking-[0.1em] text-clay">
          {dt ? fmt(dt, { month: "short" }) : ""}
        </div>
        <div className="font-newsreader text-[34px] leading-none text-ink sm:text-[38px]">
          {dt ? fmt(dt, { day: "2-digit" }) : "—"}
        </div>
        <div className="font-inter text-[11.5px] text-ink-muted">
          {dt ? fmt(dt, { weekday: "short" }) : ""}
          {event.time ? ` · ${event.time}` : ""}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex flex-wrap gap-2">
          <Badge tone="clay" small>
            {event.city}
          </Badge>
          <Badge tone="sand" small>
            {TYPE_LABEL[event.type]}
          </Badge>
        </div>
        <div className="font-newsreader text-[21px] leading-[1.15] text-ink sm:text-[23px]">
          {event.title}
        </div>
      </div>
      <span className="col-span-2 mt-1 justify-self-start whitespace-nowrap rounded-full border border-sand-2 px-5 py-2.5 font-inter text-[13.5px] font-semibold text-ink transition-colors hover:border-ink sm:col-span-1 sm:mt-0 sm:justify-self-auto">
        Details →
      </span>
    </Link>
  );
}

/* ─────────────────────────── Past card ─────────────────────────── */

function PastCard({ event }: { event: Event }) {
  const dt = parseDate(event.date);
  const label = dt ? fmt(dt, { month: "short", year: "numeric" }) : event.date;
  const cover = eventCover(event.posterUrl);
  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <div className="relative mb-2.5 h-[150px] overflow-hidden rounded-xl border border-sand">
        {cover ? (
          <Image
            src={cover}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, 380px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <EventCoverPlaceholder />
        )}
      </div>
      <div className="font-inter text-xs text-ink-muted">
        {label}
        {event.city ? ` · ${event.city}` : ""}
      </div>
      <div className="font-newsreader text-[18px] text-ink">{event.title}</div>
    </Link>
  );
}

/* ─────────────────────────── Badge ─────────────────────────── */

function Badge({
  children,
  tone,
  small,
}: {
  children: React.ReactNode;
  tone: "clay" | "sand";
  small?: boolean;
}) {
  const base = small ? "px-2.5 py-1 text-[11.5px]" : "px-2.5 py-1 text-xs";
  const toneCls =
    tone === "clay"
      ? "bg-clay/10 text-clay"
      : "bg-paper-alt text-ink-muted";
  return (
    <span className={`rounded-full font-inter font-semibold ${base} ${toneCls}`}>
      {children}
    </span>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

/** "Apr — May 2026" style band from a list of events; falls back to "Upcoming". */
function monthRange(events: Event[]): string {
  const dates = events.map((e) => parseDate(e.date)).filter((d): d is Date => d !== null);
  if (dates.length === 0) return "Upcoming";
  dates.sort((a, b) => a.getTime() - b.getTime());
  const first = dates[0];
  const last = dates[dates.length - 1];
  const y = last.getFullYear();
  const m1 = fmt(first, { month: "long" });
  const m2 = fmt(last, { month: "long" });
  return m1 === m2 ? `${m1} ${y}` : `${m1} — ${m2} ${y}`;
}
