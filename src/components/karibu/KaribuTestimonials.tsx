"use client";

/**
 * KaribuTestimonials — auto-advancing quote carousel for the warm-light home.
 *
 * Real community members supplied by Peter (voice-dictated). Quotes are
 * faithful paraphrases of what he described; NAMES + SPELLINGS + wording are
 * pending his sign-off before merge (Billy Mwangi surname, Samuel surname,
 * "Toili"/"Tuigoin" spellings). Do not treat as final copy.
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  /** Initials shown in the avatar chip when no photo is available. */
  initials: string;
  /** Optional real headshot. */
  photo?: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The CCK sessions changed how I work. I've been able to scale what I build and bring real AI leverage into my company.",
    name: "Billy Mwangi",
    role: "Building with Claude · Nairobi",
    initials: "BM",
  },
  {
    quote:
      "Claude has completely transformed my client work — I deliver more, faster, and with far less grind.",
    name: "Samuel",
    role: "Freelance · Client work",
    initials: "S",
  },
  {
    quote:
      "I started CCK because Claude changed how I ship. This community exists so more Kenyans get that same unlock.",
    name: "Peter Kibet",
    role: "Founder, Claude Community Kenya",
    initials: "PK",
    photo: "/images/peter-professional.webp",
  },
  {
    quote:
      "Claude has made research so much easier. What used to take days of digging now takes an afternoon.",
    name: "James Lloyd",
    role: "Research",
    initials: "JL",
  },
  {
    quote:
      "I teach in Tuigoin, a small village. Claude helps me plan lessons, organise my week, and manage my classroom. It has changed how I teach.",
    name: "Isaac Toili",
    role: "Teacher · Tuigoin",
    initials: "IT",
  },
];

export function KaribuTestimonials() {
  const [current, setCurrent] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const go = useCallback((i: number) => {
    setCurrent(((i % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(timer);
  }, [prefersReducedMotion]);

  const t = TESTIMONIALS[current];

  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-sand bg-paper-card p-8 sm:p-10">
      <div className="min-h-[210px]">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={current}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <p className="mb-6 font-newsreader text-[22px] italic leading-[1.35] text-ink sm:text-[26px]">
              &ldquo;{t.quote}&rdquo;
            </p>
            <footer className="flex items-center gap-3">
              {t.photo ? (
                <Image
                  src={t.photo}
                  alt={t.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover ring-1 ring-sand-2"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand font-inter text-sm font-semibold text-ink-soft">
                  {t.initials}
                </span>
              )}
              <span>
                <span className="block font-inter text-[14.5px] font-semibold text-ink">
                  {t.name}
                </span>
                <span className="block font-inter text-[13px] text-ink-muted">{t.role}</span>
              </span>
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {TESTIMONIALS.map((item, i) => (
          <button
            key={item.name}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show testimonial from ${item.name}`}
            aria-current={i === current}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-5 bg-clay" : "w-1.5 bg-sand-2 hover:bg-ink-muted/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
