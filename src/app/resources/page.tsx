import type { Metadata } from "next";
import Image from "next/image";
import { EmptyState, Masthead, Section } from "@/components/karibu/kit";
import { GuideCard } from "@/components/karibu/GuideCard";
import { KaribuLearnGrid, type LearnCard } from "@/components/karibu/KaribuLearn";
import { ResourceLinks } from "@/components/karibu/ResourceLinks";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getPublishedGuides } from "@/lib/data";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Resources | Claude Community Kenya",
  description:
    "Master Claude Code, the Claude API, and AI workflows. Free tutorials, courses, and learning paths curated for Kenyan developers.",
  alternates: {
    canonical: "https://www.claudekenya.org/resources",
  },
  openGraph: {
    title: "Resources | Claude Community Kenya",
    description:
      "Master Claude Code, the Claude API, and AI workflows. Free tutorials, courses, and learning paths curated for Kenyan developers.",
    url: "https://www.claudekenya.org/resources",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const resourceCards: readonly LearnCard[] = [
  {
    title: "Getting Started",
    href: "/resources/getting-started",
    icon: "rocket",
    description:
      "New to Claude? Start here. Learn what Claude is and how to begin.",
  },
  {
    title: "Claude Code",
    href: "/resources/claude-code",
    icon: "terminal",
    description:
      "Master the CLI tool that's changing how developers build software.",
  },
  {
    title: "Advanced Workflows",
    href: "/resources/workflows",
    icon: "git-branch",
    description:
      "Agentic patterns, plan mode, git worktrees, and production strategies.",
  },
  {
    title: "Courses & Learning Paths",
    href: "/resources/courses",
    icon: "graduation",
    description:
      "Free structured courses from Anthropic — from API basics to advanced tool use.",
  },
  {
    title: "Claude API Guide",
    href: "/resources/api-guide",
    icon: "code",
    description:
      "Complete API reference — authentication, models, streaming, tool use, and code examples.",
  },
  {
    title: "Production Guide",
    href: "/resources/production-guide",
    icon: "zap",
    description:
      "Deploy Claude to production — error handling, rate limits, cost optimization, and security.",
  },
  {
    title: "Curated Links",
    href: "/resources#links",
    icon: "link",
    description:
      "A comprehensive directory of resources, tools, and communities.",
  },
];

export default async function ResourcesPage() {
  // DB is unreachable at build time in some environments (see sitemap.ts and
  // blog/[slug]/page.tsx for the same guard) — an empty guides list degrades
  // to the section's empty state rather than failing the build.
  const guides = await getPublishedGuides().catch(() => []);

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Resources" }]} />

      <Masthead
        eyebrow="Resources"
        title="Learn Claude, from your first prompt to production."
        lead="Notes, guides and courses from the community, free to download and share."
        media={
          <Image
            src="/images/community/laptops.webp"
            alt="Members building on their laptops at a CCK meetup"
            fill
            priority
            sizes="(min-width: 1024px) 440px, 100vw"
            className="object-cover"
          />
        }
      />

      <Section
        id="guides"
        eyebrow="Guides"
        title="Guides and notes"
        lead="Written up by the community, from a first afternoon with Claude to running it in production."
      >
        {guides.length === 0 ? (
          <EmptyState title="Nothing here yet." body="Guides land here as we publish them." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        )}
      </Section>

      <section aria-label="Start here">
        <KaribuLearnGrid cards={resourceCards} />
      </section>

      <ResourceLinks />
    </>
  );
}
