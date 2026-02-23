import type { Metadata } from "next";
import { getSortedBlogPosts } from "@/data/blog-posts";
import { BlogPostCard } from "@/components/sections/BlogPostCard";
import { ScrollReveal, CommandPrefix } from "@/components/terminal";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Blog | ${SITE_CONFIG.name}`,
  description:
    "Claude Code tutorials, meetup recaps, and developer insights from Kenya's Claude community. Learn to build with Claude in East Africa.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/blog`,
  },
  openGraph: {
    title: `Blog | ${SITE_CONFIG.name}`,
    description:
      "Claude Code tutorials, meetup recaps, and developer insights from Kenya's Claude community. Learn to build with Claude in East Africa.",
    url: `${SITE_CONFIG.url}/blog`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function BlogPage() {
  const posts = getSortedBlogPosts();

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Blog" }]} />
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <ScrollReveal>
          <section className="mb-12">
            <h1 className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl">
              <CommandPrefix />
              tail -f community.log
            </h1>
            <p className="max-w-2xl font-sans text-lg text-text-secondary">
              Updates, recaps, and thoughts from the community.
            </p>
          </section>
        </ScrollReveal>

        {/* Blog posts grid */}
        <ScrollReveal
          stagger={100}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </ScrollReveal>
      </div>
    </main>
  );
}
