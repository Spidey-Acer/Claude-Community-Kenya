import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TerminalWindow, CommandPrefix, ScrollReveal } from "@/components/terminal";

export const metadata: Metadata = {
  title: "Advanced Workflows | Claude Community Kenya",
  description:
    "Agentic development patterns, plan mode, git worktrees, and production strategies for building with Claude Code.",
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
        className="inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources
      </Link>

      {/* Header */}
      <ScrollReveal>
        <section className="py-16">
          <h1 className="font-mono text-3xl font-bold text-green-primary sm:text-4xl">
            <CommandPrefix symbol="$" />
            cat advanced-workflows.md
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text-secondary">
            Level up your development with agentic patterns, parallel workflows,
            and production-grade strategies.
          </p>
        </section>
      </ScrollReveal>

      {/* Agentic Development Patterns */}
      <ScrollReveal delay={100}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          explain --agentic-development
        </h2>
        <TerminalWindow title="agentic-patterns.md" variant="default">
          <h3 className="font-mono text-lg font-bold text-amber">
            # Agentic Development Patterns
          </h3>
          <div className="mt-4 space-y-3 text-text-secondary">
            <p>
              Agentic development is a paradigm where Claude Code operates as an{" "}
              <span className="text-green-primary">autonomous agent</span> that
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

          <div className="mt-6 border-t border-border-default pt-4">
            <h4 className="font-mono text-sm font-bold text-cyan">
              Tips for Effective Agentic Use:
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-primary">1.</span>
                <span>
                  <span className="text-text-primary">Write a thorough CLAUDE.md</span>{" "}
                  — The more context Claude has about your project, the better
                  its autonomous decisions will be.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-primary">2.</span>
                <span>
                  <span className="text-text-primary">Start with plan mode</span>{" "}
                  — For complex tasks, let Claude analyze first before making
                  changes. Use <code className="text-cyan">claude --plan</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-primary">3.</span>
                <span>
                  <span className="text-text-primary">Be specific about constraints</span>{" "}
                  — Tell Claude what NOT to change. Boundaries lead to better
                  results.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-primary">4.</span>
                <span>
                  <span className="text-text-primary">Use git as your safety net</span>{" "}
                  — Commit before major changes. You can always roll back.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-primary">5.</span>
                <span>
                  <span className="text-text-primary">Review changes incrementally</span>{" "}
                  — Check diffs after each task rather than at the end of a long
                  session.
                </span>
              </li>
            </ul>
          </div>
        </TerminalWindow>
      </section>
      </ScrollReveal>

      {/* Plan Mode */}
      <ScrollReveal delay={200}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          claude --plan
        </h2>
        <TerminalWindow title="plan-mode-example" variant="code">
          <div className="space-y-1">
            <p className="text-green-primary">$ claude --plan</p>
            <p className="mt-2 text-amber">
              &gt; I need to add user authentication to this Next.js app.
            </p>
            <p className="text-amber">
              &gt; Please analyze the codebase and propose an approach.
            </p>
            <p className="mt-4 text-text-dim">Claude will:</p>
            <div className="ml-2 space-y-1">
              <p className="text-text-secondary">
                <span className="text-green-primary">1.</span> Read your project
                structure
              </p>
              <p className="text-text-secondary">
                <span className="text-green-primary">2.</span> Identify existing
                patterns
              </p>
              <p className="text-text-secondary">
                <span className="text-green-primary">3.</span> Propose
                implementation steps
              </p>
              <p className="text-text-secondary">
                <span className="text-green-primary">4.</span> Wait for your
                approval
              </p>
              <p className="text-text-secondary">
                <span className="text-green-primary">5.</span> Execute the plan
              </p>
            </div>
          </div>
        </TerminalWindow>

        <div className="mt-6 border border-border-default bg-bg-card p-4">
          <p className="font-mono text-sm text-amber">WHY PLAN MODE?</p>
          <p className="mt-2 text-sm text-text-secondary">
            Plan mode is essential for tasks that touch multiple files or require
            architectural decisions. It prevents Claude from making premature
            changes and gives you a chance to steer the approach before any code
            is written. Think of it as a design review with your AI collaborator.
          </p>
        </div>
      </section>
      </ScrollReveal>

      {/* Git Worktree Strategy */}
      <ScrollReveal delay={300}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          git worktree --strategy
        </h2>
        <TerminalWindow title="git-worktree-strategy" variant="default">
          <div className="space-y-3 text-text-secondary">
            <p>
              Git worktrees let you check out multiple branches simultaneously
              in different directories. Combined with Claude Code, this enables{" "}
              <span className="text-green-primary">
                true parallel development
              </span>{" "}
              — working on multiple features at the same time, each with its own
              Claude session.
            </p>
          </div>
        </TerminalWindow>

        <div className="mt-6">
          <TerminalWindow title="worktree-setup.sh" variant="code">
            <div className="space-y-1">
              <p className="text-text-dim">
                # Create worktrees for parallel development
              </p>
              <p className="text-green-primary">
                git worktree add ../project-feature-a feature-a
              </p>
              <p className="text-green-primary">
                git worktree add ../project-feature-b feature-b
              </p>
              <p className="mt-4 text-text-dim">
                # Run Claude in each worktree
              </p>
              <p className="text-green-primary">
                cd ../project-feature-a &amp;&amp; claude
              </p>
              <p className="text-green-primary">
                cd ../project-feature-b &amp;&amp; claude
              </p>
            </div>
          </TerminalWindow>
        </div>

        <div className="mt-6 border border-border-default bg-bg-card p-4">
          <p className="font-mono text-sm text-amber">WORKFLOW:</p>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            <li>
              <span className="font-mono text-green-primary">worktree-a/</span>{" "}
              — Claude builds the auth system
            </li>
            <li>
              <span className="font-mono text-green-primary">worktree-b/</span>{" "}
              — Claude builds the dashboard UI
            </li>
            <li>
              <span className="font-mono text-green-primary">main/</span>{" "}
              — You review and merge completed work
            </li>
          </ul>
        </div>
      </section>
      </ScrollReveal>

      {/* Building Production Systems */}
      <ScrollReveal delay={400}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          cat case-study.md
        </h2>
        <TerminalWindow title="mulinga-case-study.md" variant="default" glowing>
          <h3 className="font-mono text-lg font-bold text-amber">
            # Case Study: Mulinga Farm Management System
          </h3>
          <div className="mt-4 space-y-3 text-text-secondary">
            <p>
              A real-world production system built almost entirely with Claude
              Code — the{" "}
              <span className="text-green-primary">
                Mulinga farm management platform
              </span>{" "}
              manages over{" "}
              <span className="text-cyan">26,000+ coffee plants</span> across
              multiple farms in Kenya.
            </p>
            <p>
              The system was developed using a full-stack architecture:{" "}
              <span className="text-text-primary">
                Next.js for the frontend, PostgreSQL for the database,
              </span>{" "}
              and deployed on production infrastructure — demonstrating that
              Claude Code can handle enterprise-grade applications, not just
              toy projects.
            </p>
          </div>

          <div className="mt-6 border-t border-border-default pt-4">
            <h4 className="font-mono text-sm font-bold text-cyan">
              Technical Highlights:
            </h4>
            <ul className="mt-3 space-y-2 font-mono text-sm">
              <li className="text-text-secondary">
                <span className="text-green-primary">STACK</span> ={" "}
                Next.js + TypeScript + PostgreSQL + Tailwind CSS
              </li>
              <li className="text-text-secondary">
                <span className="text-green-primary">SCALE</span> ={" "}
                26,000+ coffee plants tracked and managed
              </li>
              <li className="text-text-secondary">
                <span className="text-green-primary">METHOD</span> ={" "}
                Agentic development with Claude Code
              </li>
              <li className="text-text-secondary">
                <span className="text-green-primary">DEPLOY</span> ={" "}
                Production-grade with real users
              </li>
            </ul>
          </div>

          <div className="mt-6 border-t border-border-default pt-4">
            <p className="text-sm text-text-dim">
              This project demonstrates that Claude Code is not just for
              prototypes. With proper planning, clear CLAUDE.md configuration,
              and iterative development, you can build and deploy complex
              production systems.
            </p>
          </div>
        </TerminalWindow>
      </section>
      </ScrollReveal>
    </main>
  );
}
