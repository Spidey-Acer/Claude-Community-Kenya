import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TerminalWindow, CommandPrefix, ScrollReveal } from "@/components/terminal";

export const metadata: Metadata = {
  title: "Claude Code Guide | Claude Community Kenya",
  description:
    "Master Claude Code — Anthropic's CLI tool for building software with Claude directly in your terminal.",
  openGraph: {
    title: "Claude Code Guide | Claude Community Kenya",
    description:
      "Master Claude Code — Anthropic's CLI tool for building software with Claude directly in your terminal.",
    url: "https://www.claudekenya.org/resources/claude-code",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

export default function ClaudeCodePage() {
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
            man claude-code
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text-secondary">
            The complete guide to Anthropic&apos;s CLI for building software with
            Claude.
          </p>
        </section>
      </ScrollReveal>

      {/* What is Claude Code? */}
      <ScrollReveal delay={100}>
      <section className="py-20">
        <TerminalWindow title="about-claude-code.md" variant="default">
          <h2 className="font-mono text-xl font-bold text-amber">
            # What is Claude Code?
          </h2>
          <div className="mt-4 space-y-3 text-text-secondary">
            <p>
              Claude Code is{" "}
              <span className="text-cyan">Anthropic&apos;s official CLI tool</span>{" "}
              for building software with Claude directly in your terminal. It
              brings agentic AI capabilities to your development workflow,
              allowing Claude to read your codebase, understand context, plan
              changes, and execute them — all from the command line.
            </p>
            <p>
              Unlike traditional code completion tools, Claude Code operates as
              an autonomous agent. It can navigate your project structure,
              understand architectural patterns, create and modify files, run
              tests, and even fix its own errors — making it a true AI pair
              programmer.
            </p>
          </div>
        </TerminalWindow>
      </section>
      </ScrollReveal>

      {/* Installation Guide */}
      <ScrollReveal delay={200}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          ./install.sh
        </h2>
        <TerminalWindow title="installation" variant="code">
          <div className="space-y-1">
            <p className="text-text-dim"># Install globally with npm</p>
            <p className="text-green-primary">
              npm install -g @anthropic-ai/claude-code
            </p>
            <p className="mt-4 text-text-dim"># Navigate to your project</p>
            <p className="text-green-primary">cd your-project</p>
            <p className="mt-4 text-text-dim"># Start Claude Code</p>
            <p className="text-green-primary">claude</p>
          </div>
        </TerminalWindow>
        <p className="mt-4 text-sm text-text-dim">
          Requires Node.js 18+ and an Anthropic API key or active Claude Pro/Team subscription.
        </p>
      </section>
      </ScrollReveal>

      {/* Essential Commands */}
      <ScrollReveal delay={300}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          claude /help
        </h2>
        <TerminalWindow title="essential-commands" variant="code">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-green-primary">claude</span>
              <span className="text-text-dim"># Start interactive session</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-primary">
                claude &quot;task&quot;
              </span>
              <span className="text-text-dim"># Direct task</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-primary">claude --plan</span>
              <span className="text-text-dim">
                # Plan mode for complex tasks
              </span>
            </div>
            <div className="mt-4 flex justify-between">
              <span className="text-amber">/help</span>
              <span className="text-text-dim"># Show help</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber">/clear</span>
              <span className="text-text-dim"># Clear conversation</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber">/cost</span>
              <span className="text-text-dim"># Show token usage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber">/compact</span>
              <span className="text-text-dim"># Compact conversation</span>
            </div>
          </div>
        </TerminalWindow>
      </section>
      </ScrollReveal>

      {/* Setting Up CLAUDE.md */}
      <ScrollReveal delay={400}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          cat CLAUDE.md
        </h2>
        <TerminalWindow title="claude-md-guide" variant="default">
          <div className="space-y-3 text-text-secondary">
            <p>
              The <code className="text-cyan">CLAUDE.md</code> file is a
              special project configuration file that Claude Code reads
              automatically when starting a session. It acts as persistent
              context, telling Claude about your project&apos;s tech stack,
              conventions, and preferences.
            </p>
            <p>
              Place it in your project root. Claude will follow these
              instructions across every session — no need to repeat yourself.
            </p>
          </div>
        </TerminalWindow>

        <div className="mt-6">
          <TerminalWindow title="CLAUDE.md (example)" variant="code">
            <div className="space-y-1">
              <p className="text-amber"># My Project</p>
              <p className="mt-2 text-amber">## Tech Stack</p>
              <p className="text-text-secondary">- Next.js, TypeScript, Tailwind CSS</p>
              <p className="mt-2 text-amber">## Conventions</p>
              <p className="text-text-secondary">- Use App Router</p>
              <p className="text-text-secondary">- Prefer server components</p>
              <p className="text-text-secondary">- Import paths use @/ alias</p>
              <p className="mt-2 text-amber">## Testing</p>
              <p className="text-text-secondary">- Use Vitest for unit tests</p>
              <p className="text-text-secondary">- Run: npm run test</p>
            </div>
          </TerminalWindow>
        </div>
      </section>
      </ScrollReveal>

      {/* Multi-Instance Development */}
      <ScrollReveal delay={500}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          tmux split-window -h
        </h2>
        <TerminalWindow title="multi-instance-dev" variant="default">
          <div className="space-y-3 text-text-secondary">
            <p>
              One of the most powerful patterns with Claude Code is running{" "}
              <span className="text-green-primary">multiple instances</span>{" "}
              simultaneously. Each instance maintains its own conversation
              context, allowing you to parallelize your development workflow.
            </p>
            <p>
              Use three terminals for maximum productivity: one for high-level
              planning, one for active feature development, and one for tests
              and debugging.
            </p>
          </div>
        </TerminalWindow>

        <div className="mt-6">
          <TerminalWindow title="parallel-sessions" variant="code">
            <div className="space-y-1">
              <p className="text-text-dim">
                # Terminal 1 — Architecture &amp; Planning
              </p>
              <p className="text-green-primary">claude --plan</p>
              <p className="mt-4 text-text-dim">
                # Terminal 2 — Feature Development
              </p>
              <p className="text-green-primary">claude</p>
              <p className="mt-4 text-text-dim">
                # Terminal 3 — Tests &amp; Debugging
              </p>
              <p className="text-green-primary">claude</p>
            </div>
          </TerminalWindow>
        </div>

        <div className="mt-6 border border-border-default bg-bg-card p-4">
          <p className="font-mono text-sm text-amber">
            TIP:
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Use a terminal multiplexer like{" "}
            <span className="text-cyan">tmux</span> or{" "}
            <span className="text-cyan">Warp</span> to manage multiple panes
            efficiently. This mirrors how professional developers at Anthropic
            use Claude Code in production.
          </p>
        </div>
      </section>
      </ScrollReveal>

      {/* Resources */}
      <ScrollReveal delay={600}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          cat ./resources.txt
        </h2>
        <div className="space-y-3 border border-border-default bg-bg-card p-6">
          <h3 className="font-mono text-sm font-bold text-text-primary">
            Official Documentation
          </h3>
          <ul className="space-y-2 font-mono text-sm">
            <li>
              <a
                href="https://docs.anthropic.com/en/docs/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                Claude Code Documentation
              </a>
              <span className="text-text-dim"> — Official guide and reference</span>
            </li>
            <li>
              <a
                href="https://docs.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                Anthropic API Docs
              </a>
              <span className="text-text-dim"> — Full API documentation</span>
            </li>
            <li>
              <a
                href="https://github.com/anthropics/anthropic-cookbook"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                Anthropic Cookbook
              </a>
              <span className="text-text-dim">
                {" "}
                — Code examples and patterns
              </span>
            </li>
            <li>
              <a
                href="https://github.com/anthropics/anthropic-sdk-typescript"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                TypeScript SDK
              </a>
              <span className="text-text-dim">
                {" "}
                — Official TypeScript/JavaScript SDK
              </span>
            </li>
          </ul>
        </div>
      </section>
      </ScrollReveal>
    </main>
  );
}
