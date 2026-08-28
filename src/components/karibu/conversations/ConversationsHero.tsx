/**
 * ConversationsHero — the top of a Conversations event page: the two
 * numbers in tension (heroHeadline / heroSubline), a date/venue chip, and
 * the Luma link if the event has one. Server component — no interactivity.
 */

import { Reveal } from "@/components/karibu/motion/Reveal";

interface ConversationsHeroProps {
  heroHeadline: string;
  heroSubline: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  lumaUrl?: string;
}

function parseDate(d: string): Date | null {
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
const fmt = (dt: Date, opts: Intl.DateTimeFormatOptions) => dt.toLocaleString("en-US", opts);

export function ConversationsHero({
  heroHeadline,
  heroSubline,
  date,
  time,
  venue,
  city,
  lumaUrl,
}: ConversationsHeroProps) {
  const dt = parseDate(date);
  const dateLine = dt
    ? `${fmt(dt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${time ? ` · ${time}` : ""}`
    : date;

  return (
    <section className="mx-auto max-w-[900px] px-6 pb-10 pt-16 text-center md:px-10">
      <Reveal>
        <div className="mb-5 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay">
          Claude Conversations
        </div>
        <h1 className="mb-4 font-newsreader text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-ink sm:text-[42px] lg:text-[48px]">
          {heroHeadline}
        </h1>
        <p className="mx-auto mb-7 max-w-[640px] font-inter text-[17px] leading-[1.6] text-ink-soft">
          {heroSubline}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full bg-paper-alt px-4 py-2 font-inter text-[13.5px] font-semibold text-ink-soft">
            {dateLine} · {venue}, {city}
          </span>
          {lumaUrl && (
            <a
              href={lumaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-clay px-5 py-2.5 font-inter text-[13.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              RSVP on Luma →
            </a>
          )}
        </div>
      </Reveal>
    </section>
  );
}
