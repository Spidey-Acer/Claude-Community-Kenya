import type { Metadata } from "next";
import type { FeedItem } from "@/components/sections/HeroTerminal";
import { HomeContent } from "@/components/sections/HomeContent";
import { getUpcomingEvents, getFeaturedProjects, getBlogPosts, getCommunitySubmissions } from "@/lib/data";
import { prisma } from "@/lib/prisma";

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
  const [upcomingEvents, featuredProjects, siteSettings, blogPosts, communityData] = await Promise.all([
    getUpcomingEvents().catch(() => []),
    getFeaturedProjects().catch(() => []),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    getBlogPosts().catch(() => []),
    getCommunitySubmissions({ limit: 5, sort: "recent" }).catch(() => ({ items: [], total: 0 })),
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

  return (
    <HomeContent
      communityStats={communityStats}
      feedItems={feedItems}
      upcomingEvents={upcomingEvents}
      featuredProjects={featuredProjects}
    />
  );
}
