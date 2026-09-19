"use client";

/**
 * KaribuFaq — warm-light FAQ page for the Karibu identity.
 *
 * Preserves every question/answer from src/data/faq.ts, grouped by category,
 * plus a search box, a floating "Ask on Discord" CTA, and a closing
 * still-have-questions panel with Discord + email contact options. Renders
 * each group through the shared FaqAccordion rather than a second inline
 * accordion implementation.
 */

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Search, X } from "lucide-react";
import { CONTACT } from "@/lib/constants";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { PageBanner } from "@/components/karibu/PageBanner";
import { CtaBand } from "@/components/karibu/CtaBand";
import { FaqAccordion } from "@/components/karibu/FaqAccordion";
import type { FAQ } from "@/data/faq";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

export interface FaqCategory {
  key: string;
  label: string;
  command: string;
}

function FloatingDiscordCta({ discordUrl }: { discordUrl: string | null }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (dismissed || !visible || !discordUrl) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <a
        href={discordUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full border border-sand-2 bg-paper-card px-4 py-2.5 font-inter text-xs font-semibold text-clay shadow-lg shadow-black/5 backdrop-blur-sm transition-colors hover:border-clay"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        Ask on Discord
      </a>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-full border border-sand-2 bg-paper-card p-1.5 text-ink-muted transition-colors hover:text-ink"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function KaribuFaq({ faqs, categories }: { faqs: FAQ[]; categories: FaqCategory[] }) {
  const [query, setQuery] = useState("");
  const { discord } = useSocialLinks();

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return faqs.filter(
      (faq) => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
    );
  }, [query, faqs]);

  return (
    <>
      <PageBanner
        image="/images/community/mic-question.webp"
        imageAlt="A member asking a question at a CCK event"
        crumbs={["Home", "FAQ"]}
        title="Questions, answered."
        subtitle="Everything you need to know about Claude Community Kenya — who we are, how our events work, and getting started with Claude."
      />

      {/* Search */}
      <section className={`${WRAP} pb-5 pt-10`} aria-label="Search FAQ">
        <Reveal className="mx-auto max-w-xl">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions..."
              aria-label="Search FAQ"
              className="w-full rounded-full border border-sand bg-paper-card px-11 py-3.5 font-inter text-[15px] text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {filtered !== null && (
            <p className="mt-3 text-center font-inter text-sm text-ink-muted">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </p>
          )}
        </Reveal>
      </section>

      {/* FAQ list */}
      <section className={`${WRAP} py-6`} aria-label="Frequently asked questions">
        {filtered !== null ? (
          <Reveal className="mx-auto max-w-3xl">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-sand bg-paper-card px-6 py-12 text-center">
                <p className="font-inter text-[15px] text-ink-soft">No matching questions found.</p>
                <p className="mt-1 font-inter text-sm text-ink-muted">
                  Try a different search term or browse the categories below.
                </p>
              </div>
            ) : (
              <FaqAccordion items={filtered} variant="card" />
            )}
          </Reveal>
        ) : (
          <div className="mx-auto max-w-3xl space-y-12">
            {categories.map((category) => {
              const items = faqs.filter((faq) => faq.category === category.key);
              if (items.length === 0) return null;
              return (
                <Reveal key={category.key} className="scroll-mt-24" >
                  <div id={`faq-${category.key}`}>
                    <h2 className="mb-4 flex items-center gap-2 font-newsreader text-[22px] text-ink">
                      {category.label}
                      <span className="font-inter text-sm font-normal text-ink-muted">
                        ({items.length})
                      </span>
                    </h2>
                    <FaqAccordion items={items} variant="card" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      <FloatingDiscordCta discordUrl={discord} />

      {/* Still have questions? */}
      <section className={`${WRAP} py-14`} aria-label="Still have questions">
        <Reveal>
          <div className="rounded-[18px] bg-panel-dark p-8 text-center text-on-panel-dark sm:p-12">
            <h2 className="mb-3 font-newsreader text-[30px] text-on-panel-dark">Still have questions?</h2>
            <p className="mx-auto mb-8 max-w-lg font-inter text-[15px] leading-[1.6] text-[#A79E90]">
              Can&apos;t find what you&apos;re looking for? Reach out to us directly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {discord && (
                <a
                  href={discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3.5 font-inter text-[15px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
                >
                  Ask on Discord <span aria-hidden="true">→</span>
                </a>
              )}
              <a
                href={`mailto:${CONTACT.email}`}
                className="inline-flex items-center gap-2 rounded-full border border-[#3B352D] px-6 py-3.5 font-inter text-[15px] font-semibold text-on-panel-dark transition-colors hover:border-clay-light hover:text-clay-light"
              >
                Email us <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <section className={`${WRAP} pb-16`} aria-label="Join CTA">
        <CtaBand />
      </section>
    </>
  );
}
