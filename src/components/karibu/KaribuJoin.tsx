"use client";

/**
 * KaribuJoin: the "Join" page on the page kit. A no-application,
 * WhatsApp-first join flow with a 3-step guide and per-city links.
 */

import Link from "next/link";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import Image from "next/image";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, LINK, Masthead, NewTabNote, Section, WRAP } from "@/components/karibu/kit";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { CtaBand } from "@/components/karibu/CtaBand";
import { FaqAccordion } from "@/components/karibu/FaqAccordion";
import { faqs } from "@/data/faq";

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
    { name: "Nairobi", note: "Meetups & hackathons", href: lumaNairobi, cta: "Luma" },
    { name: "Mombasa", note: "Coast chapter", href: lumaMombasa, cta: "Luma" },
    { name: "Kisumu", note: "Growing — say hi", href: whatsapp, cta: "WhatsApp" },
  ].filter((c): c is { name: string; note: string; href: string; cta: string } => Boolean(c.href));

  return (
    <>
      <Masthead
        eyebrow="Join"
        title="Say hello and you're one of us."
        lead="Free, no application. Introduce yourself and start building with a community across Kenya."
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
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY}>
              Join on WhatsApp
              <NewTabNote />
            </a>
          )}
          {discord && (
            <a href={discord} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE}>
              Join Discord
              <NewTabNote />
            </a>
          )}
        </div>
      </Masthead>

      <Section eyebrow="How it works" title="Three steps">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-sand bg-paper-card p-7">
              <div className="mb-3 font-newsreader text-[32px] text-clay">{s.n}</div>
              <h3 className="mb-1.5 font-inter text-[17px] font-semibold text-ink">{s.title}</h3>
              <p className="font-inter text-[14.5px] leading-[1.55] text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Find your city" title="Meet the community in person">
        <div className="grid gap-4 sm:grid-cols-3">
          {cities.map((c) => (
            <a key={c.name} href={c.href} target="_blank" rel="noopener noreferrer" className={CARD}>
              <div className="flex items-center justify-between p-6">
                <div>
                  <div className="font-newsreader text-[24px] text-ink">{c.name}</div>
                  <div className="font-inter text-[13px] text-ink-muted">{c.note}</div>
                </div>
                <span className="font-inter text-sm font-semibold text-clay">{c.cta}</span>
              <NewTabNote />
              </div>
            </a>
          ))}
        </div>
        <p className="mt-4 font-inter text-[13.5px] text-ink-muted">
          Not in these cities?{" "}
          <Link href="/get-involved?role=volunteer" className="font-semibold text-clay hover:text-clay-dark">
            Request a chapter
          </Link>
        </p>
      </Section>

      <Section eyebrow="Before you say hello" title="Quick answers">
        <div className="max-w-3xl">
          <FaqAccordion items={JOIN_FAQS} variant="card" />
        </div>
        <Link href="/faq" className={`${LINK} mt-2`}>
          All questions
        </Link>
      </Section>

      <section className={`${WRAP} pb-16`} aria-label="Join CTA">
        <Reveal>
          <CtaBand />
        </Reveal>
      </section>
    </>
  );
}
