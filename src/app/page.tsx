import type { Metadata } from "next";
import { KaribuHome } from "@/components/karibu/KaribuHome";
import { getUpcomingEvents, getLatestPastEvent, getProjects, getProjectOfTheWeek } from "@/lib/data";
import { prisma } from "@/lib/prisma";

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
  const [upcomingEvents, latestPastEvent, siteSettings, featuredProjects, projectOfTheWeek] = await Promise.all([
    getUpcomingEvents().catch(() => []),
    getLatestPastEvent().catch(() => null),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    getProjects().catch(() => []),
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

  return (
    <KaribuHome
      communityStats={communityStats}
      upcomingEvents={upcomingEvents}
      latestPastEvent={latestPastEvent}
      featuredProjects={featuredProjects}
      projectOfTheWeek={projectOfTheWeek}
    />
  );
}
