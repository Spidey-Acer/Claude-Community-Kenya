import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { GuideBlock } from "@/components/karibu/GuideBlock";

export const metadata: Metadata = {
  title: "Claude Code Guide | Claude Community Kenya",
  description:
    "Master Claude Code — Anthropic's CLI tool for building software with Claude directly in your terminal.",
  alternates: {
    canonical: "https://www.claudekenya.org/resources/claude-code",
  },
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
        className="inline-flex items-center gap-2 font-mono text-sm text-ink-muted transition-colors hover:text-clay"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources
      </Link>

      {/* Header */}
      <Reveal>
        <section className="py-16">
          <h1 className="mb-4 max-w-[820px] font-newsreader text-[38px] font-normal leading-[1.06] tracking-[-0.02em] text-ink sm:text-[48px]">Claude Code Guide</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">{"A guide to Anthropic's AI-powered coding assistant."}</p>
        </section>
      </Reveal>

      {/* What is Claude Code? */}
      <Reveal index={0}>
      <section className="py-20">
        <GuideBlock title="about-claude-code.md" variant="default">
          <h2 className="font-mono text-xl font-bold text-clay-dark">
            # What is Claude Code?
          </h2>
          <div className="mt-4 space-y-3 text-ink-soft">
            <p>
              Claude Code is{" "}
              <span className="text-ink-soft">Anthropic&apos;s official CLI tool</span>{" "}
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
        </GuideBlock>
      </section>
      </Reveal>

      {/* Installation Guide */}
      <Reveal index={1}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Installation</h2>
        <GuideBlock title="installation" variant="code">
          <div className="space-y-1">
            <p className="text-ink-muted"># Install globally with npm</p>
            <p className="text-clay">
              npm install -g @anthropic-ai/claude-code
            </p>
            <p className="mt-4 text-ink-muted"># Navigate to your project</p>
            <p className="text-clay">cd your-project</p>
            <p className="mt-4 text-ink-muted"># Start Claude Code</p>
            <p className="text-clay">claude</p>
          </div>
        </GuideBlock>
        <p className="mt-4 text-sm text-ink-muted">
          Requires Node.js 18+ and an Anthropic API key or active Claude Pro/Team subscription.
        </p>
      </section>
      </Reveal>

      {/* Essential Commands */}
      <Reveal index={2}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Key Commands</h2>
        <GuideBlock title="essential-commands" variant="code">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-clay">claude</span>
              <span className="text-ink-muted"># Start interactive session</span>
            </div>
            <div className="flex justify-between">
              <span className="text-clay">
                claude &quot;task&quot;
              </span>
              <span className="text-ink-muted"># Direct task</span>
            </div>
            <div className="flex justify-between">
              <span className="text-clay">claude --plan</span>
              <span className="text-ink-muted">
                # Plan mode for complex tasks
              </span>
            </div>
            <div className="mt-4 flex justify-between">
              <span className="text-clay-dark">/help</span>
              <span className="text-ink-muted"># Show help</span>
            </div>
            <div className="flex justify-between">
              <span className="text-clay-dark">/clear</span>
              <span className="text-ink-muted"># Clear conversation</span>
            </div>
            <div className="flex justify-between">
              <span className="text-clay-dark">/cost</span>
              <span className="text-ink-muted"># Show token usage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-clay-dark">/compact</span>
              <span className="text-ink-muted"># Compact conversation</span>
            </div>
          </div>
        </GuideBlock>
      </section>
      </Reveal>

      {/* Setting Up CLAUDE.md */}
      <Reveal index={3}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Project Configuration</h2>
        <GuideBlock title="claude-md-guide" variant="default">
          <div className="space-y-3 text-ink-soft">
            <p>
              The <code className="text-ink-soft">CLAUDE.md</code> file is a
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
        </GuideBlock>

        <div className="mt-6">
          <GuideBlock title="CLAUDE.md (example)" variant="code">
            <div className="space-y-1">
              <p className="text-clay-dark"># My Project</p>
              <p className="mt-2 text-clay-dark">## Tech Stack</p>
              <p className="text-ink-soft">- Next.js, TypeScript, Tailwind CSS</p>
              <p className="mt-2 text-clay-dark">## Conventions</p>
              <p className="text-ink-soft">- Use App Router</p>
              <p className="text-ink-soft">- Prefer server components</p>
              <p className="text-ink-soft">- Import paths use @/ alias</p>
              <p className="mt-2 text-clay-dark">## Testing</p>
              <p className="text-ink-soft">- Use Vitest for unit tests</p>
              <p className="text-ink-soft">- Run: npm run test</p>
            </div>
          </GuideBlock>
        </div>
      </section>
      </Reveal>

      {/* Multi-Instance Development */}
      <Reveal index={4}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Multi-Instance Workflows</h2>
        <GuideBlock title="multi-instance-dev" variant="default">
          <div className="space-y-3 text-ink-soft">
            <p>
              One of the most powerful patterns with Claude Code is running{" "}
              <span className="text-clay">multiple instances</span>{" "}
              simultaneously. Each instance maintains its own conversation
              context, allowing you to parallelize your development workflow.
            </p>
            <p>
              Use three terminals for maximum productivity: one for high-level
              planning, one for active feature development, and one for tests
              and debugging.
            </p>
          </div>
        </GuideBlock>

        <div className="mt-6">
          <GuideBlock title="parallel-sessions" variant="code">
            <div className="space-y-1">
              <p className="text-ink-muted">
                # Terminal 1 — Architecture &amp; Planning
              </p>
              <p className="text-clay">claude --plan</p>
              <p className="mt-4 text-ink-muted">
                # Terminal 2 — Feature Development
              </p>
              <p className="text-clay">claude</p>
              <p className="mt-4 text-ink-muted">
                # Terminal 3 — Tests &amp; Debugging
              </p>
              <p className="text-clay">claude</p>
            </div>
          </GuideBlock>
        </div>

        <div className="mt-6 border border-sand bg-paper-card p-4">
          <p className="font-mono text-sm text-clay-dark">
            TIP:
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Use a terminal multiplexer like{" "}
            <span className="text-ink-soft">tmux</span> or{" "}
            <span className="text-ink-soft">Warp</span> to manage multiple panes
            efficiently. This mirrors how professional developers at Anthropic
            use Claude Code in production.
          </p>
        </div>
      </section>
      </Reveal>

      {/* Resources */}
      <Reveal index={5}>
      <section className="py-20">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Learn More</h2>
        <div className="space-y-3 border border-sand bg-paper-card p-6">
          <h3 className="font-mono text-sm font-bold text-ink">
            Official Documentation
          </h3>
          <ul className="space-y-2 font-mono text-sm">
            <li>
              <a
                href="https://docs.anthropic.com/en/docs/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-soft hover:underline"
              >
                Claude Code Documentation
              </a>
              <span className="text-ink-muted"> — Official guide and reference</span>
            </li>
            <li>
              <a
                href="https://docs.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-soft hover:underline"
              >
                Anthropic API Docs
              </a>
              <span className="text-ink-muted"> — Full API documentation</span>
            </li>
            <li>
              <a
                href="https://github.com/anthropics/anthropic-cookbook"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-soft hover:underline"
              >
                Anthropic Cookbook
              </a>
              <span className="text-ink-muted">
                {" "}
                — Code examples and patterns
              </span>
            </li>
            <li>
              <a
                href="https://github.com/anthropics/anthropic-sdk-typescript"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-soft hover:underline"
              >
                TypeScript SDK
              </a>
              <span className="text-ink-muted">
                {" "}
                — Official TypeScript/JavaScript SDK
              </span>
            </li>
          </ul>
        </div>
      </section>
      </Reveal>
    </main>
  );
}
