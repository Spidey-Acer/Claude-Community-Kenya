import type { Metadata } from "next";
import type { FeedItem } from "@/components/sections/HeroTerminal";
import { HomeContent } from "@/components/sections/HomeContent";
import { getUpcomingEvents, getFeaturedProjects, getBlogPosts, getCommunitySubmissions, getProjectOfTheWeek } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { ensureVisitorId, getAudienceCookie } from "@/lib/karibu/cookies";
import type { AudienceState } from "@/contexts/AudienceContext";
import type { Recommendable } from "@/lib/recommendations";

export const metadata: Metadata = {
  title: "Claude Community Kenya | Africa's Only Claude Developer Community",
  description:
    "Africa's only Anthropic-supported Claude developer community. Join meetups, workshops, and build with Claude AI.",
  openGraph: {
    title: "Claude Community Kenya | Africa's Only Claude Developer Community",
    description:
      "Africa's only Anthropic-supported Claude developer community. Join meetups, workshops, and build with Claude AI.",
    url: "https://www.claudekenya.org",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya | Africa's Only Claude Developer Community",
    description:
      "Africa's only Anthropic-supported Claude developer community. Join meetups, workshops, and build with Claude AI.",
  },
};


export const revalidate = 3600;

export default async function Home() {
  const [upcomingEvents, featuredProjects, siteSettings, blogPosts, communityData, projectOfTheWeek] = await Promise.all([
    getUpcomingEvents().catch(() => []),
    getFeaturedProjects().catch(() => []),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    getBlogPosts().catch(() => []),
    getCommunitySubmissions({ limit: 5, sort: "recent" }).catch(() => ({ items: [], total: 0 })),
    getProjectOfTheWeek().catch(() => null),
  ]);

  // Build activity feed for hero terminal — interleave blogs, community, projects
  const feedItems: FeedItem[] = [];
  for (const post of blogPosts.slice(0, 3)) {
    feedItems.push({
      type: "blog",
      label: "BLOG",
      title: post.title,
      meta: `by ${post.author} · ${post.readingTime} min read`,
      href: `/blog/${post.slug}`,
    });
  }
  for (const item of communityData.items.slice(0, 3)) {
    feedItems.push({
      type: "community",
      label: item.type,
      title: item.title,
      meta: item.submitterName ? `shared by ${item.submitterName}` : item.shortDescription.slice(0, 60),
      href: `/community/${item.slug}`,
    });
  }
  for (const project of featuredProjects.slice(0, 2)) {
    feedItems.push({
      type: "project",
      label: "PROJECT",
      title: project.name,
      meta: `by ${project.builder} · ${project.stack.slice(0, 3).join(", ")}`,
      href: "/projects",
    });
  }

  const communityStats = siteSettings
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
    : undefined;

  // ─── Audience personalisation ────────────────────────────────────────────
  const visitorId = await ensureVisitorId();
  const audienceCookie = await getAudienceCookie();

  let audienceState: AudienceState = {
    audience: null,
    intent: null,
    experience: null,
    name: null,
    city: null,
    language: null,
  };

  if (audienceCookie && audienceCookie !== "skipped") {
    const session = await prisma.onboardingSession.findUnique({
      where: { cookieId: visitorId },
      select: {
        audience: true,
        intent: true,
        experience: true,
        name: true,
        city: true,
        language: true,
      },
    }).catch(() => null);
    if (session) {
      audienceState = {
        audience: session.audience,
        intent: session.intent,
        experience: session.experience,
        name: session.name,
        city: session.city,
        language: session.language,
      };
    }
  }

  // Build recommendables from already-fetched events and blog posts.
  const recommendables: Recommendable[] = [
    ...upcomingEvents.map((e) => ({
      id: e.slug,
      type: "event" as const,
      title: e.title,
      audiences: (e.audiences ?? []) as import("@/lib/karibu/types").Audience[],
      intents: (e.intents ?? []) as import("@/lib/karibu/types").Intent[],
      city: e.city ?? null,
      date: e.date ? new Date(e.date) : null,
      featured: e.featured ?? false,
    })),
    ...blogPosts.map((p) => ({
      id: p.slug,
      type: "resource" as const,
      title: p.title,
      audiences: (p.audiences ?? []) as import("@/lib/karibu/types").Audience[],
      intents: (p.intents ?? []) as import("@/lib/karibu/types").Intent[],
      city: null,
      date: null,
      featured: p.featured,
    })),
  ];

  return (
    <HomeContent
      communityStats={communityStats}
      feedItems={feedItems}
      upcomingEvents={upcomingEvents}
      featuredProjects={featuredProjects}
      audienceState={audienceState}
      recommendables={recommendables}
      projectOfTheWeek={projectOfTheWeek}
    />
  );
}
