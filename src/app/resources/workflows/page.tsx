import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { Masthead } from "@/components/karibu/kit";
import { GuideBlock } from "@/components/karibu/GuideBlock";

export const metadata: Metadata = {
  title: "Advanced Workflows | Claude Community Kenya",
  description:
    "Agentic development patterns, plan mode, git worktrees, and production strategies for building with Claude Code.",
  alternates: {
    canonical: "https://www.claudekenya.org/resources/workflows",
  },
  openGraph: {
    title: "Advanced Workflows | Claude Community Kenya",
    description:
      "Agentic development patterns, plan mode, git worktrees, and production strategies for building with Claude Code.",
    url: "https://www.claudekenya.org/resources/workflows",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

export default function WorkflowsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      {/* Back link */}
      <Link
        href="/resources"
        className="inline-flex items-center gap-2 font-mono text-sm text-ink-muted transition-colors hover:text-clay"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources
      </Link>

      {/* Header */}
      <Reveal>
        <section className="py-16">
          <Masthead eyebrow="Resources" title="Advanced Workflows" lead="Advanced strategies for getting more done with Claude." flush />
        </section>
      </Reveal>

      {/* Agentic Development Patterns */}
      <Reveal index={0}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Agentic Development</h2>
        <GuideBlock title="agentic-patterns.md" variant="default">
          <h3 className="font-mono text-lg font-bold text-clay-dark">
            # Agentic Development Patterns
          </h3>
          <div className="mt-4 space-y-3 text-ink-soft">
            <p>
              Agentic development is a paradigm where Claude Code operates as an{" "}
              <span className="text-clay">autonomous agent</span> that
              can read your entire codebase, understand architecture, plan
              changes, and execute them — all with minimal guidance.
            </p>
            <p>
              Unlike traditional autocomplete or chat-based coding assistants,
              an agentic workflow means Claude takes initiative: it explores
              files, identifies patterns, proposes solutions, and implements
              them across multiple files simultaneously.
            </p>
          </div>

          <div className="mt-6 border-t border-sand pt-4">
            <h4 className="font-mono text-sm font-bold text-ink-soft">
              Tips for Effective Agentic Use:
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-clay">1.</span>
                <span>
                  <span className="text-ink">Write a thorough CLAUDE.md</span>{" "}
                  — The more context Claude has about your project, the better
                  its autonomous decisions will be.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-clay">2.</span>
                <span>
                  <span className="text-ink">Start with plan mode</span>{" "}
                  — For complex tasks, let Claude analyze first before making
                  changes. Use <code className="text-ink-soft">claude --plan</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-clay">3.</span>
                <span>
                  <span className="text-ink">Be specific about constraints</span>{" "}
                  — Tell Claude what NOT to change. Boundaries lead to better
                  results.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-clay">4.</span>
                <span>
                  <span className="text-ink">Use git as your safety net</span>{" "}
                  — Commit before major changes. You can always roll back.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-clay">5.</span>
                <span>
                  <span className="text-ink">Review changes incrementally</span>{" "}
                  — Check diffs after each task rather than at the end of a long
                  session.
                </span>
              </li>
            </ul>
          </div>
        </GuideBlock>
      </section>
      </Reveal>

      {/* Plan Mode */}
      <Reveal index={1}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Plan Mode</h2>
        <GuideBlock title="plan-mode-example" variant="code">
          <div className="space-y-1">
            <p className="text-clay">$ claude --plan</p>
            <p className="mt-2 text-clay-dark">
              &gt; I need to add user authentication to this Next.js app.
            </p>
            <p className="text-clay-dark">
              &gt; Please analyze the codebase and propose an approach.
            </p>
            <p className="mt-4 text-ink-muted">Claude will:</p>
            <div className="ml-2 space-y-1">
              <p className="text-ink-soft">
                <span className="text-clay">1.</span> Read your project
                structure
              </p>
              <p className="text-ink-soft">
                <span className="text-clay">2.</span> Identify existing
                patterns
              </p>
              <p className="text-ink-soft">
                <span className="text-clay">3.</span> Propose
                implementation steps
              </p>
              <p className="text-ink-soft">
                <span className="text-clay">4.</span> Wait for your
                approval
              </p>
              <p className="text-ink-soft">
                <span className="text-clay">5.</span> Execute the plan
              </p>
            </div>
          </div>
        </GuideBlock>

        <div className="mt-6 border border-sand bg-paper-card p-4">
          <p className="font-mono text-sm text-clay-dark">WHY PLAN MODE?</p>
          <p className="mt-2 text-sm text-ink-soft">
            Plan mode is essential for tasks that touch multiple files or require
            architectural decisions. It prevents Claude from making premature
            changes and gives you a chance to steer the approach before any code
            is written. Think of it as a design review with your AI collaborator.
          </p>
        </div>
      </section>
      </Reveal>

      {/* Git Worktree Strategy */}
      <Reveal index={2}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Parallel Workflows</h2>
        <GuideBlock title="git-worktree-strategy" variant="default">
          <div className="space-y-3 text-ink-soft">
            <p>
              Git worktrees let you check out multiple branches simultaneously
              in different directories. Combined with Claude Code, this enables{" "}
              <span className="text-clay">
                true parallel development
              </span>{" "}
              — working on multiple features at the same time, each with its own
              Claude session.
            </p>
          </div>
        </GuideBlock>

        <div className="mt-6">
          <GuideBlock title="worktree-setup.sh" variant="code">
            <div className="space-y-1">
              <p className="text-ink-muted">
                # Create worktrees for parallel development
              </p>
              <p className="text-clay">
                git worktree add ../project-feature-a feature-a
              </p>
              <p className="text-clay">
                git worktree add ../project-feature-b feature-b
              </p>
              <p className="mt-4 text-ink-muted">
                # Run Claude in each worktree
              </p>
              <p className="text-clay">
                cd ../project-feature-a &amp;&amp; claude
              </p>
              <p className="text-clay">
                cd ../project-feature-b &amp;&amp; claude
              </p>
            </div>
          </GuideBlock>
        </div>

        <div className="mt-6 border border-sand bg-paper-card p-4">
          <p className="font-mono text-sm text-clay-dark">WORKFLOW:</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>
              <span className="font-mono text-clay">worktree-a/</span>{" "}
              — Claude builds the auth system
            </li>
            <li>
              <span className="font-mono text-clay">worktree-b/</span>{" "}
              — Claude builds the dashboard UI
            </li>
            <li>
              <span className="font-mono text-clay">main/</span>{" "}
              — You review and merge completed work
            </li>
          </ul>
        </div>
      </section>
      </Reveal>

    </main>
  );
}
