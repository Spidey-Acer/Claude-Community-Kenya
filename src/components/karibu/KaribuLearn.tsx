/**
 * KaribuLearnGrid — the "Start here" section of the Karibu Learn hub: the
 * resource-card grid, the suggested-path panel, the FAQ teaser and the join
 * CTA. Ports learn.dc.html but preserves ALL of the resource hub's cards (the
 * mockup showed 4; the real hub has 7). Redesign, don't remove.
 *
 * A server component: the one client part (ProgressLine) lives in its own file.
 *
 * Deliberately does NOT render a masthead — the /resources page now composes
 * its own banner (different title/subtitle) above a "Guides and notes"
 * section, with this grid last under "Start here". Split out 2026-09-22 so
 * the banner and the grid can vary independently; this was the page's only
 * consumer, so nothing else needed updating.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Rocket,
  Terminal,
  GitBranch,
  GraduationCap,
  Code,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { ProgressLine } from "@/components/karibu/ProgressLine";
import { BTN_PRIMARY, EYEBROW, H2, LEAD, LINK, Section, WRAP } from "@/components/karibu/kit";
import { CtaBand } from "@/components/karibu/CtaBand";
import { FaqAccordion } from "@/components/karibu/FaqAccordion";
import { faqs } from "@/data/faq";


const RESOURCES_FAQS = faqs.filter((f) => f.category === "general").slice(0, 5);

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
};

const PATH = [
  { n: "1", title: "Prompt with confidence", body: "Learn the basics and get a real result in an afternoon." },
  { n: "2", title: "Build with Claude Code", body: "Ship a small app or tool end to end." },
  { n: "3", title: "Come to a workshop", body: "Go further with people who'll help in person." },
];

interface KaribuLearnGridProps {
  cards: readonly LearnCard[];
  /** Rendered between the cards and the suggested path (the curated links). */
  afterCards?: ReactNode;
}

export function KaribuLearnGrid({ cards, afterCards }: KaribuLearnGridProps) {
  return (
    <>
      {/* Resource cards */}
      <Section id="start-here" eyebrow="Start here" title="Pick where to begin">
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card, i) => {
            const Icon = ICONS[card.icon] ?? Rocket;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col rounded-2xl border border-sand bg-paper-card p-7 transition-[transform,border-color] duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1 hover:border-clay motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-xs text-clay">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-alt text-clay">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mb-2 font-newsreader text-[24px] text-ink">{card.title}</h3>
                <p className="mb-4 flex-1 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                  {card.description}
                </p>
                <span className={LINK}>Open</span>
              </Link>
            );
          })}
        </div>
      </Section>

      {afterCards}

      {/* Suggested path */}
      <section className={`${WRAP} py-10`} aria-label="A suggested path">
        <Reveal>
          <div className="rounded-[18px] bg-panel-dark p-8 text-on-panel-dark sm:p-12">
            <div className="mb-5 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay-light">
              A suggested path
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {PATH.map((s, i) => (
                <Reveal key={s.n} index={i} className="border-t border-on-panel-dark-muted/30 pt-[18px]">
                  <div className="mb-2 font-newsreader text-[30px] text-clay-light">{s.n}</div>
                  <div className="mb-1.5 font-inter text-base font-semibold text-on-panel-dark">{s.title}</div>
                  <div className="font-inter text-sm leading-[1.55] text-on-panel-dark-muted">{s.body}</div>
                </Reveal>
              ))}
            </div>
            <ProgressLine />
            <div className="mt-8">
              <Link
                href="/events"
                className={BTN_PRIMARY}
              >
                See upcoming workshops
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className={`${WRAP} grid gap-11 py-10 lg:grid-cols-[380px_1fr] lg:gap-[88px]`} aria-label="Frequently asked questions">
        <Reveal>
          <div className={`${EYEBROW} mb-[18px]`}>Questions</div>
          <h2 className={`mb-5 ${H2}`}>
            Before you <span className="italic text-clay">start.</span>
          </h2>
          <p className={`mb-5 ${LEAD}`}>
            Common questions from people picking up Claude for the first time.
          </p>
          <Link href="/faq" className={LINK}>
            All questions
          </Link>
        </Reveal>
        <Reveal>
          <FaqAccordion items={RESOURCES_FAQS} variant="rule" />
        </Reveal>
      </section>

      <section className={`${WRAP} pb-16`} aria-label="Join CTA">
        <CtaBand />
      </section>
    </>
  );
}
