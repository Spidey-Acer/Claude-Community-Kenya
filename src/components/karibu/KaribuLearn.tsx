"use client";

/**
 * KaribuLearn — warm-light "Learn" hub for the Karibu identity.
 *
 * Ports learn.dc.html but preserves ALL of the resource hub's cards (the mockup
 * showed 4; the real hub has 7), plus the suggested-path card. Redesign, don't
 * remove.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Rocket,
  Terminal,
  GitBranch,
  GraduationCap,
  Code,
  Zap,
  Link2,
  type LucideIcon,
} from "lucide-react";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

export interface LearnCard {
  title: string;
  href: string;
  icon: string;
  description: string;
}

const ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  terminal: Terminal,
  "git-branch": GitBranch,
  graduation: GraduationCap,
  code: Code,
  zap: Zap,
  link: Link2,
};

const PATH = [
  { n: "1", title: "Prompt with confidence", body: "Learn the basics and get a real result in an afternoon." },
  { n: "2", title: "Build with Claude Code", body: "Ship a small app or tool end to end." },
  { n: "3", title: "Come to a workshop", body: "Go further with people who'll help in person." },
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

export function KaribuLearn({ cards }: { cards: readonly LearnCard[] }) {
  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Learn header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Learn · Jifunze</div>
          <h1 className="mb-4 max-w-[820px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Start where you are. <span className="italic text-clay">Build from there.</span>
          </h1>
          <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Community-curated guides, prompts and courses for every level — from
            your very first prompt to production-ready Claude Code.
          </p>
        </Reveal>
      </section>

      {/* Resource cards */}
      <section className={`${WRAP} py-5`} aria-label="Resources">
        <Reveal className="grid gap-4 sm:grid-cols-2">
          {cards.map((card, i) => {
            const Icon = ICONS[card.icon] ?? Rocket;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col rounded-2xl border border-sand bg-paper-card p-7 transition-colors hover:border-clay"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-xs text-clay">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-alt text-clay">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h2 className="mb-2 font-newsreader text-[24px] text-ink">{card.title}</h2>
                <p className="mb-4 flex-1 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                  {card.description}
                </p>
                <span className="font-inter text-sm font-semibold text-clay group-hover:underline">
                  Open →
                </span>
              </Link>
            );
          })}
        </Reveal>
      </section>

      {/* Suggested path */}
      <section className={`${WRAP} py-10`} aria-label="A suggested path">
        <Reveal>
          <div className="rounded-[18px] bg-ink p-8 text-paper sm:p-12">
            <div className="mb-5 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay-light">
              A suggested path
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {PATH.map((s) => (
                <div key={s.n} className="border-t border-[#3B352D] pt-[18px]">
                  <div className="mb-2 font-newsreader text-[30px] text-clay-light">{s.n}</div>
                  <div className="mb-1.5 font-inter text-base font-semibold text-paper">{s.title}</div>
                  <div className="font-inter text-sm leading-[1.55] text-[#A79E90]">{s.body}</div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/events"
                className="inline-flex rounded-full bg-clay px-[26px] py-3.5 font-inter text-[15px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
              >
                See upcoming workshops →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
