"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SOCIAL_LINKS } from "@/lib/constants";
import type { CommunityStats, FeedItem } from "@/components/sections/HeroTerminal";

interface HeroProProps {
  stats?: CommunityStats;
  feed?: FeedItem[];
}

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 100,
  whatsappMembers: 120,
  linkedinMembers: 80,
  totalMembers: 300,
  eventsHeld: 5,
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

export function HeroPro({ stats, feed = [] }: HeroProProps) {
  const resolvedStats = stats ?? DEFAULT_STATS;
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);

  useEffect(() => {
    if (feed.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFeedIndex((prev) => (prev + 1) % feed.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [feed.length]);

  const currentItem = feed[currentFeedIndex];

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden">
      {/* Gradient mesh background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.15), transparent),
              radial-gradient(ellipse 60% 40% at 80% 50%, rgba(59, 130, 246, 0.08), transparent),
              radial-gradient(ellipse 50% 50% at 20% 80%, rgba(168, 85, 247, 0.06), transparent)
            `,
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-4 py-1.5 text-sm text-zinc-300 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Anthropic-supported community
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Claude Community{" "}
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            Kenya
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 sm:text-xl"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          East Africa&apos;s vibrant AI community. Learn, create, and grow with Claude —
          from workshops and meetups to real-world projects.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-16 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href={SOCIAL_LINKS.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-white/10 transition-all duration-200 hover:bg-zinc-100 hover:shadow-white/20"
          >
            Join the Community
            <span aria-hidden="true">→</span>
          </a>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-600 px-7 py-3 text-sm font-semibold text-zinc-200 transition-all duration-200 hover:border-zinc-400 hover:text-white"
          >
            Browse Events
          </Link>
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-7 py-3 text-sm font-semibold text-zinc-400 transition-all duration-200 hover:border-zinc-500 hover:text-zinc-200"
          >
            Resources
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mx-auto flex max-w-lg items-center justify-center gap-8 sm:gap-12"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white sm:text-3xl">
              <AnimatedCounter target={resolvedStats.totalMembers} suffix="+" />
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Members</div>
          </div>
          <div className="h-8 w-px bg-zinc-700" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white sm:text-3xl">
              <AnimatedCounter target={resolvedStats.eventsHeld} />
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Events</div>
          </div>
          <div className="h-8 w-px bg-zinc-700" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white sm:text-3xl">
              {resolvedStats.citiesActive.length}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Cities</div>
          </div>
        </motion.div>

        {/* Activity feed — clean card */}
        {currentItem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mx-auto mt-12 max-w-md"
          >
            <a
              href={currentItem.href}
              className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-3.5 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                <span className="text-xs font-bold uppercase text-zinc-400">
                  {currentItem.type === "blog" ? "B" : currentItem.type === "project" ? "P" : currentItem.type === "community" ? "C" : "E"}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                  {currentItem.title}
                </p>
                <p className="text-xs text-zinc-500">{currentItem.meta}</p>
              </div>
              <span className="shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400">→</span>
            </a>
            {feed.length > 1 && (
              <div className="mt-3 flex justify-center gap-1">
                {feed.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === currentFeedIndex ? "w-5 bg-zinc-400" : "w-1 bg-zinc-700"
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
