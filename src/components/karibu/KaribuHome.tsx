/**
 * KaribuHome: the Home page, seven sections in the order of revamp spec S2.
 *
 * hero (with next-event strip) -> season strip -> what we do -> featured work
 * -> latest report -> how to join -> FAQ. No stats bar and no counts.
 *
 * A server component: it takes its data as props from `src/app/page.tsx` and
 * every join button points at `/join`, so nothing here needs the client. The
 * parts that do (HeroMedia, Reveal, FaqAccordion) are small client components
 * imported as-is. Each live-data section renders its empty-state line when
 * its data is missing.
 */

import Link from "next/link";
import type { Event } from "@/lib/types";
import type { Season } from "@/data/seasons";
import type { HomeData, LatestReport } from "@/lib/home/home-data";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { HeroMedia } from "@/components/karibu/HeroMedia";
import { FaqAccordion } from "@/components/karibu/FaqAccordion";
import { ShowcaseCard } from "@/components/karibu/showcase/ShowcaseCard";
import { HERO_PHOTO, HERO_PHOTO_CREDIT } from "@/components/karibu/photos";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";
const H2 = "font-newsreader text-[34px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]";
const LEAD = "font-inter text-[16px] leading-[1.6] text-ink-soft sm:text-[17px]";
const EMPTY = "font-inter text-[15.5px] leading-[1.6] text-ink-muted";
const LINK = "font-inter text-[15px] font-semibold text-clay hover:underline";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-clay px-[26px] py-[15px] font-inter text-[15.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark";
const BTN_ON_PHOTO =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/45 px-6 py-[15px] font-inter text-[15.5px] font-semibold text-scrim-text transition-colors hover:border-white";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-full border border-sand-2 px-6 py-[15px] font-inter text-[15.5px] font-semibold text-ink transition-colors hover:border-ink";

/** "Wed 2 Sep" style short date for the strips. */
function shortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

/** "12 November 2026" style date for a report's ISO timestamp. */
function reportDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

export function KaribuHome({ nextEvent, season, seasonDates, featured, latestReport, faqItems }: HomeData) {
  return (
    <>
      <Hero nextEvent={nextEvent} />
      <SeasonStrip season={season} dates={seasonDates} />
      <WhatWeDo />
      <FeaturedWork posts={featured} />
      <LatestReportSection report={latestReport} />
      <HowToJoin />
      <FaqSection items={faqItems} />
    </>
  );
}

/* ─────────────────────────── 1. Hero ─────────────────────────── */

function Hero({ nextEvent }: { nextEvent: Event | null }) {
  return (
    <HeroMedia posterSrc={HERO_PHOTO} posterAlt="Claude Community Kenya members at a meetup">
      {/* The hero sizes to its content, with a floor: the ticker sits above the
       * sticky nav, and at 390px the copy stack is taller than a fixed box.
       * `pt` reserves the ticker + nav band. */}
      <div
        className={`${WRAP} relative flex min-h-[560px] flex-col justify-end pb-16 pt-[124px] sm:min-h-[620px] sm:pb-20 sm:pt-28 lg:min-h-[680px] lg:pb-[92px]`}
      >
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-scrim/35 py-1.5 pl-2.5 pr-3.5 backdrop-blur-sm">
          <span className="h-[7px] w-[7px] rounded-full bg-clay-light" aria-hidden="true" />
          <span className="font-inter text-xs font-semibold uppercase tracking-[0.18em] text-scrim-text">
            Karibu · Claude Community Kenya
          </span>
        </div>
        <h1 className="mb-6 max-w-[760px] font-newsreader text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-scrim-text sm:text-[54px] lg:text-[64px]">
          A free, volunteer-run community for people in Kenya learning and building with Claude.
        </h1>
        <p className="mb-8 max-w-[580px] font-inter text-[16px] leading-[1.6] text-scrim-text-soft sm:text-[18px]">
          Meetups, workshops and a WhatsApp room that answers questions. Beginners are welcome.
        </p>
        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
          <Link href="/join" className={BTN_PRIMARY}>
            Join on WhatsApp
          </Link>
          <Link href="/events" className={BTN_ON_PHOTO}>
            See events
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4 sm:mt-14">
          <NextEventStrip nextEvent={nextEvent} />
          <span className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-scrim-text-soft/80">
            Poster: {HERO_PHOTO_CREDIT}
          </span>
        </div>
      </div>
      {/* Marks where the hero ends, for KaribuNav's pinned mobile bottom bar. */}
      <div data-hero-sentinel aria-hidden="true" />
    </HeroMedia>
  );
}

function NextEventStrip({ nextEvent }: { nextEvent: Event | null }) {
  if (!nextEvent) {
    return (
      <p className="max-w-[420px] rounded-xl border border-white/15 bg-scrim/60 px-3.5 py-2.5 font-inter text-sm text-scrim-text-soft backdrop-blur-md">
        No event is scheduled right now. Join the WhatsApp group and you will hear first.
      </p>
    );
  }
  return (
    <Link
      href={`/events/${nextEvent.slug}`}
      className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-white/15 bg-scrim/60 px-3.5 py-2.5 backdrop-blur-md"
    >
      <span className="font-inter text-[10.5px] font-semibold uppercase tracking-[0.14em] text-clay-light">
        Next up
      </span>
      <span className="font-inter text-sm font-semibold text-scrim-text">
        {nextEvent.title} · {shortDate(nextEvent.date)} · {nextEvent.city}
      </span>
      <span className="font-inter text-sm text-scrim-text-soft">· View event →</span>
    </Link>
  );
}

/* ─────────────────────────── 2. Season strip ─────────────────────────── */

function SeasonStrip({ season, dates }: { season: Season; dates: Event[] }) {
  return (
    <section className={`${WRAP} py-16 sm:py-24`} aria-label="Current season">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Current season</div>
        <h2 className={`${H2} mb-4`}>What is on this season</h2>
        <p className={`${LEAD} mb-7 max-w-[620px]`}>
          The next dates are below. The season page has the full calendar, recaps and photos.
        </p>
        {dates.length > 0 ? (
          <ul className="mb-7 grid gap-3 md:grid-cols-3">
            {dates.map((ev) => (
              <li key={ev.slug}>
                <Link
                  href={`/events/${ev.slug}`}
                  className="block h-full rounded-2xl border border-sand bg-paper-card p-6 transition-colors hover:border-clay"
                >
                  <div className="mb-2 font-mono text-xs tracking-[0.06em] text-clay">{shortDate(ev.date)}</div>
                  <div className="font-newsreader text-[22px] leading-[1.2] text-ink">{ev.title}</div>
                  <div className="mt-1 font-inter text-[14px] text-ink-muted">{ev.city}</div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${EMPTY} mb-7`}>
            The next season is being planned. Dates will appear here once they are set.
          </p>
        )}
        <Link href={`/season/${season.slug}`} className={LINK}>
          See the season →
        </Link>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── 3. What we do ─────────────────────────── */

const WHAT_WE_DO = [
  {
    n: "01",
    title: "Meetups",
    body: "Meet people near you who are building with Claude.",
    cta: "Find a meetup →",
    href: "/events?type=meetup",
  },
  {
    n: "02",
    title: "Workshops",
    body: "Learn by building, with people beside you who have used the tool.",
    cta: "Find a workshop →",
    href: "/events?type=workshop",
  },
  {
    n: "03",
    title: "Impact Labs",
    body: "Make something real over a set programme and see it published.",
    cta: "See what was built →",
    href: "/reports",
  },
  {
    n: "04",
    title: "Conversations",
    body: "Talk through how Claude fits real work, then read what came out of it.",
    cta: "Read the conversations →",
    href: "/conversations",
  },
] as const;

function WhatWeDo() {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label="What we do">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>What we do</div>
        <h2 className={`${H2} mb-4`}>Where you can start</h2>
        <p className={`${LEAD} mb-9 max-w-[620px]`}>
          Pick whichever fits your week. Every one is free to join and run by volunteers.
        </p>
      </Reveal>
      <Reveal className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {WHAT_WE_DO.map((card) => (
          <article key={card.n} className="flex min-h-[220px] flex-col gap-3 rounded-2xl border border-sand bg-paper-card p-7">
            <div className="font-mono text-xs tracking-[0.06em] text-clay">{card.n}</div>
            <h3 className="font-newsreader text-[25px] text-ink">{card.title}</h3>
            <p className="flex-1 font-inter text-[15px] leading-[1.55] text-ink-soft">{card.body}</p>
            <Link href={card.href} className="font-inter text-sm font-semibold text-clay hover:underline">
              {card.cta}
            </Link>
          </article>
        ))}
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── 4. Featured work ─────────────────────────── */

function FeaturedWork({ posts }: { posts: HomeData["featured"] }) {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label="Featured work">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Featured work</div>
        <h2 className={`${H2} mb-4`}>Built by members</h2>
        <p className={`${LEAD} mb-9 max-w-[620px]`}>
          A few things people in the community have made with Claude.
        </p>
        {posts.length > 0 ? (
          <div className="mb-7 grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <ShowcaseCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className={`${EMPTY} mb-7`}>
            Nothing is featured yet. If you have built something with Claude, share it and it could be the first.
          </p>
        )}
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <Link href="/showcase" className={LINK}>
            See all work →
          </Link>
          <Link href="/showcase/submit" className={LINK}>
            Share your work →
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── 5. Latest report ─────────────────────────── */

function LatestReportSection({ report }: { report: LatestReport | null }) {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label="Latest report">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Latest report</div>
        <h2 className={`${H2} mb-4`}>What happened last time</h2>
        <p className={`${LEAD} mb-7 max-w-[620px]`}>
          Short write-ups from our Impact Labs and Conversations, so you can see what a session is like before you come.
        </p>
        {report ? (
          <div className="mb-7 rounded-2xl border border-sand bg-paper-card p-7">
            <div className="font-newsreader text-[24px] leading-[1.2] text-ink">{report.title}</div>
            <div className="mb-4 mt-1 font-inter text-[13.5px] text-ink-muted">{reportDate(report.date)}</div>
            {report.external ? (
              <a href={report.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                Read the report →
              </a>
            ) : (
              <Link href={report.href} className={LINK}>
                Read the report →
              </Link>
            )}
          </div>
        ) : (
          <p className={`${EMPTY} mb-7`}>No report has been published yet. The first one will appear here.</p>
        )}
        <Link href="/reports" className={LINK}>
          All reports →
        </Link>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── 6. How to join ─────────────────────────── */

const JOIN_STEPS = [
  { n: "1", title: "Say hello on WhatsApp", body: "Read along or ask your first question." },
  { n: "2", title: "Pick an event", body: "Come to one when it suits you." },
  { n: "3", title: "Bring something to share", body: "A project, a question or an idea. Whenever you are ready." },
] as const;

function HowToJoin() {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label="How to join">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>How to join</div>
        <h2 className={`${H2} mb-4`}>Start by saying hello</h2>
        <p className={`${LEAD} mb-9 max-w-[620px]`}>Come as you are. Beginners are welcome.</p>
        <ol className="mb-9 grid gap-4 md:grid-cols-3">
          {JOIN_STEPS.map((step) => (
            <li key={step.n} className="rounded-2xl border border-sand bg-paper-card p-7">
              <div className="mb-3 font-mono text-xs tracking-[0.06em] text-clay">Step {step.n}</div>
              <h3 className="mb-2 font-newsreader text-[23px] text-ink">{step.title}</h3>
              <p className="font-inter text-[15px] leading-[1.55] text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3.5">
          <Link href="/join" className={BTN_PRIMARY}>
            Join on WhatsApp
          </Link>
          <Link href="/events" className={BTN_OUTLINE}>
            See events
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── 7. FAQ ─────────────────────────── */

function FaqSection({ items }: { items: HomeData["faqItems"] }) {
  return (
    <section
      className={`${WRAP} grid gap-11 pb-20 sm:pb-28 lg:grid-cols-[380px_1fr] lg:gap-[88px]`}
      aria-label="Frequently asked questions"
    >
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Questions</div>
        <h2 className={`${H2} mb-5`}>Quick answers</h2>
        <p className={`${LEAD} mb-5`}>Three short answers. The rest are on the FAQ page.</p>
        <Link href="/faq" className={LINK}>
          Read all questions →
        </Link>
      </Reveal>
      <Reveal>
        {items.length > 0 ? (
          <FaqAccordion items={items} variant="rule" />
        ) : (
          <p className={EMPTY}>Our questions and answers are on the FAQ page.</p>
        )}
      </Reveal>
    </section>
  );
}
