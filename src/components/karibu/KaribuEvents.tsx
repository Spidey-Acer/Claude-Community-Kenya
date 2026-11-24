"use client";

/**
 * KaribuEvents: the Events listing on the page kit. Masthead, filter chips, a
 * featured "Next up" card, the upcoming list, and a past-events grid. All
 * events come from the DB (getEvents). Filter chips are derived from the real
 * data, so no chip is shown for a city or type that has no events. The initial
 * filter honours `?city=` and `?type=` (the home page's "What we do" links).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Event } from "@/lib/types";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { CtaBand } from "@/components/karibu/CtaBand";
import { resolveInitialFilter, type EventFilter } from "@/components/karibu/event-filter";
import { isEventPast } from "@/lib/event-dates";
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  EmptyState,
  EventCard,
  Masthead,
  NewTabNote,
  Section,
  TYPE_PLURAL,
  WRAP,
  formatDate,
  parseEventDate,
} from "@/components/karibu/kit";

const FLIP_EASE = [0.16, 1, 0.3, 1] as const;
const UPCOMING_STATUSES: Event["status"][] = ["upcoming", "registration-open"];

/** Past events revealed per "Show more" press. */
const PAST_PAGE_SIZE = 9;

export function KaribuEvents({ events }: { events: Event[] }) {
  const searchParams = useSearchParams();
  // Build chips from real data: All + present cities + present types.
  const filters = useMemo<EventFilter[]>(() => {
    const cities = [...new Set(events.map((e) => e.city).filter(Boolean))];
    const types = [...new Set(events.map((e) => e.type))];
    return [
      { key: "all", label: "All" },
      ...cities.map((c) => ({ key: `city:${c}`, label: c })),
      ...types.map((t) => ({ key: `type:${t}`, label: TYPE_PLURAL[t] })),
    ];
  }, [events]);

  // Initial filter from ?city= or ?type= (e.g. the home page's "See
  // engineering events" link), kept only if it names a real chip. Read once,
  // not kept in sync with the URL: the chips are the source of truth after.
  const [active, setActive] = useState(() =>
    resolveInitialFilter(searchParams.get("city"), searchParams.get("type"), filters),
  );
  const [pastPages, setPastPages] = useState(1);
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

  const filtered = useMemo(() => {
    if (active === "all") return events;
    const idx = active.indexOf(":");
    const kind = active.slice(0, idx);
    const value = active.slice(idx + 1);
    return events.filter((e) => (kind === "city" ? e.city === value : e.type === value));
  }, [events, active]);

  // Both halves test the date as well as the status: status is set by hand in
  // admin, so a finished event left as UPCOMING would otherwise sit in the
  // upcoming band and be missing from the past one. See lib/event-dates.
  const upcoming = useMemo(
    () =>
      filtered
        .filter((e) => UPCOMING_STATUSES.includes(e.status) && !isEventPast(e.date))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [filtered],
  );
  const past = useMemo(
    () =>
      filtered
        .filter((e) => e.status === "completed" || isEventPast(e.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filtered],
  );

  const shownPast = past.slice(0, pastPages * PAST_PAGE_SIZE);
  const hiddenPast = past.length - shownPast.length;

  const featured = upcoming[0];
  const rest = upcoming.slice(1);
  const bandLabel = monthRange(rest.length ? rest : upcoming);
  // Past is already sorted newest-first, so its head is the latest past
  // event — the same fact the home hero's "Last" chip uses, computed here
  // from the one list this page already has rather than a second fetch.
  const latestPast = past[0];

  return (
    <>
      <Masthead
        eyebrow="Events"
        title="Where we meet."
        lead="Free, in-person gatherings across Kenya. Everyone welcome. Bring a laptop and your curiosity."
        media={
          <Image
            src="/images/community/workshop-room.webp"
            alt="A full room at a CCK workshop"
            fill
            priority
            sizes="(min-width: 1024px) 440px, 100vw"
            className="object-cover"
          />
        }
      />

      {/* Filters */}
      <section className={`${WRAP} flex flex-wrap items-center justify-between gap-4 pb-2`} aria-label="Filter events">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const on = f.key === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setActive(f.key);
                  setPastPages(1);
                }}
                aria-pressed={on}
                className={`min-h-11 rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 ${
                  on
                    ? "bg-band-bg text-on-band"
                    : "border border-sand-2 bg-paper-card font-medium text-ink-soft hover:border-ink"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Upcoming: always visible, with the designed empty state when nothing is scheduled. */}
      <Section id="upcoming" eyebrow="Upcoming" title="Coming up">
        {upcoming.length === 0 ? (
          <EmptyState
            title={
              <>
                Nothing on the calendar <span className="italic text-clay">yet.</span>
              </>
            }
            body={`The next one is being planned. Get a heads-up on WhatsApp the moment it's live${
              latestPast ? `, or see what happened at ${latestPast.title}` : ""
            }.`}
            action={
              <>
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY}>
                    Get a heads-up
                    <NewTabNote />
                  </a>
                )}
                {latestPast && (
                  <Link href={`/events/${latestPast.slug}`} className={BTN_OUTLINE}>
                    Read the last recap
                  </Link>
                )}
              </>
            }
          />
        ) : (
          <>
            <EventCard event={featured} variant="feature" />
            {rest.length > 0 && (
              <div className="mt-8">
                <div className="mb-2 border-b border-sand pb-3 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
                  {bandLabel}
                </div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {rest.map((ev) => (
                    <motion.div key={ev.slug} {...flip}>
                      <EventCard event={ev} variant="row" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Past */}
      {past.length > 0 && (
        <Section
          id="past"
          eyebrow="Past"
          title="Past events"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {shownPast.map((ev) => (
                <motion.div key={ev.slug} {...flip}>
                  <EventCard event={ev} variant="tile" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {hiddenPast > 0 && (
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => setPastPages((n) => n + 1)} className={BTN_OUTLINE}>
                Show {Math.min(hiddenPast, PAST_PAGE_SIZE)} more
              </button>
            </div>
          )}
        </Section>
      )}

      <section className={`${WRAP} pb-16`} aria-label="Join the community">
        <CtaBand />
      </section>
    </>
  );
}

/** "Apr — May 2026" style band from a list of events; falls back to "Upcoming". */
function monthRange(events: Event[]): string {
  const dates = events.map((e) => parseEventDate(e.date)).filter((d): d is Date => d !== null);
  if (dates.length === 0) return "Upcoming";
  dates.sort((a, b) => a.getTime() - b.getTime());
  const first = dates[0];
  const last = dates[dates.length - 1];
  const firstMonth = formatDate(first, { month: "long" });
  const lastMonth = formatDate(last, { month: "long" });
  return firstMonth === lastMonth ? `${firstMonth} ${last.getFullYear()}` : `${firstMonth} — ${lastMonth} ${last.getFullYear()}`;
}
