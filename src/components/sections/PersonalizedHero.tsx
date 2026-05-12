"use client";

import { useAudience } from "@/contexts/AudienceContext";
import { useSkin } from "@/contexts/SkinContext";
import { HeroTerminal, type FeedItem, type CommunityStats } from "./HeroTerminal";
import { HeroPro } from "./HeroPro";
import type { Audience } from "@/lib/karibu/types";

const COPY: Record<
  Audience,
  { headline: string; sub: string; ctaLabel: string; ctaHref: string }
> = {
  dev: {
    headline: "Africa's only Claude developer community",
    sub: "Build, ship, and learn with Kenya's strongest AI engineers",
    ctaLabel: "Join Discord",
    ctaHref: "https://discord.gg/CkD9QWjsHm",
  },
  non_tech_pro: {
    headline: "AI for the work you actually do",
    sub: "Learn Claude with marketers, lawyers, and ops folks like you",
    ctaLabel: "Browse non-tech meetups",
    ctaHref: "/events",
  },
  student: {
    headline: "Start your AI journey with us",
    sub: "Free meetups, study groups, mentorship — built for Kenyan students",
    ctaLabel: "Join WhatsApp",
    ctaHref: "https://chat.whatsapp.com/Hpx42q1ADsrFNN3hHtZcQa",
  },
  founder: {
    headline: "Build your AI company in Nairobi",
    sub: "Connect with founders, investors, and builders shipping with Claude",
    ctaLabel: "Founder events",
    ctaHref: "/events?audience=founder",
  },
  creator: {
    headline: "Tell better stories with Claude",
    sub: "Writers, journalists, teachers using AI to amplify their work",
    ctaLabel: "Creator track",
    ctaHref: "/resources",
  },
};

interface PersonalizedHeroProps {
  feedItems?: FeedItem[];
  stats?: CommunityStats;
}

/**
 * Renders the audience-personalized homepage hero.
 *
 * Picks copy from a 5-audience map and forwards overrides to the existing
 * HeroTerminal or HeroPro component, depending on which Skin is active.
 * If no audience is set (anonymous, skipped, or feature flag off), the
 * underlying components fall back to their default copy.
 */
export function PersonalizedHero({ feedItems = [], stats }: PersonalizedHeroProps) {
  const { audience } = useAudience();
  const { skin } = useSkin();
  const copy = audience ? COPY[audience] : null;

  const overrideProps = copy
    ? {
        headlineOverride: copy.headline,
        subOverride: copy.sub,
        ctaLabelOverride: copy.ctaLabel,
        ctaHrefOverride: copy.ctaHref,
      }
    : {};

  if (skin === "pro") {
    return <HeroPro feed={feedItems} stats={stats} {...overrideProps} />;
  }
  return <HeroTerminal feed={feedItems} stats={stats} {...overrideProps} />;
}
