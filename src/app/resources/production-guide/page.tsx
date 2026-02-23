import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { TerminalWindow, CommandPrefix, ScrollReveal } from "@/components/terminal";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Building Production AI Apps with Claude | Claude Community Kenya",
  description:
    "Practical guide to deploying Claude in production — architecture patterns, error handling, rate limits, cost optimization, and real-world case studies from Kenya.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/resources/production-guide`,
  },
  openGraph: {
    title: "Building Production AI Apps with Claude | Claude Community Kenya",
    description:
      "Practical guide to deploying Claude in production — architecture patterns, error handling, rate limits, cost optimization, and real-world case studies from Kenya.",
    url: `${SITE_CONFIG.url}/resources/production-guide`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

const checklist = [
  "API key stored in environment variables — never in code",
  "Retry logic with exponential backoff on rate limit errors",
  "Request timeout set (recommended: 30–120 seconds)",
  "Input validation before sending to API",
  "Response validation — check stop_reason and content type",
  "Token usage logged for cost monitoring",
  "Error states handled gracefully in the UI",
  "Streaming used for long responses (>500 tokens)",
  "System prompt tuned and versioned",
  "Load tested before launching to users",
];

export default function ProductionGuidePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
          { name: "Production Deployment Guide" },
        ]}
      />
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
            deploy --production
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text-secondary">
            Everything you need to ship Claude-powered applications that are reliable, cost-efficient, and ready for real users.
          </p>
          <nav className="mt-6 flex flex-wrap gap-3 font-mono text-xs" aria-label="Page sections">
            {[
              "Architecture",
              "Error Handling",
              "Rate Limits",
              "Prompt Engineering",
              "Cost Control",
              "Security",
              "Monitoring",
              "Case Study",
            ].map((s) => (
              <a
                key={s}
                href={`#${s.toLowerCase().replace(" ", "-")}`}
                className="border border-border-default px-3 py-1 text-text-dim transition-colors hover:border-green-primary/50 hover:text-green-primary"
              >
                {s}
              </a>
            ))}
          </nav>
        </section>
      </ScrollReveal>

      {/* Architecture */}
      <ScrollReveal delay={100}>
        <section id="architecture" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            cat architecture.md
          </h2>
          <TerminalWindow title="architecture.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                The most robust pattern for production Claude apps is a{" "}
                <span className="text-green-primary">server-side proxy</span>: your frontend
                calls your own backend, which calls the Anthropic API. This keeps your API key
                safe, lets you add auth, rate limiting, logging, and caching at the edge.
              </p>
              <p>
                For simple use cases, a Next.js API route or a lightweight Express server
                works well. For higher scale, consider a dedicated microservice that handles
                all LLM calls with its own queue and retry logic.
              </p>
            </div>
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title="architecture-diagram" variant="code">
              <div className="space-y-1 font-mono text-xs text-text-secondary">
                <p className="text-text-dim">{"# Request flow"}</p>
                <p className="text-green-primary">{"User Browser"}</p>
                <p className="ml-4 text-text-dim">{"↓  POST /api/chat"}</p>
                <p className="text-amber">{"Your Server (Next.js API Route)"}</p>
                <p className="ml-4 text-text-dim">{"↓  Validates request, checks auth"}</p>
                <p className="ml-4 text-text-dim">{"↓  Adds system prompt"}</p>
                <p className="ml-4 text-text-dim">{"↓  POST /v1/messages"}</p>
                <p className="text-cyan">{"Anthropic API"}</p>
                <p className="ml-4 text-text-dim">{"↓  Response / Stream"}</p>
                <p className="text-amber">{"Your Server"}</p>
                <p className="ml-4 text-text-dim">{"↓  Logs usage, handles errors"}</p>
                <p className="text-green-primary">{"User Browser"}</p>
              </div>
            </TerminalWindow>
          </div>

          <div className="mt-4">
            <TerminalWindow title="api-route.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-text-dim">{"// Next.js App Router API route"}</p>
                <p className="text-cyan">{"import { NextRequest, NextResponse } from \"next/server\";"}</p>
                <p className="text-cyan">{"import Anthropic from \"@anthropic-ai/sdk\";"}</p>
                <p className="mt-3 text-text-secondary">
                  {"const client = new Anthropic();"}
                </p>
                <p className="mt-3 text-text-secondary">
                  {"export async function POST(req: NextRequest) {"}
                </p>
                <p className="ml-4 text-text-secondary">{"const { message } = await req.json();"}</p>
                <p className="ml-4 text-green-primary">
                  {"if (!message || message.length > 4000) {"}
                </p>
                <p className="ml-8 text-amber">
                  {"return NextResponse.json({ error: \"Invalid input\" }, { status: 400 });"}
                </p>
                <p className="ml-4 text-green-primary">{"}"}</p>
                <p className="ml-4 text-text-secondary">{"const response = await client.messages.create({"}</p>
                <p className="ml-8 text-green-primary">{"model: \"claude-sonnet-4-5\","}</p>
                <p className="ml-8 text-green-primary">{"max_tokens: 1024,"}</p>
                <p className="ml-8 text-green-primary">{"system: process.env.SYSTEM_PROMPT,"}</p>
                <p className="ml-8 text-green-primary">{"messages: [{ role: \"user\", content: message }]"}</p>
                <p className="ml-4 text-text-secondary">{"});"}</p>
                <p className="ml-4 text-text-secondary">
                  {"return NextResponse.json({ reply: response.content[0].text });"}
                </p>
                <p className="text-text-secondary">{"}"}</p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* Error Handling */}
      <ScrollReveal delay={150}>
        <section id="error-handling" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            try &#123;&#125; catch &#123; handle() &#125;
          </h2>
          <TerminalWindow title="errors.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                The Anthropic API can return several error types. Handle each specifically rather
                than catching everything generically. The SDK exports typed error classes for
                each case.
              </p>
            </div>
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title="error-handling.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-cyan">{"import Anthropic from \"@anthropic-ai/sdk\";"}</p>
                <p className="mt-3 text-text-secondary">{"try {"}</p>
                <p className="ml-4 text-text-secondary">{"const response = await client.messages.create(...);"}</p>
                <p className="text-text-secondary">{"} catch (err) {"}</p>
                <p className="ml-4 text-text-dim">{"// Rate limited — retry with backoff"}</p>
                <p className="ml-4 text-amber">{"if (err instanceof Anthropic.RateLimitError) {"}</p>
                <p className="ml-8 text-green-primary">{"await delay(calculateBackoff(attempt));"}</p>
                <p className="ml-4 text-amber">{"}"}</p>
                <p className="ml-4 text-text-dim">{"// Auth failed — check API key"}</p>
                <p className="ml-4 text-amber">{"else if (err instanceof Anthropic.AuthenticationError) {"}</p>
                <p className="ml-8 text-green-primary">{"logger.error(\"API key invalid or missing\");"}</p>
                <p className="ml-4 text-amber">{"}"}</p>
                <p className="ml-4 text-text-dim">{"// Context window exceeded"}</p>
                <p className="ml-4 text-amber">{"else if (err instanceof Anthropic.BadRequestError) {"}</p>
                <p className="ml-8 text-green-primary">{"await truncateMessages(messages);"}</p>
                <p className="ml-4 text-amber">{"}"}</p>
                <p className="ml-4 text-text-dim">{"// Transient server error — safe to retry"}</p>
                <p className="ml-4 text-amber">{"else if (err instanceof Anthropic.InternalServerError) {"}</p>
                <p className="ml-8 text-green-primary">{"await delay(5000); // wait longer"}</p>
                <p className="ml-4 text-amber">{"}"}</p>
                <p className="ml-4 text-text-dim">{"// Unknown — log and surface to user"}</p>
                <p className="ml-4 text-amber">{"else throw err;"}</p>
                <p className="text-text-secondary">{"}"}</p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* Rate Limits */}
      <ScrollReveal delay={200}>
        <section id="rate-limits" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            cat rate-limits.md
          </h2>
          <TerminalWindow title="rate-limits.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                Rate limits apply per API key, not per user. If you have many concurrent users,
                you will hit limits faster than you expect. Strategies to manage this:
              </p>
              <ul className="ml-4 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Queue requests</span> — use a queue like
                    BullMQ to serialize API calls and prevent burst spikes
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Cache aggressively</span> — identical
                    prompts get identical responses; cache them in Redis for 1–24 hours
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Use Haiku for high volume</span> — switch
                    to claude-haiku-3-5 for classification, tagging, and other simple tasks
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Monitor token headers</span> — check
                    x-ratelimit-remaining-tokens in responses to detect approaching limits early
                  </span>
                </li>
              </ul>
            </div>
          </TerminalWindow>
        </section>
      </ScrollReveal>

      {/* Prompt Engineering */}
      <ScrollReveal delay={250}>
        <section id="prompt-engineering" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            vim system-prompt.txt
          </h2>
          <TerminalWindow title="prompts.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                Your system prompt is the single highest-leverage variable in a production Claude
                app. A well-crafted system prompt produces consistent, predictable output; a
                vague one produces unreliable behavior that is hard to debug.
              </p>
              <p>Key principles for production system prompts:</p>
              <ul className="ml-4 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Be specific about format</span> — tell
                    Claude exactly what output format you need (JSON, markdown, plain text)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Define the persona</span> — describe who
                    Claude is in this context, its tone, and its limitations
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Handle edge cases explicitly</span> — what
                    should Claude do if the user asks something out of scope?
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-primary" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Version your prompts</span> — treat system
                    prompts like code; track changes, test before deploying
                  </span>
                </li>
              </ul>
            </div>
          </TerminalWindow>
        </section>
      </ScrollReveal>

      {/* Cost Control */}
      <ScrollReveal delay={300}>
        <section id="cost-control" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            claude --cost-optimize
          </h2>
          <TerminalWindow title="cost-optimization.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                API costs scale with tokens (input + output). On a free side project this is
                negligible, but at scale it becomes significant. These techniques reduce cost
                without sacrificing quality:
              </p>
              <ul className="ml-4 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-amber" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Right-size your model</span> — use
                    claude-haiku-3-5 for classification, extraction, and simple Q&A. Reserve
                    claude-sonnet-4-5 for tasks that need deeper reasoning.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-amber" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Limit max_tokens</span> — set it to the
                    expected output length, not the maximum. A 200-token limit for a product
                    description costs far less than 4096.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-amber" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Truncate conversation history</span> —
                    only pass the last N messages in multi-turn chats. Old context is usually
                    irrelevant and burns tokens.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-amber" aria-hidden="true">&gt;</span>
                  <span>
                    <span className="text-text-primary">Use prompt caching</span> — for long,
                    repeated system prompts, Anthropic&apos;s prompt caching feature can reduce
                    input token costs by up to 90%.
                  </span>
                </li>
              </ul>
            </div>
          </TerminalWindow>
        </section>
      </ScrollReveal>

      {/* Security */}
      <ScrollReveal delay={350}>
        <section id="security" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            chmod 600 .env
          </h2>
          <TerminalWindow title="security.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                A compromised API key means someone else burns your credits and potentially
                your reputation. Treat it with the same care as a database password.
              </p>
            </div>
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title="security-checklist" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-text-dim">{"# API Key Security"}</p>
                <p className="text-green-primary">{"✓ Store in environment variables only"}</p>
                <p className="text-green-primary">{"✓ Never in source code or git history"}</p>
                <p className="text-green-primary">{"✓ Use secrets manager in production (AWS Secrets, GCP Secret Manager)"}</p>
                <p className="text-green-primary">{"✓ Rotate keys periodically"}</p>
                <p className="text-green-primary">{"✓ Set up usage alerts in Anthropic Console"}</p>
                <p className="mt-4 text-text-dim">{"# Prompt Injection Defense"}</p>
                <p className="text-amber">{"✓ Validate and sanitize user input"}</p>
                <p className="text-amber">{"✓ Never concatenate user input directly into system prompt"}</p>
                <p className="text-amber">{"✓ Use separate message roles (system vs user)"}</p>
                <p className="text-amber">{"✓ Rate-limit per user, not just per API key"}</p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* Monitoring */}
      <ScrollReveal delay={400}>
        <section id="monitoring" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            tail -f production.log
          </h2>
          <TerminalWindow title="monitoring.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                You cannot improve what you do not measure. Log these metrics for every API call:
              </p>
              <ul className="ml-4 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan" aria-hidden="true">&gt;</span>
                  <span>Input and output token counts (for cost tracking)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan" aria-hidden="true">&gt;</span>
                  <span>Response latency (p50, p95, p99)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan" aria-hidden="true">&gt;</span>
                  <span>stop_reason — flag any non-end_turn stops for investigation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan" aria-hidden="true">&gt;</span>
                  <span>Error rate by type (rate limit, auth, server error)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan" aria-hidden="true">&gt;</span>
                  <span>User feedback signals if you surface thumbs up/down</span>
                </li>
              </ul>
            </div>
          </TerminalWindow>
        </section>
      </ScrollReveal>


      {/* Production Checklist */}
      <ScrollReveal delay={500}>
        <section className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            ./pre-launch-checklist.sh
          </h2>
          <TerminalWindow title="pre-launch-checklist" variant="command">
            <ul className="space-y-3">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-primary"
                    aria-hidden="true"
                  />
                  <span className="text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </TerminalWindow>
        </section>
      </ScrollReveal>

      {/* Next Steps */}
      <ScrollReveal delay={550}>
        <section className="border-t border-border-default py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            cat ./next-steps.md
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/resources/api-guide"
              className="group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/50"
            >
              <p className="font-mono text-sm font-bold text-green-primary group-hover:underline">
                Claude API Guide →
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Authentication, models, streaming, and tool use — the complete API reference.
              </p>
            </Link>
            <Link
              href="/resources/workflows"
              className="group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/50"
            >
              <p className="font-mono text-sm font-bold text-green-primary group-hover:underline">
                Advanced Workflows →
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Agentic patterns, plan mode, git worktrees, and more Claude Code techniques.
              </p>
            </Link>
            <Link
              href="/events"
              className="group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/50"
            >
              <p className="font-mono text-sm font-bold text-green-primary group-hover:underline">
                Attend a Workshop →
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Build with Claude alongside other Kenyan developers at our in-person events.
              </p>
            </Link>
          </div>
          <p className="mt-8 font-sans text-text-secondary">
            Stuck on something in production?{" "}
            <Link href="/join" className="text-green-primary hover:underline">
              Join our Discord
            </Link>{" "}
            — community members share production tips and debug issues together. Also check the{" "}
            <Link href="/blog" className="text-green-primary hover:underline">
              community blog
            </Link>{" "}
            for real-world lessons from Kenyan developers shipping Claude apps.
          </p>
        </section>
      </ScrollReveal>
    </main>
  );
}
