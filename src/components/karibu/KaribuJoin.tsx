"use client";

/**
 * KaribuJoin — warm-light "Join" page for the Karibu identity.
 *
 * Ports join.dc.html: a no-application, WhatsApp-first join flow with a 3-step
 * guide and per-city links. The old JoinSwitcher/ProJoinContent files remain
 * (dormant) — nothing deleted.
 */

import Link from "next/link";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { PageBanner } from "@/components/karibu/PageBanner";
import { CtaBand } from "@/components/karibu/CtaBand";
import { FaqAccordion } from "@/components/karibu/FaqAccordion";
import { faqs } from "@/data/faq";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const STEPS = [
  { n: "1", title: "Tap Join on WhatsApp", body: "Opens the main community group instantly — no forms." },
  { n: "2", title: "Introduce yourself", body: "Your city and what you're building or curious about. We all did." },
  { n: "3", title: "Come to an event", body: "Meet the community in person in your city." },
];

// The 5 questions a first-timer actually asks before saying hello.
const JOIN_FAQ_IDS = ["gen-2", "gen-3", "gen-4", "gen-6", "evt-8"];
const JOIN_FAQS = JOIN_FAQ_IDS.map((id) => faqs.find((f) => f.id === id)).filter(
  (f): f is NonNullable<typeof f> => f != null,
);

export function KaribuJoin() {
  const { whatsapp, discord, lumaNairobi, lumaMombasa } = useSocialLinks();
  // Only cities whose link actually resolved (DB or constant fallback) show
  // a card — a city with neither is omitted rather than a dead link.
  const cities = [
    { name: "Nairobi", note: "Meetups & hackathons", href: lumaNairobi, cta: "Luma →" },
    { name: "Mombasa", note: "Coast chapter", href: lumaMombasa, cta: "Luma →" },
    { name: "Kisumu", note: "Growing — say hi", href: whatsapp, cta: "WhatsApp →" },
  ].filter((c): c is { name: string; note: string; href: string; cta: string } => Boolean(c.href));

  return (
    <>
      <PageBanner
        image="/images/community/workshop-room.webp"
        imageAlt="A full room at a CCK workshop"
        crumbs={["Home", "Join"]}
        title="Say hello and you're one of us."
        subtitle="Free, no application. Introduce yourself and start building with a community growing across Kenya."
      />

      {/* Primary join CTAs */}
      <section className={`${WRAP} pb-8 pt-10 text-center`} aria-label="Join CTAs">
        <Reveal>
          <div className="flex flex-wrap justify-center gap-3">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-clay px-[30px] py-4 font-inter text-base font-semibold text-paper-card transition-colors hover:bg-clay-dark"
              >
                Join on WhatsApp
              </a>
            )}
            {discord && (
              <a
                href={discord}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-sand-2 px-7 py-4 font-inter text-base font-semibold text-ink transition-colors hover:border-ink"
              >
                Join Discord
              </a>
            )}
          </div>
        </Reveal>
      </section>

      {/* Steps */}
      <section className={`${WRAP} py-5`} aria-label="How to join">
        <Reveal className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-sand bg-paper-card p-7">
              <div className="mb-3 font-newsreader text-[32px] text-clay">{s.n}</div>
              <div className="mb-1.5 font-inter text-[17px] font-semibold text-ink">{s.title}</div>
              <p className="font-inter text-[14.5px] leading-[1.55] text-ink-soft">{s.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Find your city */}
      <section className={`${WRAP} py-8`} aria-label="Find your city">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Find your city</div>
        </Reveal>
        <Reveal className="grid gap-4 sm:grid-cols-3">
          {cities.map((c) => (
            <a
              key={c.name}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl border border-sand bg-paper-card p-6 transition-colors hover:border-clay"
            >
              <div>
                <div className="font-newsreader text-[24px] text-ink">{c.name}</div>
                <div className="font-inter text-[13px] text-ink-muted">{c.note}</div>
              </div>
              <span className="font-inter text-sm font-semibold text-clay">{c.cta}</span>
            </a>
          ))}
        </Reveal>
        <p className="mt-4 font-inter text-[13.5px] text-ink-muted">
          Not in these cities?{" "}
          <Link href="/volunteer" className="font-semibold text-clay hover:underline">
            Request a chapter →
          </Link>
        </p>
      </section>

      {/* FAQ */}
      <section className={`${WRAP} py-10`} aria-label="Frequently asked questions">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Before you say hello</div>
        </Reveal>
        <Reveal className="mx-auto max-w-3xl">
          <FaqAccordion items={JOIN_FAQS} variant="card" />
        </Reveal>
        <p className="mt-4 text-center font-inter text-[13.5px] text-ink-muted">
          <Link href="/faq" className="font-semibold text-clay hover:underline">
            All questions →
          </Link>
        </p>
      </section>

      <section className={`${WRAP} pb-16`} aria-label="Join CTA">
        <CtaBand />
      </section>
    </>
  );
}
