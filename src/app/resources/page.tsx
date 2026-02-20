import type { Metadata } from "next";
import Link from "next/link";
import { Rocket, Terminal, GitBranch, Link as LinkIcon, GraduationCap } from "lucide-react";
import { ScrollReveal, CommandPrefix } from "@/components/terminal";

export const metadata: Metadata = {
  title: "Resources | Claude Community Kenya",
  description:
    "Everything you need to start building with Claude. Guides, tutorials, tools, and curated links for the Kenyan developer community.",
};

const resourceCards = [
  {
    title: "Getting Started",
    href: "/resources/getting-started",
    icon: Rocket,
    description:
      "New to Claude? Start here. Learn what Claude is and how to begin.",
  },
  {
    title: "Claude Code",
    href: "/resources/claude-code",
    icon: Terminal,
    description:
      "Master the CLI tool that's changing how developers build software.",
  },
  {
    title: "Advanced Workflows",
    href: "/resources/workflows",
    icon: GitBranch,
    description:
      "Agentic patterns, plan mode, git worktrees, and production strategies.",
  },
  {
    title: "Courses & Learning Paths",
    href: "/resources/courses",
    icon: GraduationCap,
    description:
      "Free structured courses from Anthropic — from API basics to advanced tool use.",
  },
  {
    title: "Curated Links",
    href: "/resources/links",
    icon: LinkIcon,
    description:
      "A comprehensive directory of resources, tools, and communities.",
  },
] as const;

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      {/* Header */}
      <ScrollReveal>
        <section className="py-16 text-center">
          <h1 className="font-mono text-3xl font-bold text-green-primary sm:text-4xl">
            <CommandPrefix symbol="$" />
            man claude --resources
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
            Everything you need to start building with Claude
          </p>
        </section>
      </ScrollReveal>

      {/* Navigation Cards Grid */}
      <section className="py-12">
        <ScrollReveal
          stagger={100}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {resourceCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group block border border-border-default bg-bg-card transition-all duration-300 hover:-translate-y-1 hover:border-border-hover hover:shadow-[0_0_20px_rgba(0,255,65,0.1)]"
              >
                {/* Card title bar */}
                <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
                  </div>
                  <span className="ml-2 font-mono text-xs text-text-dim">
                    {card.href}
                  </span>
                </div>

                {/* Card content */}
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border border-border-default bg-bg-elevated transition-colors duration-300 group-hover:border-green-primary/30 group-hover:bg-green-primary/10">
                      <Icon className="h-5 w-5 text-green-primary transition-colors duration-300 group-hover:text-amber" />
                    </div>
                    <h2 className="font-mono text-lg font-bold text-text-primary transition-colors duration-300 group-hover:text-green-primary">
                      {card.title}
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {card.description}
                  </p>
                  <div className="mt-4 font-mono text-xs text-green-dim opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    cd {card.href} &amp;&amp; cat README.md
                  </div>
                </div>
              </Link>
            );
          })}
        </ScrollReveal>
      </section>
    </main>
  );
}
