"use client";

import { useAudience } from "@/contexts/AudienceContext";
import { useSkin } from "@/contexts/SkinContext";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { HeroTerminal, type FeedItem, type CommunityStats } from "./HeroTerminal";
import { HeroPro } from "./HeroPro";
import type { Audience } from "@/lib/karibu/types";

// ctaHref is a platform key (resolved via useSocialLinks) or a real path/URL.
// Audiences whose CTA points at a social platform fall back to the "/join"
// page if that platform ends up unconfigured with no constant fallback.
const COPY: Record<
  Audience,
  { headline: string; sub: string; ctaLabel: string; ctaHref: string | { social: "discord" | "whatsapp" } }
> = {
  dev: {
    headline: "Kenya's Claude developer community",
    sub: "Build, ship, and learn with Kenya's strongest AI engineers",
    ctaLabel: "Join Discord",
    ctaHref: { social: "discord" },
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
    ctaHref: { social: "whatsapp" },
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
  const socialLinks = useSocialLinks();
  const copy = audience ? COPY[audience] : null;

  // Resolve a social-platform CTA to its live URL; skip personalization
  // entirely (fall through to the component's own default) if that
  // platform has neither a DB value nor a constants fallback configured.
  function resolveCtaHref(ctaHref: string | { social: "discord" | "whatsapp" }): string | null {
    return typeof ctaHref === "string" ? ctaHref : socialLinks[ctaHref.social];
  }
  const resolvedCtaHref = copy ? resolveCtaHref(copy.ctaHref) : null;

  const overrideProps =
    copy && resolvedCtaHref
      ? {
          headlineOverride: copy.headline,
          subOverride: copy.sub,
          ctaLabelOverride: copy.ctaLabel,
          ctaHrefOverride: resolvedCtaHref,
        }
      : {};

  if (skin === "pro") {
    return <HeroPro feed={feedItems} stats={stats} {...overrideProps} />;
  }
  return <HeroTerminal feed={feedItems} stats={stats} {...overrideProps} />;
}
