"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { HeroEmailCapture } from "@/components/sections/HeroEmailCapture";
import type { CommunityStats, FeedItem } from "@/components/sections/HeroTerminal";

interface HeroProProps {
  stats?: CommunityStats;
  feed?: FeedItem[];
  headlineOverride?: string;
  subOverride?: string;
  ctaLabelOverride?: string;
  ctaHrefOverride?: string;
}

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 100,
  whatsappMembers: 120,
  linkedinMembers: 80,
  totalMembers: 300,
  eventsHeld: 2,
  citiesActive: ["Nairobi", "Mombasa"],
  resourceCount: 33,
};

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function HeroPro({ stats, feed = [], headlineOverride, subOverride, ctaLabelOverride, ctaHrefOverride }: HeroProProps) {
  const resolvedStats = stats ?? DEFAULT_STATS;
  const { discord } = useSocialLinks();
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);

  useEffect(() => {
    if (feed.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFeedIndex((prev) => (prev + 1) % feed.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [feed.length]);

  const currentItem = feed[currentFeedIndex];

  const easeOut = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden">
      {/* Ambient gradient mesh — Anthropic warm tones, softer than before */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 45% at 50% -15%, rgba(217, 119, 87, 0.10), transparent 60%),
              radial-gradient(ellipse 55% 40% at 85% 55%, rgba(106, 155, 204, 0.06), transparent 65%),
              radial-gradient(ellipse 45% 50% at 15% 85%, rgba(120, 140, 93, 0.05), transparent 70%)
            `,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center pt-8 md:pt-12 lg:pt-16">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-7"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2a2a28] bg-[#1e1e1d]/60 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#b0aea5] backdrop-blur-sm">
            <img src="/images/claude-sparkle.svg" alt="" className="h-3 w-3" />
            <span>Anthropic-supported</span>
            <span className="text-[#3a3a37]">·</span>
            <span>Africa</span>
          </span>
        </motion.div>

        {/* Display headline — Fraunces serif */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: easeOut }}
          className="display-xl mb-7 text-[42px] text-[#faf9f5] sm:text-[64px] lg:text-[88px]"
        >
          {headlineOverride ? (
            headlineOverride
          ) : (
            <>
              Claude Community<br />
              <span className="italic bg-gradient-to-br from-[#e89576] via-[#d97757] to-[#b85a3e] bg-clip-text text-transparent">
                Kenya
              </span>
            </>
          )}
        </motion.h1>

        {/* Map — smaller, less ringed, more integrated */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.22, ease: easeOut }}
          className="relative mx-auto mb-9 w-full max-w-[200px] sm:max-w-[240px] lg:max-w-[280px]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(circle_at_center,rgba(217,119,87,0.20),transparent_65%)] blur-3xl"
          />
          <div className="relative overflow-hidden rounded-3xl">
            <Image
              src="/images/kenya-map.webp"
              alt="Map of Kenya highlighting Claude Community cities"
              width={1000}
              height={1000}
              priority
              sizes="(max-width: 640px) 200px, (max-width: 1024px) 240px, 280px"
              className="h-auto w-full"
            />
          </div>
        </motion.div>

        {/* Subtitle — tighter, more confident */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28, ease: easeOut }}
          className="mx-auto mb-10 max-w-xl text-[17px] leading-relaxed text-[#b0aea5] sm:text-[19px]"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {subOverride ??
            "Where Kenya's builders learn, create, and ship with Claude. Workshops, meetups, and real projects — together."}
        </motion.p>

        {/* Primary: email capture — keep the lead on-site instead of pushing to Discord */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.36, ease: easeOut }}
          className="mb-6"
        >
          <HeroEmailCapture
            label={ctaLabelOverride ? `${ctaLabelOverride.toLowerCase().includes("invite") ? ctaLabelOverride : "Get event invites + the monthly digest"}` : "Get event invites + the monthly digest"}
            buttonLabel="Get invites"
          />
        </motion.div>

        {/* Secondary actions — refined text links */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.44, ease: easeOut }}
          className="mb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]"
        >
          <Link
            href="/events"
            className="link-refined font-medium text-[#e8e6dc] transition-colors hover:text-[#faf9f5]"
          >
            Browse events
          </Link>
          <span className="text-[#3a3a37]" aria-hidden="true">·</span>
          {(ctaHrefOverride ?? discord) && (
            <a
              href={ctaHrefOverride ?? discord ?? undefined}
              target={ctaHrefOverride ? undefined : "_blank"}
              rel={ctaHrefOverride ? undefined : "noopener noreferrer"}
              className="link-refined font-medium text-[#b0aea5] transition-colors hover:text-[#e8e6dc]"
            >
              {ctaLabelOverride && !ctaLabelOverride.toLowerCase().includes("invite") ? ctaLabelOverride : "Join Discord"}
            </a>
          )}
          <span className="text-[#3a3a37]" aria-hidden="true">·</span>
          <Link
            href="/resources"
            className="link-refined font-medium text-[#b0aea5] transition-colors hover:text-[#e8e6dc]"
          >
            See resources
          </Link>
        </motion.div>

        {/* Trust strip — small caps, restrained */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a7870]"
        >
          <span className="tabular-nums"><AnimatedCounter target={resolvedStats.totalMembers} suffix="+" /> members</span>
          <span className="text-[#3a3a37]">·</span>
          <span>{resolvedStats.citiesActive.join(" & ")}</span>
          <span className="text-[#3a3a37]">·</span>
          <span>Free to join</span>
          <span className="text-[#3a3a37]">·</span>
          <span>Built in the open</span>
        </motion.div>

        {/* Activity feed — refined ticker */}
        {currentItem && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.65, ease: easeOut }}
            className="mx-auto max-w-md"
          >
            <a
              href={currentItem.href}
              className="card-hairline group flex items-center gap-3 rounded-full px-4 py-2.5"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#d97757] shadow-[0_0_8px_rgba(217,119,87,0.6)]" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7870]">
                {currentItem.type === "blog" ? "New post" : currentItem.type === "project" ? "Project" : currentItem.type === "community" ? "Resource" : "Event"}
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-[13px] text-[#e8e6dc] group-hover:text-[#faf9f5] transition-colors">
                {currentItem.title}
              </span>
              <span className="shrink-0 text-[#7a7870] transition-colors group-hover:text-[#d97757]">→</span>
            </a>
            {feed.length > 1 && (
              <div className="mt-3 flex justify-center gap-1">
                {feed.map((_, i) => (
                  <div
                    key={i}
                    className={`h-0.5 rounded-full transition-all duration-300 ${
                      i === currentFeedIndex ? "w-6 bg-[#d97757]" : "w-1 bg-[#2a2a28]"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
