import { MetadataRoute } from "next";
import { getEvents, getBlogPosts, getCommunitySubmissions } from "@/lib/data";

const BASE_URL = "https://www.claudekenya.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, blogPosts, communityData] = await Promise.all([
    getEvents().catch(() => []),
    getBlogPosts().catch(() => []),
    getCommunitySubmissions().catch(() => ({ items: [] })),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/events`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/projects`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/community`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/join`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/resources`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/getting-started`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/claude-code`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/workflows`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/resources/courses`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/resources/links`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/resources/api-guide`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/production-guide`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/speak`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/volunteer`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/submit-idea`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/submit-project`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/community/submit`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/chat`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/merch`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${BASE_URL}/code-of-conduct`, changeFrequency: "yearly", priority: 0.4 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${BASE_URL}/events/${event.slug}`,
    lastModified: event.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const communityRoutes: MetadataRoute.Sitemap = communityData.items.map((item) => ({
    url: `${BASE_URL}/community/${item.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...eventRoutes, ...blogRoutes, ...communityRoutes];
}
