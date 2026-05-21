"use client";

import { motion } from "framer-motion";

interface SocialProofRailProps {
  quote?: string;
  name?: string;
  role?: string;
  className?: string;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Single-testimonial rail rendered immediately below the hero.
 * Positioned BEFORE the stats bar so visitors hit the trust signal
 * while their attention is still on the hero.
 */
export function SocialProofRail({
  quote = "The demo slot at CCK Nairobi #2 got my project real users. Where else do you get to ship live in front of 30 developers who actually care?",
  name = "Amina Hassan",
  role = "Indie Developer, Mombasa",
  className = "",
}: SocialProofRailProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section
      aria-label="Member story"
      className={`mx-auto max-w-3xl px-4 py-10 md:py-14 ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="card-elevated relative rounded-3xl px-8 py-10 md:px-12 md:py-12"
      >
        {/* Decorative quote mark */}
        <span
          aria-hidden="true"
          className="absolute -top-3 left-8 select-none rounded-full bg-[#1e1e1d] px-2 font-serif text-3xl leading-none text-[#d97757]"
          style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif' }}
        >
          &ldquo;
        </span>

        <blockquote className="text-center">
          <p
            className="mb-6 text-[18px] italic leading-relaxed text-[#faf9f5] sm:text-[20px] md:text-[22px]"
            style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif' }}
          >
            {quote}
          </p>

          <footer className="flex items-center justify-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#d97757] to-[#b85a3e] text-[12px] font-semibold text-[#faf9f5]"
            >
              {initials}
            </span>
            <div className="text-left">
              <div className="text-[14px] font-semibold text-[#e8e6dc]">{name}</div>
              <div className="text-[12px] text-[#7a7870]">{role}</div>
            </div>
          </footer>
        </blockquote>
      </motion.div>
    </section>
  );
}
