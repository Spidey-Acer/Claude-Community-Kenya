import type { Metadata } from "next";
import { KaribuHome } from "@/components/karibu/KaribuHome";
import { getUpcomingEvents, getBlogPosts, getFeaturedProjects, getProjectOfTheWeek } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { ensureVisitorId, getAudienceCookie } from "@/lib/karibu/cookies";
import type { AudienceState } from "@/contexts/AudienceContext";
import type { Recommendable } from "@/lib/recommendations";

export const metadata: Metadata = {
  title: "Claude Community Kenya — Build with Claude AI",
  description:
    "Kenya's independent, volunteer-run Claude developer community. Join meetups, workshops, and build with Claude AI.",
  openGraph: {
    title: "Claude Community Kenya — Build with Claude AI",
    description:
      "Kenya's independent, volunteer-run Claude developer community. Join meetups, workshops, and build with Claude AI.",
    url: "https://www.claudekenya.org",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya — Build with Claude AI",
    description:
      "Kenya's independent, volunteer-run Claude developer community. Join meetups, workshops, and build with Claude AI.",
  },
};


export const revalidate = 3600;

export default async function Home() {
  const [upcomingEvents, siteSettings, blogPosts, featuredProjects, projectOfTheWeek] = await Promise.all([
    getUpcomingEvents().catch(() => []),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    getBlogPosts().catch(() => []),
    getFeaturedProjects().catch(() => []),
    getProjectOfTheWeek().catch(() => null),
  ]);

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
    <KaribuHome
      communityStats={communityStats}
      upcomingEvents={upcomingEvents}
      audienceState={audienceState}
      recommendables={recommendables}
      featuredProjects={featuredProjects}
      projectOfTheWeek={projectOfTheWeek}
    />
  );
}
