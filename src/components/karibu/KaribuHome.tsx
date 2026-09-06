"use client";

/**
 * KaribuHome — warm-light "Karibu" home page composition.
 *
 * Section order matches the approved canvas artboard
 * (docs/superpowers/specs/canvas-2026-09-05/Main.dc.html) exactly: hero →
 * stats card → who we are → next up / last event → what we do → two tracks
 * → made in Kenya → community in action → faces of the community →
 * supported by → FAQ → CTA band. The footer is rendered by ConditionalLayout,
 * not here.
 *
 * All content is wired to real data — community stats + active cities from
 * SiteSettings, upcoming/past events from the DB, projects filtered to
 * member work (not CCK's own, see KaribuProjects). Nothing here renders a
 * canvas annotation ("Screenshot slot", "[Member project]", etc.) as copy.
 */

import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/lib/types";
import type { CommunityStats } from "@/components/sections/HeroTerminal";
import type { ProjectView } from "@/lib/data";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { KaribuTestimonials } from "@/components/karibu/KaribuTestimonials";
import { KaribuProjects } from "@/components/karibu/KaribuProjects";
import { HeroMedia } from "@/components/karibu/HeroMedia";
import { StatsCard } from "@/components/karibu/StatsCard";
import { FramedPhoto } from "@/components/karibu/FramedPhoto";
import { PhotoGrid } from "@/components/karibu/PhotoGrid";
import { SupporterWall } from "@/components/karibu/SupporterWall";
import { FaqAccordion } from "@/components/karibu/FaqAccordion";
import { CtaBand } from "@/components/karibu/CtaBand";
import {
  HERO_PHOTO,
  HERO_PHOTO_CREDIT,
  FIRST_MEETUP_PHOTO,
  REEL_POSTER_PHOTO,
  FACES_PHOTOS,
  eventCover,
} from "@/components/karibu/photos";
import { EventCoverPlaceholder } from "@/components/karibu/EventCoverPlaceholder";
import { faqs } from "@/data/faq";

interface KaribuHomeProps {
  communityStats?: CommunityStats;
  upcomingEvents: Event[];
  /** Most recently completed event — hero "Last" chip + the strip's fallback. */
  latestPastEvent: Event | null;
  featuredProjects: ProjectView[];
  projectOfTheWeek: ProjectView | null;
}

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const TYPE_LABEL: Record<Event["type"], string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  "career-talk": "Career talk",
  hackathon: "Hackathon",
  conversations: "Conversations",
};

/**
 * Today in Nairobi as YYYY-MM-DD — the same shape Event.date already uses, so
 * the comparison is a plain string compare with no parsing or local-timezone
 * drift.
 */
function todayInNairobi(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

/** Call-to-action for an upcoming event, derived from when it is. */
function eventCta(ev: Event): string {
  if (ev.date && ev.date < todayInNairobi()) {
    return ev.type === "hackathon" ? "See the recap" : "View";
  }
  return ev.type === "hackathon" || ev.status === "registration-open" ? "Register" : "RSVP";
}

/** "Wed 2 Sep" style short date for chips and captions. */
function shortDate(date: string): string {
  const dt = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return date;
  return dt.toLocaleString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

/** "Wednesday 2 September 2026" style long date + time for the event strip. */
function longDateLine(ev: Event): string {
  const dt = new Date(`${ev.date}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return `${ev.date}${ev.time ? ` · ${ev.time}` : ""}`;
  const d = dt.toLocaleString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${d}${ev.time ? ` · ${ev.time}` : ""} · ${ev.venue}, ${ev.city}`;
}

export function KaribuHome({
  communityStats,
  upcomingEvents,
  latestPastEvent,
  featuredProjects,
  projectOfTheWeek,
}: KaribuHomeProps) {
  const cities = communityStats?.citiesActive ?? [];
  const nextEvent = upcomingEvents[0];

  return (
    <>
      <Hero latestPastEvent={latestPastEvent} />
      <div className={`${WRAP} relative z-[2] -mt-6 sm:-mt-12`}>
        <StatsCard
          eventsHosted={communityStats?.eventsHeld ?? 0}
          buildersReached={communityStats?.totalMembers ?? 0}
          cities={cities.length ? cities : ["Nairobi", "Mombasa", "Kisumu"]}
          sinceLabel="Jan '26"
          sinceDetail="first meetup, Westlands"
        />
      </div>
      <WhoWeAre />
      <NextUpStrip nextEvent={nextEvent} latestPastEvent={latestPastEvent} />
      <WhatWeDo />
      <TwoTracks />
      <KaribuProjects projectOfTheWeek={projectOfTheWeek} featuredProjects={featuredProjects} />
      <CommunityInAction />
      <FacesOfTheCommunity />
      <SupportedBy />
      <FaqSection />
      <section className={`${WRAP} pb-20 pt-4`} aria-label="Join">
        <CtaBand />
      </section>
    </>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero({ latestPastEvent }: { latestPastEvent: Event | null }) {
  const { whatsapp } = useSocialLinks();

  return (
    <HeroMedia
      posterSrc={HERO_PHOTO}
      posterAlt="Claude Community Kenya members at a meetup"
      className="h-[560px] sm:h-[620px] lg:h-[680px]"
    >
      <div className={`${WRAP} relative flex h-full flex-col justify-end pb-16 sm:pb-20 lg:pb-[92px]`}>
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-scrim/35 py-1.5 pl-2.5 pr-3.5 backdrop-blur-sm">
          <span className="h-[7px] w-[7px] rounded-full bg-clay-light" aria-hidden="true" />
          <span className="font-inter text-xs font-semibold uppercase tracking-[0.18em] text-scrim-text">
            Karibu · Kenya&apos;s Claude community
          </span>
        </div>
        <h1 className="mb-6 max-w-[760px] font-newsreader text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-scrim-text sm:text-[54px] lg:text-[64px]">
          A free community for Kenyans{" "}
          <span className="italic text-clay-light">learning &amp; building</span> with Claude.
        </h1>
        <p className="mb-8 max-w-[580px] font-inter text-[16px] leading-[1.6] text-scrim-text-soft sm:text-[18px]">
          Free meetups in Nairobi, Mombasa and Kisumu. Workshops, build days and a
          room that answers questions. Beginners welcome.
        </p>
        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-clay px-[26px] py-[15px] font-inter text-[15.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Join the community
            </a>
          )}
          <Link
            href="#made-in-kenya"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/45 px-6 py-[15px] font-inter text-[15.5px] font-semibold text-scrim-text transition-colors hover:border-white"
          >
            See what we&apos;ve built <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Bottom row: last-event chip (left) + photo credit (right) — the
         * only piece of the canvas's annotation family that ships is the
         * credit, since it names what the photo actually shows. */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-4 sm:mt-14">
          {latestPastEvent ? (
            <Link
              href={`/events/${latestPastEvent.slug}`}
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-scrim/60 px-3.5 py-2.5 backdrop-blur-md"
            >
              <span className="font-inter text-[10.5px] font-semibold uppercase tracking-[0.14em] text-clay-light">
                Last
              </span>
              <span className="font-inter text-sm font-semibold text-scrim-text">
                {latestPastEvent.title} · {shortDate(latestPastEvent.date)}
              </span>
              <span className="font-inter text-sm text-scrim-text-soft">· recap →</span>
            </Link>
          ) : (
            <span />
          )}
          <span className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-scrim-text-soft/80">
            Poster: {HERO_PHOTO_CREDIT}
          </span>
        </div>
      </div>
      {/* Marks where the hero ends, for KaribuNav's pinned mobile bottom bar
       * (shows once this scrolls out of view). Zero-size — purely a scroll
       * marker, never rendered visibly. */}
      <div data-hero-sentinel aria-hidden="true" />
    </HeroMedia>
  );
}

/* ─────────────────────────── Who we are ─────────────────────────── */

function WhoWeAre() {
  return (
    <section className={`${WRAP} grid gap-11 py-16 sm:py-24 lg:grid-cols-[500px_1fr] lg:items-center lg:gap-[88px]`} aria-label="Who we are">
      <Reveal>
        <FramedPhoto
          src={FIRST_MEETUP_PHOTO}
          alt="Claude Community Kenya's first meetup in Westlands, Nairobi"
          caption="First meetup · Jan 2026"
          priority
        />
      </Reveal>
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Who we are</div>
        <h2 className="mb-5 font-newsreader text-[34px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]">
          How CCK <span className="italic text-clay">started</span>
        </h2>
        <p className="mb-4 font-inter text-[16px] leading-[1.65] text-ink-soft sm:text-[17px]">
          It began with a handful of people in Nairobi swapping notes on what they
          were building with Claude. Word spread, the group filled up, and
          meetups followed in Mombasa and Kisumu. Today it&apos;s students,
          founders, marketers and engineers at every level.
        </p>
        <p className="mb-7 font-inter text-[16px] leading-[1.65] text-ink-soft sm:text-[17px]">
          We stayed free and volunteer-run on purpose. The point isn&apos;t to
          sell anything. It&apos;s to make sure that if you&apos;re in Kenya
          and curious about AI, there&apos;s a warm, capable room waiting for
          you.
        </p>
        <Link href="/about" className="font-inter text-[15px] font-semibold text-clay hover:underline">
          Read our story →
        </Link>
      </Reveal>
    </section>
  );
}

/* ─────────────────── Next up / Last event strip ─────────────────── */

function NextUpStrip({
  nextEvent,
  latestPastEvent,
}: {
  nextEvent?: Event;
  latestPastEvent: Event | null;
}) {
  const { whatsapp } = useSocialLinks();
  const featured = nextEvent ?? latestPastEvent ?? undefined;
  if (!featured) return null;

  const isUpcoming = featured === nextEvent;
  const cover = eventCover(featured.posterUrl);

  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label={isUpcoming ? "Next event" : "Last event"}>
      <Reveal>
        <div className="mb-5 flex items-baseline justify-between">
          <div className={KICKER}>{isUpcoming ? "Next up" : "Last event"}</div>
          <Link href="/events" className="font-inter text-[14.5px] font-semibold text-clay hover:underline">
            All events →
          </Link>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-sand bg-paper-card md:grid-cols-[minmax(0,380px)_1fr]">
          <div className="frame-base frame-plate border-b border-sand md:border-b-0 md:border-r">
            {cover ? (
              <Image
                src={cover}
                alt={featured.title}
                fill
                sizes="(min-width: 768px) 380px, 100vw"
                className="object-contain"
              />
            ) : (
              <EventCoverPlaceholder event={featured} size="lg" />
            )}
          </div>
          <div className="flex flex-col justify-center gap-3.5 p-8 md:p-11">
            <span className="w-fit rounded-full bg-clay/10 px-3 py-1.5 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-clay">
              {TYPE_LABEL[featured.type]}
              {isUpcoming ? "" : " · Recap"}
            </span>
            <h3 className="font-newsreader text-[26px] leading-[1.15] tracking-[-0.015em] text-ink sm:text-[32px]">
              {featured.title}
            </h3>
            <div className="font-inter text-[14.5px] text-ink-muted">{longDateLine(featured)}</div>
            <div className="mt-2 flex flex-wrap gap-3">
              {isUpcoming ? (
                <Link
                  href={`/events/${featured.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-[14.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
                >
                  {eventCta(featured)}
                </Link>
              ) : (
                <>
                  <Link
                    href={`/events/${featured.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-[14.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
                  >
                    Read the recap
                  </Link>
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-sand-2 px-6 py-3 font-inter text-[14.5px] font-semibold text-ink transition-colors hover:border-ink"
                    >
                      Get a heads-up for the next one
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── What we do ─────────────────────────── */

const WHAT_WE_DO = [
  {
    n: "01",
    title: "Events & meetups",
    body: "Regular in-person gatherings across our cities. Live demos, project showcases, and the hallway conversations that start real projects.",
    cta: "See events →",
    href: "/events",
    clay: false,
  },
  {
    n: "02",
    title: "Hands-on workshops",
    body: "Deep dives on Claude Code, agentic patterns and shipping real apps.",
    cta: "Explore resources →",
    href: "/resources",
    clay: false,
  },
  {
    n: "03",
    title: "Online community",
    body: "WhatsApp & Discord. Questions answered daily, wins shared nightly.",
    cta: "Join the room →",
    href: "whatsapp",
    clay: true,
  },
  {
    n: "04",
    title: "Learn with Claude",
    body: "Shared guides, prompts and starter projects pitched for every level, from your first prompt to production.",
    cta: "Explore resources →",
    href: "/resources",
    clay: false,
  },
] as const;

function WhatWeDo() {
  const { whatsapp } = useSocialLinks();
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label="What we do">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>What we do</div>
        <h2 className="mb-9 max-w-[620px] font-newsreader text-[34px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]">
          Four ways we learn and build <span className="italic text-clay">together.</span>
        </h2>
      </Reveal>
      <Reveal className="grid gap-4 md:grid-cols-4">
        {WHAT_WE_DO.map((card) => {
          const isWhatsapp = card.href === "whatsapp";
          const linkHref = isWhatsapp ? whatsapp : card.href;
          return (
            <article
              key={card.n}
              className={`flex min-h-[220px] flex-col gap-3 rounded-2xl p-7 sm:min-h-[250px] ${
                card.clay ? "bg-clay text-paper-card" : "border border-sand bg-paper-card"
              }`}
            >
              <div className={`font-mono text-xs tracking-[0.06em] ${card.clay ? "text-clay-light" : "text-clay"}`}>
                {card.n}
              </div>
              <h3 className={`font-newsreader text-[25px] ${card.clay ? "text-paper-card" : "text-ink"}`}>
                {card.title}
              </h3>
              <p className={`flex-1 font-inter text-[15px] leading-[1.55] ${card.clay ? "text-[#F1E6D8]" : "text-ink-soft"}`}>
                {card.body}
              </p>
              {linkHref && (
                <a
                  href={linkHref}
                  target={isWhatsapp ? "_blank" : undefined}
                  rel={isWhatsapp ? "noopener noreferrer" : undefined}
                  className={`font-inter text-sm font-semibold hover:underline ${card.clay ? "text-paper-card" : "text-clay"}`}
                >
                  {card.cta}
                </a>
              )}
            </article>
          );
        })}
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── Two tracks ─────────────────────────── */

function TwoTracks() {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label="Two tracks">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Two tracks · one community</div>
      </Reveal>
      <Reveal className="grid gap-4 md:grid-cols-2">
        <TrackCard
          title="Software engineers"
          body="Backend, frontend, mobile, ML. Agentic patterns, multi-instance Claude Code, and hackathons that ship."
          cta="See engineering events →"
          href="/events?type=hackathon"
        />
        <TrackCard
          title="Builders & vibe coders"
          body="Founders, PMs, designers, students and the AI-curious. Skip the theory. Ship the thing."
          cta="Start here →"
          href="/join"
        />
      </Reveal>
    </section>
  );
}

function TrackCard({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-paper-card p-8">
      <h3 className="mb-2.5 font-newsreader text-[26px] text-ink">{title}</h3>
      <p className="mb-4 font-inter text-[15px] leading-[1.6] text-ink-soft">{body}</p>
      <Link href={href} className="font-inter text-[14.5px] font-semibold text-clay hover:underline">
        {cta}
      </Link>
    </div>
  );
}

/* ─────────────── Community in action (reel + testimonials) ─────────────── */

function CommunityInAction() {
  return (
    <div className="border-y border-sand bg-paper-alt">
      <div className={`${WRAP} grid gap-11 py-16 sm:py-24 lg:grid-cols-[300px_1fr] lg:items-center lg:gap-[88px]`}>
        <Reveal className="flex flex-col items-center gap-4">
          <div className="relative w-[240px] rounded-[36px] bg-ink p-2.5 shadow-[0_30px_60px_-30px_rgba(35,32,27,0.6)] sm:w-[280px] sm:rounded-[40px]">
            <div className="relative aspect-[9/18.5] overflow-hidden rounded-[28px] bg-ink sm:rounded-[32px]">
              <Image src={REEL_POSTER_PHOTO} alt="" fill sizes="280px" className="object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-scrim via-transparent to-transparent" />
              <div className="absolute inset-x-4 bottom-4 text-scrim-text">
                <div className="font-inter text-[10.5px] font-semibold uppercase tracking-[0.14em] text-clay-light">
                  Impact Lab 02 · winners reel
                </div>
                <div className="mt-1 font-inter text-[13px] font-semibold">Recap video coming soon</div>
              </div>
            </div>
            <div className="absolute left-1/2 top-[22px] h-6 w-[84px] -translate-x-1/2 rounded-xl bg-ink" aria-hidden="true" />
          </div>
        </Reveal>
        <Reveal>
          <div className={`${KICKER} mb-[18px]`}>Community in action</div>
          <h2 className="mb-9 font-newsreader text-[34px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]">
            In their <span className="italic text-clay">own words.</span>
          </h2>
          <KaribuTestimonials />
        </Reveal>
      </div>
    </div>
  );
}

/* ─────────────────── Faces of the community ─────────────────── */

function FacesOfTheCommunity() {
  return (
    <section className={`${WRAP} py-16 sm:py-24`} aria-label="Faces of the community">
      <Reveal>
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={`${KICKER} mb-[18px]`}>Faces of the community</div>
            <h2 className="font-newsreader text-[34px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]">
              The rooms we&apos;ve <span className="italic text-clay">filled.</span>
            </h2>
          </div>
          <Link href="/gallery" className="font-inter text-[14.5px] font-semibold text-clay hover:underline">
            See all photos →
          </Link>
        </div>
        <PhotoGrid photos={FACES_PHOTOS} columns={4} />
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── Supported by ─────────────────────────── */

const SUPPORTERS = [
  { name: "Anthropic", logo: "/images/anthropic-wordmark.webp", href: "https://anthropic.com", invertInDark: true },
  { name: "Hackhouse Africa" },
  { name: "Blockchain Centre" },
  { name: "Zone01 Kisumu" },
  { name: "Technical University of Mombasa" },
];

function SupportedBy() {
  return (
    <section className={`${WRAP} pb-16 sm:pb-24`} aria-label="Supported by">
      <Reveal>
        <SupporterWall
          supporters={SUPPORTERS}
          caption="Anthropic, via the Claude Community Ambassadors program · and the venues that open their doors to us"
        />
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */

const HOME_FAQS = faqs.filter((f) => f.category === "general").slice(0, 5);

function FaqSection() {
  return (
    <section className={`${WRAP} grid gap-11 pb-16 sm:pb-24 lg:grid-cols-[380px_1fr] lg:gap-[88px]`} aria-label="Frequently asked questions">
      <Reveal>
        <div className={`${KICKER} mb-[18px]`}>Questions</div>
        <h2 className="mb-5 font-newsreader text-[34px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]">
          Before you <span className="italic text-clay">come.</span>
        </h2>
        <p className="mb-5 font-inter text-[15.5px] leading-[1.6] text-ink-soft sm:text-[16px]">
          The things people ask in the WhatsApp group before their first meetup.
        </p>
        <Link href="/faq" className="font-inter text-[15px] font-semibold text-clay hover:underline">
          All questions →
        </Link>
      </Reveal>
      <Reveal>
        <FaqAccordion items={HOME_FAQS} variant="rule" />
      </Reveal>
    </section>
  );
}
