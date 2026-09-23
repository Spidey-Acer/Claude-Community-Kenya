import type { Metadata } from "next";
import { PageBanner } from "@/components/karibu/PageBanner";
import { GuideCard } from "@/components/karibu/GuideCard";
import { KaribuLearnGrid, type LearnCard } from "@/components/karibu/KaribuLearn";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getPublishedGuides } from "@/lib/data";

export const revalidate = 600;

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

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
    href: "/resources/links",
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

      <PageBanner
        image="/images/community/laptops.webp"
        imageAlt="Members building on their laptops at a CCK meetup"
        crumbs={["Home", "Resources"]}
        title="Learn Claude, from your first prompt to production."
        subtitle="Notes, guides and courses from the community, free to download and share."
      />

      <section className={`${WRAP} py-14`} aria-label="Guides and notes">
        <div className="mb-8 max-w-[640px]">
          <h2 className="mb-2 font-newsreader text-[28px] font-normal leading-[1.1] tracking-[-0.01em] text-ink">
            Guides and notes
          </h2>
          <p className="font-inter text-[15px] leading-[1.55] text-ink-soft">
            Written up by the community, from a first afternoon with Claude to running it in production.
          </p>
        </div>

        {guides.length === 0 ? (
          <p className="font-inter text-[14.5px] text-ink-muted">
            Guides land here as we publish them.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Start here">
        <KaribuLearnGrid cards={resourceCards} />
      </section>
    </>
  );
}
