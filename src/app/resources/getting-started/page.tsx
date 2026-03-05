import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TerminalWindow, CommandPrefix, ScrollReveal } from "@/components/terminal";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Getting Started with Claude | Claude Community Kenya",
  description:
    "New to Claude? Learn what Claude is, explore its products, and get started building in minutes.",
  openGraph: {
    title: "Getting Started with Claude | Claude Community Kenya",
    description:
      "New to Claude? Learn what Claude is, explore its products, and get started building in minutes.",
    url: "https://www.claudekenya.org/resources/getting-started",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const products = [
  {
    name: "Claude.ai",
    label: "Web & Mobile",
    description: "The main interface for chatting with Claude. Available on web and mobile apps.",
  },
  {
    name: "Claude Code",
    label: "CLI",
    description: "Build software directly from your terminal with an agentic coding assistant.",
  },
  {
    name: "Claude API",
    label: "Developer",
    description: "Integrate Claude into your own applications with a powerful REST API.",
  },
  {
    name: "Claude for Enterprise",
    label: "Business",
    description: "Team and business solutions with admin controls, SSO, and higher limits.",
  },
];

const steps = [
  {
    command: "open https://claude.ai",
    description: "Visit claude.ai and create an account",
  },
  {
    command: "select --plan",
    description: "Choose your plan: Free, Pro at $20/mo, or Team",
  },
  {
    command: "claude chat --start",
    description: "Start a conversation — ask Claude anything",
  },
  {
    command: "npm install -g @anthropic-ai/claude-code",
    description: "Try Claude Code for terminal-based development",
  },
  {
    command: "join --community discord.gg/AVAyYCbJ",
    description: "Join Claude Community Kenya on Discord",
  },
];

const pricingTiers = [
  { name: "Free", price: "$0", features: "Limited messages, basic access" },
  { name: "Pro", price: "$20/mo", features: "5x more usage, priority access, advanced features" },
  { name: "Team", price: "$25/user/mo", features: "Collaboration, admin controls, shared workspace" },
  { name: "Enterprise", price: "Custom", features: "SSO, audit logs, dedicated support, SLAs" },
];

export default function GettingStartedPage() {
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
            cat getting-started.md
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text-secondary">
            Your guide to getting started with Claude AI — from zero to building.
          </p>
        </section>
      </ScrollReveal>

      {/* What is Claude? */}
      <ScrollReveal delay={100}>
      <section className="py-20">
        <TerminalWindow title="what-is-claude.md" variant="default">
          <h2 className="font-mono text-xl font-bold text-amber">
            # What is Claude?
          </h2>
          <div className="mt-4 space-y-3 text-text-secondary">
            <p>
              Claude is an AI assistant built by{" "}
              <span className="text-cyan">Anthropic</span>, designed to be
              helpful, harmless, and honest. It represents a new approach to AI
              development that prioritizes safety and usefulness in equal measure.
            </p>
            <p>
              Claude excels at a wide range of tasks including{" "}
              <span className="text-green-primary">coding</span>,{" "}
              <span className="text-green-primary">analysis</span>,{" "}
              <span className="text-green-primary">writing</span>,{" "}
              <span className="text-green-primary">math</span>, and{" "}
              <span className="text-green-primary">reasoning</span>. It can
              understand and generate code in dozens of programming languages,
              analyze complex documents, write and edit content, and engage in
              nuanced conversations about virtually any topic.
            </p>
            <p>
              What makes Claude different is its training methodology. Anthropic
              uses Constitutional AI (CAI) to align Claude with human values,
              making it more reliable and trustworthy for professional and
              personal use.
            </p>
          </div>
        </TerminalWindow>
      </section>
      </ScrollReveal>

      {/* Claude Products Overview */}
      <ScrollReveal delay={200}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          ls ./claude-products/
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {products.map((product) => (
            <Card key={product.name} title={product.name} padding="md">
              <div className="mb-2">
                <span className="font-mono text-xs text-amber">
                  [{product.label}]
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                {product.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* How to Get Started */}
      <ScrollReveal delay={300}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          ./setup.sh --guided
        </h2>
        <TerminalWindow title="setup.sh" variant="command">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="group">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-border-default font-mono text-xs text-green-primary">
                    {index + 1}
                  </span>
                  <div>
                    <code className="text-green-primary">
                      $ {step.command}
                    </code>
                    <p className="mt-1 font-sans text-sm text-text-secondary">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="ml-3 mt-2 border-l border-border-default pl-6">
                    <span className="font-mono text-xs text-text-dim">
                      [OK] Step {index + 1} complete
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4 border-t border-border-default pt-4">
              <span className="text-green-primary">
                [SUCCESS]
              </span>{" "}
              <span className="text-text-secondary">
                Setup complete. You&apos;re ready to build with Claude.
              </span>
            </div>
          </div>
        </TerminalWindow>
      </section>
      </ScrollReveal>

      {/* Pricing Overview */}
      <ScrollReveal delay={400}>
      <section className="py-20">
        <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
          <CommandPrefix symbol="$" />
          claude --pricing
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <Card key={tier.name} title={tier.name} showDots={false} padding="md">
              <div className="mb-3">
                <span className="font-mono text-2xl font-bold text-green-primary">
                  {tier.price}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{tier.features}</p>
            </Card>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-text-dim">
          <CommandPrefix symbol="#" />
          Check{" "}
          <a
            href="https://anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan hover:underline"
          >
            anthropic.com
          </a>{" "}
          for latest pricing.
        </p>
      </section>
      </ScrollReveal>
    </main>
  );
}
