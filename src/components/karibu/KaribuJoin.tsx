"use client";

/**
 * KaribuJoin — warm-light "Join" page for the Karibu identity.
 *
 * Ports join.dc.html: a no-application, WhatsApp-first join flow with a 3-step
 * guide and per-city links. The old JoinSwitcher/ProJoinContent files remain
 * (dormant) — nothing deleted.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SOCIAL_LINKS } from "@/lib/constants";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const STEPS = [
  { n: "1", title: "Tap Join on WhatsApp", body: "Opens the main community group instantly — no forms." },
  { n: "2", title: "Introduce yourself", body: "Your city and what you're building or curious about. We all did." },
  { n: "3", title: "Come to an event", body: "Meet the community in person in your city." },
];

const CITIES = [
  { name: "Nairobi", note: "Meetups & hackathons", href: SOCIAL_LINKS.lumaNairobi, cta: "Luma →" },
  { name: "Mombasa", note: "Coast chapter", href: SOCIAL_LINKS.lumaMombasa, cta: "Luma →" },
  { name: "Kisumu", note: "Growing — say hi", href: SOCIAL_LINKS.whatsapp, cta: "WhatsApp →" },
];

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function KaribuJoin() {
  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-8 pt-16 text-center`} aria-label="Join header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Join · Karibu</div>
          <h1 className="mx-auto mb-5 max-w-[820px] font-newsreader text-[44px] font-normal leading-[1.02] tracking-[-0.02em] text-ink sm:text-[60px]">
            Say <span className="italic text-clay">Karibu</span> and you&apos;re one of us.
          </h1>
          <p className="mx-auto mb-8 max-w-[560px] font-inter text-[18px] leading-[1.6] text-ink-soft">
            Free, no application. Introduce yourself and start building with a
            community growing across Kenya.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-clay px-[30px] py-4 font-inter text-base font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Join on WhatsApp
            </a>
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-sand-2 px-7 py-4 font-inter text-base font-semibold text-ink transition-colors hover:border-ink"
            >
              Join Discord
            </a>
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
          {CITIES.map((c) => (
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
    </>
  );
}
