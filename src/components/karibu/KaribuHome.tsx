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
import { BTN_OUTLINE, BTN_PRIMARY, LINK, NewTabNote, WorkCard } from "@/components/karibu/kit";
import { HERO_PHOTO, HERO_PHOTO_CREDIT } from "@/components/karibu/photos";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";
const H2 = "font-newsreader text-[34px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]";
const LEAD = "font-inter text-[16px] leading-[1.6] text-ink-soft sm:text-[17px]";
const EMPTY = "font-inter text-[15.5px] leading-[1.6] text-ink-muted";
const BTN_ON_PHOTO =
  "inline-flex items-center justify-center gap-2 rounded-full border border-scrim-text/45 px-6 py-3 font-inter text-[14.5px] font-semibold text-scrim-text transition-colors hover:border-scrim-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scrim-text focus-visible:ring-offset-2";

/**
 * Grid classes for live data: one, two or three columns by item count, and a
 * single card capped so it does not stretch across the page.
 */
function gridForCount(count: number): string {
  if (count <= 1) return "grid max-w-[380px] gap-4";
  if (count === 2) return "grid gap-4 md:max-w-[780px] md:grid-cols-2";
  return "grid gap-4 md:grid-cols-3";
}

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

export function KaribuHome({ nextEvent, season, seasonLive, seasonDates, featured, latestReport, faqItems }: HomeData) {
  return (
    <>
      <Hero nextEvent={nextEvent} />
      <SeasonStrip season={season} live={seasonLive} dates={seasonDates} />
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
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-scrim-text/25 bg-scrim/35 py-1.5 pl-2.5 pr-3.5 backdrop-blur-sm">
          <span className="h-[7px] w-[7px] rounded-full bg-clay-light" aria-hidden="true" />
          <span className="font-inter text-[10.5px] font-semibold uppercase tracking-[0.1em] text-scrim-text sm:text-xs sm:tracking-[0.18em]">
            Karibu · Claude Community Kenya
          </span>
        </div>
        <h1 className="mb-6 max-w-[820px] text-balance font-newsreader text-[34px] font-normal leading-[1.05] tracking-[-0.02em] text-scrim-text sm:text-[48px] lg:text-[56px]">
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
          <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-scrim-text-soft/80">
            Photo: {HERO_PHOTO_CREDIT}
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
      <p className="max-w-[420px] rounded-xl border border-scrim-text/15 bg-scrim/60 px-3.5 py-2.5 font-inter text-sm text-scrim-text-soft backdrop-blur-md">
        No event is scheduled right now. Join the WhatsApp group and you will hear first.
      </p>
    );
  }
  return (
    <Link
      href={`/events/${nextEvent.slug}`}
      className="inline-flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-scrim-text/15 bg-scrim/60 px-3.5 py-2.5 backdrop-blur-md"
    >
      <span className="font-inter text-[10.5px] font-semibold uppercase tracking-[0.14em] text-clay-light">
        Next up
      </span>
      <span className="font-inter text-sm font-semibold text-scrim-text">
        {nextEvent.title} · {shortDate(nextEvent.date)} · {nextEvent.city}
      </span>
      <span className="font-inter text-sm text-scrim-text-soft">View event</span>
    </Link>
  );
}

/* ─────────────────────────── Shared section shell ─────────────────────────── */

/**
 * Kicker, h2 and optional lead for a Home section. The lead is passed only
 * when the section has content, so it never sits above a contradicting empty line.
 */
function SectionHead({
  id,
  kicker,
  title,
  lead,
  leadSpacing = "mb-9",
}: {
  id: string;
  kicker: string;
  title: string;
  lead?: string;
  leadSpacing?: string;
}) {
  return (
    <>
      <div className={`${KICKER} mb-[18px]`}>{kicker}</div>
      <h2 id={id} className={`${H2} ${lead ? "mb-4" : "mb-7"}`}>
        {title}
      </h2>
      {lead && <p className={`${LEAD} ${leadSpacing} max-w-[620px]`}>{lead}</p>}
    </>
  );
}

/* ─────────────────────────── 2. Season strip ─────────────────────────── */

function SeasonStrip({ season, live, dates }: { season: Season; live: boolean; dates: Event[] }) {
  return (
    <section className={`${WRAP} py-16 sm:py-24`} aria-labelledby="home-season-heading">
      <Reveal>
        <SectionHead
          id="home-season-heading"
          kicker={`${live ? "Current season" : "Last season"} · ${season.name}`}
          title="What is on this season"
          lead={
            dates.length > 0
              ? "The next dates are below. The season page has the full calendar, recaps and photos."
              : undefined
          }
          leadSpacing="mb-7"
        />
        {dates.length > 0 ? (
          <ul className={`mb-7 ${gridForCount(dates.length)}`}>
            {dates.map((ev) => (
              <li key={ev.slug}>
                <Link
                  href={`/events/${ev.slug}`}
                  className="block h-full rounded-2xl border border-sand bg-paper-card p-6 transition-colors hover:border-clay"
                >
                  <div className="mb-2 font-mono text-xs tracking-[0.06em] text-clay">{shortDate(ev.date)}</div>
                  <h3 className="font-newsreader text-[22px] leading-[1.2] text-ink">{ev.title}</h3>
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
          {live ? "See the season" : "See last season"}
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
    cta: "Find a meetup",
    href: "/events?type=meetup",
  },
  {
    n: "02",
    title: "Workshops",
    body: "Learn by building, with people beside you who have used the tool.",
    cta: "Find a workshop",
    href: "/events?type=workshop",
  },
  {
    n: "03",
    title: "Impact Labs",
    body: "Make something real over a set programme and see it published.",
    cta: "See what was built",
    href: "/reports#impact-labs",
  },
  {
    n: "04",
    title: "Conversations",
    body: "Talk through how Claude fits real work, then read what came out of it.",
    cta: "Read the conversations",
    href: "/reports#conversations",
  },
] as const;

function WhatWeDo() {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-labelledby="home-what-heading">
      <Reveal>
        <SectionHead
          id="home-what-heading"
          kicker="What we do"
          title="Where you can start"
          lead="Pick whichever fits your week. Every one is free to join and run by volunteers."
        />
      </Reveal>
      <Reveal className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {WHAT_WE_DO.map((card) => (
          <article key={card.n} className="flex min-h-[220px] flex-col gap-3 rounded-2xl border border-sand bg-paper-card p-7">
            <div className="font-mono text-xs tracking-[0.06em] text-clay">{card.n}</div>
            <h3 className="font-newsreader text-[25px] text-ink">{card.title}</h3>
            <p className="flex-1 font-inter text-[15px] leading-[1.55] text-ink-soft">{card.body}</p>
            <Link href={card.href} className={LINK}>
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
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-labelledby="home-work-heading">
      <Reveal>
        <SectionHead
          id="home-work-heading"
          kicker="Featured work"
          title="Built by members"
          lead={posts.length > 0 ? "A few things people in the community have made with Claude." : undefined}
        />
        {posts.length > 0 ? (
          <div className={`mb-7 ${gridForCount(posts.length)}`}>
            {posts.map((post) => (
              <WorkCard key={post.id} submission={post} compact />
            ))}
          </div>
        ) : (
          <p className={`${EMPTY} mb-7`}>
            Nothing is featured yet. If you have built something with Claude, share it and it could be the first.
          </p>
        )}
        <div className="flex flex-wrap gap-x-7 gap-y-1">
          <Link href="/showcase" className={LINK}>
            See all work
          </Link>
          <Link href="/showcase/submit" className={LINK}>
            Share your work
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── 5. Latest report ─────────────────────────── */

function ReportLink({ report }: { report: LatestReport }) {
  const label = `Read the report: ${report.title}`;
  if (report.external) {
    return (
      <a href={report.href} target="_blank" rel="noopener noreferrer" aria-label={label} className={LINK}>
        Read the report
        <NewTabNote />
      </a>
    );
  }
  return (
    <Link href={report.href} aria-label={label} className={LINK}>
      Read the report
    </Link>
  );
}

function LatestReportSection({ report }: { report: LatestReport | null }) {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-labelledby="home-report-heading">
      <Reveal>
        <SectionHead
          id="home-report-heading"
          kicker="Latest report"
          title="What happened last time"
          lead={
            report
              ? "Short write-ups from our Impact Labs and Conversations, so you can see what a session is like before you come."
              : undefined
          }
          leadSpacing="mb-7"
        />
        {report ? (
          <div className="mb-7 rounded-2xl border border-sand bg-paper-card p-7">
            <h3 className="font-newsreader text-[24px] leading-[1.2] text-ink">{report.title}</h3>
            <div className="mb-2 mt-1 font-inter text-[13.5px] text-ink-muted">{reportDate(report.date)}</div>
            <ReportLink report={report} />
          </div>
        ) : (
          <p className={`${EMPTY} mb-7`}>No report has been published yet. The first one will appear here.</p>
        )}
        <Link href="/reports" className={LINK}>
          All reports
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
    <section className="bg-paper-alt py-16 sm:py-24" aria-labelledby="home-join-heading">
      <div className={WRAP}>
        <Reveal>
          <SectionHead
            id="home-join-heading"
            kicker="How to join"
            title="Start by saying hello"
            lead="Come as you are. Beginners are welcome."
          />
          <ol className="mb-9 grid gap-x-8 gap-y-6 md:grid-cols-3">
            {JOIN_STEPS.map((step) => (
              <li key={step.n} className="border-t border-sand pt-6">
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
      </div>
    </section>
  );
}

/* ─────────────────────────── 7. FAQ ─────────────────────────── */

function FaqSection({ items }: { items: HomeData["faqItems"] }) {
  return (
    <section
      className={`${WRAP} grid gap-11 pb-20 pt-16 sm:pb-28 sm:pt-24 lg:grid-cols-[380px_1fr] lg:gap-[88px]`}
      aria-labelledby="home-faq-heading"
    >
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Questions</div>
        <h2 id="home-faq-heading" className={`${H2} mb-5`}>
          Quick answers
        </h2>
        <p className={`${LEAD} mb-5`}>Three short answers. The rest are on the FAQ page.</p>
        <Link href="/faq" className={LINK}>
          Read all questions
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
