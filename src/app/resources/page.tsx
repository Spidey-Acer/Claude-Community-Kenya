import type { Metadata } from "next";
import { ScrollReveal } from "@/components/terminal";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
import { ResourceCardsGrid, type ResourceCardData } from "./ResourceCardsGrid";

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

const resourceCards: readonly ResourceCardData[] = [
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

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Resources" }]} />
      {/* Header */}
      <ScrollReveal>
        <section className="py-16 text-center">
          <PersonaHeading
            page="resources"
            section="hero"
            as="h1"
            className="text-3xl font-bold text-green-primary sm:text-4xl"
          />
          <PersonaText
            page="resources"
            section="hero"
            field="subtitle"
            className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary"
          />
        </section>
      </ScrollReveal>

      {/* Navigation Cards Grid */}
      <section className="py-12">
        <ResourceCardsGrid cards={resourceCards} />
      </section>
    </main>
  );
}
