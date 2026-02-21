import { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog-posts";
import { events } from "@/data/events";

const BASE_URL = "https://www.claudekenya.org";
const LAST_MOD = "2026-02-21";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: LAST_MOD, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/events`, lastModified: LAST_MOD, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/resources`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/getting-started`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/claude-code`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/workflows`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/resources/courses`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/resources/links`, lastModified: LAST_MOD, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/resources/api-guide`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/production-guide`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/projects`, lastModified: LAST_MOD, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: LAST_MOD, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/join`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/faq`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/ambassador`, lastModified: LAST_MOD, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/code-of-conduct`, lastModified: LAST_MOD, changeFrequency: "yearly", priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${BASE_URL}/events/${event.slug}`,
    lastModified: event.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes, ...eventRoutes];
}
