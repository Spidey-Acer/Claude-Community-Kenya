import { MetadataRoute } from "next";
import { getEvents, getBlogPosts, getCommunitySubmissions, getGalleryPhotos, getNewsletterIssues, getTeamMemberSlugs } from "@/lib/data";
import { getShowcasePosts } from "@/lib/showcase/queries";

const BASE_URL = "https://www.claudekenya.org";

/** Upper bound per collection. Sitemaps allow 50,000 URLs; this is well under. */
const SITEMAP_MAX_ITEMS = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, blogPosts, communityData, galleryPhotos, newsletterIssues, teamSlugs, showcaseData] = await Promise.all([
    getEvents().catch(() => []),
    getBlogPosts().catch(() => []),
    // Same trap as the showcase line below: the query defaults to one feed
    // page (FEED_PAGE_SIZE), which would silently cap the sitemap at 20.
    getCommunitySubmissions({ limit: SITEMAP_MAX_ITEMS }).catch(() => ({ items: [] })),
    getGalleryPhotos({ limit: 1 }).catch(() => [] as { id: string }[]),
    getNewsletterIssues().catch(() => []),
    getTeamMemberSlugs().catch(() => [] as string[]),
    // Explicit limit: the default page size is 20, which would silently cap
    // the sitemap at the first 20 posts however many exist.
    getShowcasePosts({ limit: SITEMAP_MAX_ITEMS }).catch(() => ({ items: [], total: 0 })),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/events`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/projects`, changeFrequency: "weekly", priority: 0.8 },
    // Only list /gallery if there are photos — otherwise it's a thin page.
    ...(galleryPhotos.length > 0
      ? [{ url: `${BASE_URL}/gallery`, changeFrequency: "weekly" as const, priority: 0.7 }]
      : []),
    { url: `${BASE_URL}/community`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/showcase`, changeFrequency: "weekly", priority: 0.8 },
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
    { url: `${BASE_URL}/showcase/submit`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/chat`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/merch`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/newsletter`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/team`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/code-of-conduct`, changeFrequency: "yearly", priority: 0.4 },
    // NOTE: /login, /forgot-password, /reset-password, /verify-email,
    // /account/* deliberately omitted — auth/account pages should not be
    // indexed; the corresponding pages also export `robots: { index: false }`.
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

  const showcaseRoutes: MetadataRoute.Sitemap = showcaseData.items.map((post) => ({
    url: `${BASE_URL}/showcase/${post.slug}`,
    lastModified: post.lastActivityAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const newsletterRoutes: MetadataRoute.Sitemap = newsletterIssues.map((issue) => ({
    url: `${BASE_URL}/newsletter/${issue.slug}`,
    lastModified: issue.publishedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const teamRoutes: MetadataRoute.Sitemap = teamSlugs.map((slug) => ({
    url: `${BASE_URL}/team/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...eventRoutes, ...blogRoutes, ...communityRoutes, ...showcaseRoutes, ...newsletterRoutes, ...teamRoutes];
}
