"use client";

/**
 * KaribuFaq — warm-light FAQ page for the Karibu identity.
 *
 * Preserves every question/answer from src/data/faq.ts, grouped by category,
 * plus a search box, a floating "Ask on Discord" CTA, and a closing
 * still-have-questions panel with Discord + email contact options.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, MessageSquare, Search, X } from "lucide-react";
import { CONTACT } from "@/lib/constants";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { Reveal } from "@/components/karibu/motion/Reveal";
import type { FAQ } from "@/data/faq";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

export interface FaqCategory {
  key: string;
  label: string;
  command: string;
}

function FaqItem({ faq, isOpen, onToggle }: { faq: FAQ; isOpen: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-paper-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${faq.id}`}
        id={`faq-question-${faq.id}`}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-paper-alt/40"
      >
        <span className="font-newsreader text-[19px] leading-snug text-ink">{faq.question}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-clay transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            id={`faq-answer-${faq.id}`}
            role="region"
            aria-labelledby={`faq-question-${faq.id}`}
            initial={reduce ? { height: "auto" } : { height: 0, opacity: 0 }}
            animate={reduce ? { height: "auto" } : { height: "auto", opacity: 1 }}
            exit={reduce ? { height: "auto" } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <p className="px-6 pb-6 font-inter text-[15px] leading-[1.65] text-ink-soft">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [openId, setOpenId] = useState<string | null>(null);
  const { discord } = useSocialLinks();

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return faqs.filter(
      (faq) => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
    );
  }, [query, faqs]);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="FAQ header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>FAQ · Maswali</div>
          <h1 className="mb-4 max-w-[820px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Questions, <span className="italic text-clay">answered.</span>
          </h1>
          <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Everything you need to know about Claude Community Kenya — who we
            are, how our events work, and getting started with Claude.
          </p>
        </Reveal>
      </section>

      {/* Search */}
      <section className={`${WRAP} py-5`} aria-label="Search FAQ">
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
          <Reveal className="mx-auto max-w-3xl space-y-4">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-sand bg-paper-card px-6 py-12 text-center">
                <p className="font-inter text-[15px] text-ink-soft">No matching questions found.</p>
                <p className="mt-1 font-inter text-sm text-ink-muted">
                  Try a different search term or browse the categories below.
                </p>
              </div>
            ) : (
              filtered.map((faq) => (
                <FaqItem key={faq.id} faq={faq} isOpen={openId === faq.id} onToggle={() => toggle(faq.id)} />
              ))
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
                    <div className="space-y-4">
                      {items.map((faq) => (
                        <FaqItem
                          key={faq.id}
                          faq={faq}
                          isOpen={openId === faq.id}
                          onToggle={() => toggle(faq.id)}
                        />
                      ))}
                    </div>
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
          <div className="rounded-[18px] bg-ink p-8 text-center text-paper sm:p-12">
            <h2 className="mb-3 font-newsreader text-[30px] text-paper">Still have questions?</h2>
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
                className="inline-flex items-center gap-2 rounded-full border border-[#3B352D] px-6 py-3.5 font-inter text-[15px] font-semibold text-paper transition-colors hover:border-clay-light hover:text-clay-light"
              >
                Email us <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
