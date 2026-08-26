import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { KaribuLearn, type LearnCard } from "@/components/karibu/KaribuLearn";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Master Claude Code, the Claude API, and AI workflows. Free tutorials, courses, and learning paths curated for Kenyan developers.",
  alternates: {
    canonical: "https://www.claudekenya.org/resources",
  },
  openGraph: {
    title: "Resources",
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

export default function ResourcesPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Resources" }]} />
      <KaribuLearn cards={resourceCards} />
    </>
  );
}
