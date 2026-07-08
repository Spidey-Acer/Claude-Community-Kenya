import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG } from "@/lib/constants";
import { getBlogPosts } from "@/lib/data";
import { KaribuBlog } from "@/components/karibu/KaribuBlog";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Blog | ${SITE_CONFIG.name}`,
  description:
    "Claude Code tutorials, meetup recaps, and developer insights from Kenya's Claude community. Learn to build with Claude in Africa.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/blog`,
  },
  openGraph: {
    title: `Blog | ${SITE_CONFIG.name}`,
    description:
      "Claude Code tutorials, meetup recaps, and developer insights from Kenya's Claude community. Learn to build with Claude in Africa.",
    url: `${SITE_CONFIG.url}/blog`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getBlogPosts().catch(() => []);

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Blog" }]} />
      <KaribuBlog posts={posts} />
    </>
  );
}
