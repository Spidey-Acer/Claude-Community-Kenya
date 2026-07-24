"use client";

/**
 * KaribuHome — warm-light "Karibu" home page composition.
 *
 * First page of the page-by-page redesign. Visual language ports the approved
 * `index.dc.html` mockup; all content is wired to real data:
 *   • community stats + active cities from siteSettings (no inflated numbers)
 *   • upcoming events from the DB
 *   • Karibu personalization via the shared rank() engine
 *
 * The persona toggle is intentionally absent here — this route is a single
 * identity. Motion is gated behind prefers-reduced-motion.
 */

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { Event } from "@/lib/types";
import type { CommunityStats } from "@/components/sections/HeroTerminal";
import type { AudienceState } from "@/contexts/AudienceContext";
import type { ProjectView } from "@/lib/data";
import { rank, type Recommendable } from "@/lib/recommendations";
import { SOCIAL_LINKS } from "@/lib/constants";
import { Marquee } from "@/components/karibu/Marquee";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { CountUp } from "@/components/ui/CountUp";
import { KaribuTestimonials } from "@/components/karibu/KaribuTestimonials";
import { KaribuProjects } from "@/components/karibu/KaribuProjects";
import { HERO_PHOTO, GALLERY_PHOTOS, eventCover } from "@/components/karibu/photos";

interface KaribuHomeProps {
  communityStats?: CommunityStats;
  upcomingEvents: Event[];
  audienceState: AudienceState;
  recommendables: Recommendable[];
  featuredProjects: ProjectView[];
  projectOfTheWeek: ProjectView | null;
}

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER =
  "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const TYPE_LABEL: Record<Event["type"], string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  "career-talk": "Career talk",
  hackathon: "Hackathon",
};

export function KaribuHome({
  communityStats,
  upcomingEvents,
  audienceState,
  recommendables,
  featuredProjects,
  projectOfTheWeek,
}: KaribuHomeProps) {
  const cities = communityStats?.citiesActive ?? [];
  const memberLabel = communityStats?.totalMembers
    ? `~${communityStats.totalMembers.toLocaleString()} members`
    : null;

  const marqueeItems = [
    memberLabel,
    ...cities,
    "Free & founder-led",
    "Anthropic-supported via the Claude Community Ambassadors program",
    "Everyone welcome",
  ].filter(Boolean) as string[];

  const nextEvent = upcomingEvents[0];

  return (
    <>
      <Marquee items={marqueeItems} />
      <Hero nextEvent={nextEvent} />
      <TrustBar stats={communityStats} cities={cities} />
      <MadeForYouLight audienceState={audienceState} items={recommendables} />
      <WhatWeDo />
      <TwoTracks />
      <EventsSection events={upcomingEvents.slice(0, 3)} />
      <KaribuProjects projectOfTheWeek={projectOfTheWeek} featuredProjects={featuredProjects} />
      <CommunityInAction />
      <HowToJoin />
      <SupportedBy />
    </>
  );
}

/* ─────────────────────────── Supported by ─────────────────────────── */

function SupportedBy() {
  return (
    <section className={`${WRAP} pb-20 pt-4`} aria-label="Supported by">
      <Reveal>
        <p className="mb-8 text-center font-inter text-xs font-semibold uppercase tracking-[0.22em] text-ink-muted">
          Supported by
        </p>
        <div className="flex flex-col items-center gap-3">
          <a
            href="https://anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-2xl border border-sand bg-paper-card px-7 py-5 transition-colors hover:border-clay/50"
          >
            <Image
              src="/images/anthropic-wordmark.webp"
              alt="Anthropic"
              width={160}
              height={43}
              className="anthropic-mark"
              style={{ width: "160px", height: "auto" }}
            />
          </a>
          <p className="font-inter text-[12.5px] text-ink-soft">
            via the Claude Community Ambassadors program
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero({ nextEvent }: { nextEvent?: Event }) {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.2, 0.7, 0.2, 1] as const, delay },
  });

  return (
    <section className={`${WRAP} pb-14 pt-[74px]`} aria-label="Hero">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.div {...rise(0.1)} className={`${KICKER} mb-6`}>
            Karibu · Kenya&apos;s Claude Community
          </motion.div>
          <motion.h1
            {...rise(0.22)}
            className="mb-6 font-newsreader text-[44px] font-normal leading-[1.04] tracking-[-0.02em] text-ink sm:text-[54px] lg:text-[62px]"
          >
            A free community for Kenyans{" "}
            <span className="italic text-clay">learning &amp; building</span> with
            Claude.
          </motion.h1>
          <motion.p
            {...rise(0.34)}
            className="mb-9 max-w-[480px] font-inter text-[18px] leading-[1.6] text-ink-soft"
          >
            Founder-led, mobile-first, and open to everyone — from first-time
            students to seasoned developers. Meet-ups, hands-on workshops, and a
            warm community growing across Kenya.
          </motion.p>
          <motion.div {...rise(0.46)} className="flex flex-wrap items-center gap-3.5">
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-[26px] py-[15px] font-inter text-[15.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Join the community
            </a>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-full border border-sand-2 px-6 py-[15px] font-inter text-[15.5px] font-semibold text-ink transition-colors hover:border-ink"
            >
              See upcoming events →
            </Link>
          </motion.div>
        </div>

        {/* Hero visual — real CCK meetup photo. */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          className="relative h-[300px] overflow-hidden rounded-2xl border border-sand-2 lg:h-[460px]"
        >
          <Image
            src={HERO_PHOTO}
            alt="Claude Community Kenya members at a Nairobi meetup"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 560px"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
          {nextEvent && (
            <div className="absolute bottom-[18px] left-[18px] right-[18px] rounded-xl border border-white/15 bg-ink/70 px-4 py-3 font-inter text-[13px] text-paper-card backdrop-blur-md">
              <span className="font-semibold text-white">{nextEvent.title}</span>
              {typeof nextEvent.attendeeCount === "number" && (
                <> · {nextEvent.attendeeCount} registered</>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Trust bar ─────────────────────────── */

function TrustBar({
  stats,
  cities,
}: {
  stats?: CommunityStats;
  cities: string[];
}) {
  const items: { big: React.ReactNode; small: string }[] = [
    {
      // Count up only the members figure — it's the one number that rewards
      // watching it climb. City count (1–2) would read as filler animated.
      big: stats?.totalMembers ? (
        <CountUp target={stats.totalMembers} prefix="~" />
      ) : (
        "Growing"
      ),
      small: "members & growing",
    },
    {
      big: cities.length ? `${cities.length} ${cities.length === 1 ? "city" : "cities"}` : "Kenya",
      small: cities.length ? cities.join(" · ") : "and expanding",
    },
    { big: "100% free", small: "community-run, always open" },
    { big: "Supported", small: "Claude Community Ambassadors program" },
  ];

  return (
    <div className="relative overflow-hidden border-y border-sand bg-paper-alt">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(193,95,60,0.05) 0 2px, transparent 2px 16px)",
          animation: "karibu-drift 36s linear infinite",
        }}
        aria-hidden="true"
      />
      <div className={`${WRAP} grid grid-cols-2 lg:grid-cols-4`}>
        {items.map((it) => (
          <div key={it.small} className="py-[26px] pr-6">
            <div className="font-newsreader text-[30px] font-medium text-ink">
              {it.big}
            </div>
            <div className="mt-0.5 font-inter text-[13.5px] text-ink-muted">
              {it.small}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── Made for you (personalized) ─────────────────── */

function MadeForYouLight({
  audienceState,
  items,
}: {
  audienceState: AudienceState;
  items: Recommendable[];
}) {
  const ranked = rank(items, {
    audience: audienceState.audience,
    intent: audienceState.intent,
    experience: audienceState.experience,
    city: audienceState.city,
  }).slice(0, 3);
  if (ranked.length === 0) return null;

  return (
    <section className={`${WRAP} py-16`} aria-label="Recommended for you">
      <Reveal>
        <div className={`${KICKER} mb-4`}>Made for you</div>
        <h2 className="mb-8 font-newsreader text-[40px] font-normal leading-[1.1] tracking-[-0.015em] text-ink">
          {ranked.length >= 3 ? "Three things to start with." : "Start with these."}
        </h2>
      </Reveal>
      <Reveal
        className={`grid gap-4 ${
          ranked.length === 1
            ? "max-w-md"
            : ranked.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-3"
        }`}
      >
        {ranked.map((item) => {
          const href =
            item.type === "event"
              ? `/events/${item.id}`
              : item.type === "resource"
                ? `/blog/${item.id}`
                : `/community/${item.id}`;
          return (
            <Link
              key={`${item.type}-${item.id}`}
              href={href}
              className="group rounded-2xl border border-sand bg-paper-card p-5 transition-colors hover:border-clay"
            >
              <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.1em] text-clay">
                {item.type}
              </span>
              <div className="mt-1.5 line-clamp-2 font-inter text-[15px] font-semibold leading-tight text-ink">
                {item.title}
              </div>
              {item.date && (
                <div className="mt-2 font-inter text-[13px] text-ink-muted">
                  {item.date.toISOString().slice(0, 10)}
                  {item.city ? ` · ${item.city}` : ""}
                </div>
              )}
            </Link>
          );
        })}
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── What we do ─────────────────────────── */

function WhatWeDo() {
  return (
    <section id="what" className={`${WRAP} pb-8 pt-20`} aria-label="What we do">
      <Reveal>
        <div className={`${KICKER} mb-4`}>What we do</div>
        <h2 className="mb-10 max-w-[620px] font-newsreader text-[40px] font-normal leading-[1.1] tracking-[-0.015em] text-ink">
          Four ways we learn and build together.
        </h2>
      </Reveal>

      {/* Each card reveals on its own staggered delay (--i, capped at 6 steps)
       * and lifts 4px on hover. The grid-span classes live on the Reveal so it
       * is the grid item; the article fills it with h-full. */}
      <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
        {/* 01 — tall */}
        <Reveal index={0} className="md:row-span-2">
          <article className="flex h-full flex-col justify-between rounded-2xl border border-sand bg-paper-card p-7 transition-transform duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1 active:-translate-y-0.5 active:border-clay">
            <div className="font-mono text-xs tracking-[0.06em] text-clay">01</div>
            <div>
              <h3 className="mb-2.5 font-newsreader text-[27px] text-ink">
                Events &amp; meetups
              </h3>
              <p className="font-inter text-[15px] leading-[1.55] text-ink-soft">
                Regular in-person gatherings across our cities — live demos,
                project showcases, and the hallway conversations that start real
                projects.
              </p>
            </div>
          </article>
        </Reveal>

        {/* 02 */}
        <Reveal index={1}>
          <article className="h-full rounded-2xl border border-sand bg-paper-card p-6 transition-transform duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1 active:-translate-y-0.5 active:border-clay">
            <div className="mb-8 font-mono text-xs tracking-[0.06em] text-clay">02</div>
            <h3 className="mb-2 font-newsreader text-[22px] text-ink">
              Hands-on workshops
            </h3>
            <p className="font-inter text-sm leading-[1.5] text-ink-soft">
              Deep dives on Claude Code, agentic patterns and shipping real apps.
            </p>
          </article>
        </Reveal>

        {/* 03 — clay */}
        <Reveal index={2}>
          <article className="h-full rounded-2xl bg-clay p-6 text-paper-card transition-transform duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1">
            <div className="mb-8 font-mono text-xs tracking-[0.06em] text-clay-light">
              03
            </div>
            <h3 className="mb-2 font-newsreader text-[22px]">Online community</h3>
            <p className="font-inter text-sm leading-[1.5] text-[#F5E4DB]">
              WhatsApp &amp; Discord — questions answered daily, wins shared
              nightly.
            </p>
          </article>
        </Reveal>

        {/* 04 — wide */}
        <Reveal index={3} className="md:col-span-2">
          <article className="group flex h-full flex-col items-center gap-6 rounded-2xl border border-sand bg-paper-card p-6 transition-transform duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1 active:-translate-y-0.5 active:border-clay md:flex-row">
            <div className="flex-1">
              <div className="mb-2.5 font-mono text-xs tracking-[0.06em] text-clay">
                04
              </div>
              <h3 className="mb-2 font-newsreader text-[22px] text-ink">
                Learn with Claude
              </h3>
              <p className="font-inter text-sm leading-[1.5] text-ink-soft">
                Shared guides, prompts and starter projects pitched for every
                level — from your first prompt to production.
              </p>
            </div>
            <Link
              href="/resources"
              className="shrink-0 whitespace-nowrap font-inter text-sm font-semibold text-clay hover:underline"
            >
              Explore resources{" "}
              <span className="inline-block transition-transform duration-150 ease-[var(--ease-reversible)] group-hover:translate-x-1">
                →
              </span>
            </Link>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── Two tracks ─────────────────────────── */

function TwoTracks() {
  return (
    <section className={`${WRAP} py-14`} aria-label="Two tracks">
      <Reveal>
        <div className={`${KICKER} mb-4`}>Two tracks · one community</div>
      </Reveal>
      <Reveal className="grid gap-4 md:grid-cols-2">
        <TrackCard
          title="Software engineers"
          body="Backend, frontend, mobile, ML. Agentic patterns, multi-instance Claude Code, and hackathons that ship."
          cta="See engineering events →"
          href="/events"
        />
        <TrackCard
          title="Builders & vibe coders"
          body="Founders, PMs, designers, students and the AI-curious. Skip the theory — ship the thing."
          cta="Start here →"
          href="/join"
        />
      </Reveal>
    </section>
  );
}

function TrackCard({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-paper-card p-8">
      <h3 className="mb-2.5 font-newsreader text-[26px] text-ink">{title}</h3>
      <p className="mb-4 font-inter text-[15px] leading-[1.6] text-ink-soft">
        {body}
      </p>
      <Link
        href={href}
        className="font-inter text-[14.5px] font-semibold text-clay hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}

/* ─────────────────────────── Events ─────────────────────────── */

function EventsSection({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <section className={`${WRAP} py-14`} aria-label="Upcoming events">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={`${KICKER} mb-3.5`}>Upcoming</div>
            <h2 className="font-newsreader text-[40px] font-normal tracking-[-0.015em] text-ink">
              Come to the next one.
            </h2>
          </div>
          <Link
            href="/events"
            className="font-inter text-[14.5px] font-semibold text-clay hover:underline"
          >
            All events →
          </Link>
        </div>
      </Reveal>

      <Reveal className={`grid gap-4 ${events.length >= 3 ? "md:grid-cols-3" : events.length === 2 ? "md:grid-cols-2" : ""}`}>
        {events.map((ev, i) => {
          const single = events.length === 1;
          const cta =
            ev.type === "hackathon" || ev.status === "registration-open"
              ? "Register"
              : "RSVP";
          return (
            <Link
              key={ev.slug}
              href={`/events/${ev.slug}`}
              className={`group overflow-hidden rounded-2xl border border-sand bg-paper-card transition-colors hover:border-clay active:border-clay active:-translate-y-0.5 ${
                single ? "md:grid md:grid-cols-2" : "block"
              }`}
            >
              <div
                className={`relative overflow-hidden border-sand ${
                  single
                    ? "h-[220px] border-b md:h-full md:min-h-[280px] md:border-b-0 md:border-r"
                    : "h-[150px] border-b"
                }`}
              >
                <Image
                  src={eventCover(ev.posterUrl, i)}
                  alt={ev.title}
                  fill
                  sizes={single ? "(max-width: 768px) 100vw, 590px" : "(max-width: 768px) 100vw, 380px"}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-[22px]">
                <div className="mb-3 flex flex-wrap gap-2">
                  {ev.city && (
                    <span className="rounded-full bg-[#F3E3D9] px-2.5 py-1 font-inter text-xs font-semibold text-clay">
                      {ev.city}
                    </span>
                  )}
                  <span className="rounded-full bg-paper-alt px-2.5 py-1 font-inter text-xs font-semibold text-ink-muted">
                    {TYPE_LABEL[ev.type]}
                  </span>
                </div>
                <div className="mb-1.5 font-inter text-[13px] text-ink-muted">
                  {ev.date}
                  {ev.time ? ` · ${ev.time}` : ""}
                </div>
                <h3 className="mb-4 font-newsreader text-[22px] leading-[1.15] text-ink">
                  {ev.title}
                </h3>
                <span className="border-b-2 border-clay pb-0.5 font-inter text-sm font-semibold text-ink">
                  {cta}
                </span>
              </div>
            </Link>
          );
        })}
      </Reveal>
    </section>
  );
}

/* ─────────────────── Community in action (testimonials) ─────────────────── */

function CommunityInAction() {
  return (
    <section className={`${WRAP} py-14`} aria-label="Community in action">
      <Reveal>
        <div className={`${KICKER} mb-4`}>Community in action</div>
      </Reveal>
      <Reveal className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* Real member & event photos. */}
        <div className="grid min-h-[380px] grid-cols-2 grid-rows-2 gap-3">
          <div className="relative row-span-2 overflow-hidden rounded-xl">
            <Image src={GALLERY_PHOTOS.tall} alt="CCK members building with Claude" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <Image src={GALLERY_PHOTOS.topRight} alt="Engaged audience at a CCK meetup" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <Image src={GALLERY_PHOTOS.bottomRight} alt="CCK community group photo" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
          </div>
        </div>
        <KaribuTestimonials />
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── How to join ─────────────────────────── */

const JOIN_STEPS = [
  {
    n: "1",
    title: 'Tap "Join on WhatsApp"',
    body: "Opens the main community group instantly.",
  },
  {
    n: "2",
    title: "Introduce yourself",
    body: "Your city and what you're building or curious about.",
  },
  {
    n: "3",
    title: "Come to an event near you",
    body: "Meetups across Kenya — all welcome.",
  },
];

function HowToJoin() {
  return (
    <section id="join" className={`${WRAP} py-14`} aria-label="How to join">
      <Reveal className="relative overflow-hidden rounded-2xl bg-ink p-9 text-paper sm:p-[54px]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(230,144,111,0.06) 0 2px, transparent 2px 16px)",
            animation: "karibu-drift 36s linear infinite",
          }}
          aria-hidden="true"
        />
        <div className="relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-4 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay-light">
              How to join
            </div>
            <h2 className="mb-5 font-newsreader text-[40px] font-normal leading-[1.1] tracking-[-0.015em]">
              Three taps and you&apos;re in.
            </h2>
            <p className="mb-7 font-inter text-base leading-[1.6] text-[#C7BEB0]">
              No fees, no application. Just introduce yourself and start
              building.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-clay px-[26px] py-[15px] font-inter text-[15.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
              >
                Join on WhatsApp
              </a>
              <a
                href={SOCIAL_LINKS.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#554E44] px-6 py-[15px] font-inter text-[15.5px] font-semibold text-paper transition-colors hover:border-paper"
              >
                Join Discord
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            {JOIN_STEPS.map((step, i) => (
              <div
                key={step.n}
                className={`flex items-start gap-[18px] ${
                  i < JOIN_STEPS.length - 1 ? "border-b border-[#3B352D] pb-3.5" : ""
                }`}
              >
                <div className="font-newsreader text-2xl text-clay-light">{step.n}</div>
                <div>
                  <div className="font-inter text-base font-semibold text-paper">
                    {step.title}
                  </div>
                  <div className="font-inter text-sm text-[#A79E90]">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
