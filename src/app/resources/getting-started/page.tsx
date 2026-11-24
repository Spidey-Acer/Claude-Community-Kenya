import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { Masthead, WRAP } from "@/components/karibu/kit";
import { GuideBlock } from "@/components/karibu/GuideBlock";

export const metadata: Metadata = {
  title: "Getting Started with Claude | Claude Community Kenya",
  description:
    "New to Claude? Learn what Claude is, explore its products, and get started building in minutes.",
  alternates: {
    canonical: "https://www.claudekenya.org/resources/getting-started",
  },
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
    command: "join --community discord.gg/CkD9QWjsHm",
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
    <div className={`${WRAP} py-10 sm:py-12`}>
      {/* Back link */}
      <Link
        href="/resources"
        className="inline-flex items-center gap-2 font-mono text-sm text-ink-muted transition-colors hover:text-clay"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources
      </Link>

      {/* Header */}
        <section className="py-16">
          <Masthead eyebrow="Resources" title="Getting Started" lead="Your guide to getting started with Claude AI — from zero to productive." flush />
        </section>

      {/* What is Claude? */}
      <Reveal index={0}>
      <section className="py-10 sm:py-12">
        <GuideBlock title="what-is-claude.md" variant="default">
          <h2 className="font-mono text-xl font-bold text-clay-dark">
            # What is Claude?
          </h2>
          <div className="mt-4 space-y-3 text-ink-soft">
            <p>
              Claude is an AI assistant built by{" "}
              <span className="text-ink-soft">Anthropic</span>, designed to be
              helpful, harmless, and honest. It represents a new approach to AI
              development that prioritizes safety and usefulness in equal measure.
            </p>
            <p>
              Claude excels at a wide range of tasks including{" "}
              <span className="text-clay">coding</span>,{" "}
              <span className="text-clay">analysis</span>,{" "}
              <span className="text-clay">writing</span>,{" "}
              <span className="text-clay">math</span>, and{" "}
              <span className="text-clay">reasoning</span>. It can
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
        </GuideBlock>
      </section>
      </Reveal>

      {/* Claude Products Overview */}
      <Reveal index={1}>
      <section className="py-10 sm:py-12">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Claude Products</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {products.map((product) => (
            <div key={product.name} className="rounded-2xl border border-sand bg-paper-card p-6">
              <h3 className="mb-3 font-newsreader text-[20px] font-medium text-ink">{product.name}</h3>
              <div className="mb-2">
                <span className="font-mono text-xs text-clay-dark">
                  [{product.label}]
                </span>
              </div>
              <p className="text-sm text-ink-soft">
                {product.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      </Reveal>

      {/* How to Get Started */}
      <Reveal index={2}>
      <section className="py-10 sm:py-12">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Quick Setup</h2>
        <GuideBlock title="setup.sh" variant="command">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="group">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-sand font-mono text-xs text-clay">
                    {index + 1}
                  </span>
                  <div>
                    <code className="text-clay">
                      $ {step.command}
                    </code>
                    <p className="mt-1 font-sans text-sm text-ink-soft">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="ml-3 mt-2 border-l border-sand pl-6">
                    <span className="font-mono text-xs text-ink-muted">
                      [OK] Step {index + 1} complete
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4 border-t border-sand pt-4">
              <span className="text-clay">
                [SUCCESS]
              </span>{" "}
              <span className="text-ink-soft">
                Setup complete. You&apos;re ready to build with Claude.
              </span>
            </div>
          </div>
        </GuideBlock>
      </section>
      </Reveal>

      {/* Pricing Overview */}
      <Reveal index={3}>
      <section className="py-10 sm:py-12">
        <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Pricing</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <div key={tier.name} className="rounded-2xl border border-sand bg-paper-card p-6">
              <h3 className="mb-3 font-newsreader text-[20px] font-medium text-ink">{tier.name}</h3>
              <div className="mb-3">
                <span className="font-mono text-2xl font-bold text-clay">
                  {tier.price}
                </span>
              </div>
              <p className="text-sm text-ink-soft">{tier.features}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-ink-muted">

          Check{" "}
          <a
            href="https://anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-soft hover:underline"
          >
            anthropic.com
          </a>{" "}
          for latest pricing.
        </p>
      </section>
      </Reveal>
    </div>
  );
}
