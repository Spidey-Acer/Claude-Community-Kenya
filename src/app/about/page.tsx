import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getTeamMembers, getEvents } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import type { CommunityStats } from "@/components/sections/HeroTerminal";
import { KaribuAbout } from "@/components/karibu/KaribuAbout";

function formatTimelineDate(iso: string): string {
  // iso comes in as YYYY-MM-DD (already mapped by getEvents)
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortHash(slug: string): string {
  // Stable 7-char "commit-like" hash from slug
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(7, "0").slice(0, 7);
}

export const metadata: Metadata = {
  title: "About | Claude Community Kenya",
  description:
    "Kenya's independent, volunteer-run Claude community. Developers, creators, researchers, and professionals using Claude AI across Kenya.",
  alternates: {
    canonical: "https://www.claudekenya.org/about",
  },
  openGraph: {
    title: "About | Claude Community Kenya",
    description:
      "Kenya's independent, volunteer-run Claude developer community. Anthropic-supported meetups, workshops, and builders across Kenya.",
    url: "https://www.claudekenya.org/about",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 100,
  whatsappMembers: 120,
  linkedinMembers: 80,
  totalMembers: 300,
  eventsHeld: 2,
  citiesActive: ["Nairobi", "Mombasa"],
  resourceCount: 33,
};

export const revalidate = 3600;

export default async function AboutPage() {
  const [team, siteSettings, allEvents] = await Promise.all([
    getTeamMembers().catch(() => []),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    getEvents().catch(() => []),
  ]);

  // Timeline = past events, oldest first. Source of truth: admin-managed DB.
  const timelineEntries = allEvents
    .filter((e) => e.status === "completed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: formatTimelineDate(e.date),
      title: e.title,
      description: e.description,
      hash: shortHash(e.slug),
    }));

  const stats: CommunityStats = siteSettings
    ? {
        discordMembers: siteSettings.discordMembers,
        whatsappMembers: siteSettings.whatsappMembers,
        linkedinMembers: siteSettings.linkedinMembers,
        totalMembers:
          siteSettings.discordMembers +
          siteSettings.whatsappMembers +
          siteSettings.linkedinMembers,
        eventsHeld: siteSettings.eventsHeld,
        citiesActive: Array.isArray(siteSettings.citiesActive)
          ? (siteSettings.citiesActive as string[])
          : (JSON.parse(siteSettings.citiesActive as string) as string[]),
        resourceCount: siteSettings.resourceCount,
      }
    : DEFAULT_STATS;

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "About" }]} />
      <KaribuAbout stats={stats} team={team} timelineEntries={timelineEntries} />
    </>
  );
}
