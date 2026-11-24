import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { Masthead } from "@/components/karibu/kit";
import { GuideBlock } from "@/components/karibu/GuideBlock";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Claude API Complete Guide | Claude Community Kenya",
  description:
    "Complete guide to the Claude API — authentication, models, streaming, tool use, and code examples for Kenyan developers building with Claude.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/resources/api-guide`,
  },
  openGraph: {
    title: "Claude API Complete Guide | Claude Community Kenya",
    description:
      "Complete guide to the Claude API — authentication, models, streaming, tool use, and code examples for Kenyan developers building with Claude.",
    url: `${SITE_CONFIG.url}/resources/api-guide`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

const models = [
  {
    id: "claude-opus-4-5",
    label: "Most Capable",
    description: "Best for complex reasoning, analysis, and nuanced tasks. Highest intelligence.",
  },
  {
    id: "claude-sonnet-4-5",
    label: "Best Balance",
    description: "Excellent performance with faster speed. Ideal for most production use cases.",
  },
  {
    id: "claude-haiku-3-5",
    label: "Fastest",
    description: "Near-instant responses. Perfect for high-volume, latency-sensitive applications.",
  },
];

export default function ApiGuidePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
          { name: "Claude API Guide" },
        ]}
      />
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
          <Masthead eyebrow="Resources" title="API Reference" lead="A complete reference for integrating Claude into your applications." flush />
          <nav className="mt-6 flex flex-wrap gap-3 font-mono text-xs" aria-label="Page sections">
            {["Overview", "Authentication", "Models", "Basic Request", "Streaming", "Tool Use", "Rate Limits", "SDK"].map((s) => (
              <a
                key={s}
                href={`#${s.toLowerCase().replace(" ", "-")}`}
                className="border border-sand px-3 py-1 text-ink-muted transition-colors hover:border-clay hover:text-clay"
              >
                {s}
              </a>
            ))}
          </nav>
        </section>
      </Reveal>

      {/* Overview */}
      <Reveal index={0}>
        <section id="overview" className="py-12">
          <GuideBlock title="overview.md" variant="default">
            <h2 className="font-mono text-xl font-bold text-clay-dark"># Claude API Overview</h2>
            <div className="mt-4 space-y-3 text-ink-soft">
              <p>
                The Claude API is a REST API provided by{" "}
                <span className="text-ink-soft">Anthropic</span> that lets you integrate Claude&apos;s
                intelligence into any application. Whether you are building a customer support bot,
                a code review tool, a document analyzer, or a fully agentic system, the API gives
                you direct access to Claude&apos;s capabilities.
              </p>
              <p>
                The API differs from{" "}
                <Link href="/resources/claude-code" className="text-clay hover:underline">
                  Claude Code
                </Link>{" "}
                (which is a terminal tool for developers) in that it is meant for programmatic
                integration — you call it from your backend, your scripts, or your services.
              </p>
              <p>
                If you are new to Claude, start with our{" "}
                <Link href="/resources/getting-started" className="text-clay hover:underline">
                  Getting Started guide
                </Link>{" "}
                before diving into the API. Once comfortable, this guide covers everything you
                need to build production-grade applications.
              </p>
            </div>
          </GuideBlock>
        </section>
      </Reveal>

      {/* Authentication */}
      <Reveal index={1}>
        <section id="authentication" className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Authentication</h2>
          <GuideBlock title="authentication.md" variant="default">
            <div className="space-y-3 text-ink-soft">
              <p>
                All API requests require an API key passed in the{" "}
                <code className="text-ink-soft">x-api-key</code> header. Get your key from the{" "}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-clay hover:underline"
                >
                  Anthropic Console
                </a>
                .
              </p>
              <p>
                Never expose your API key in client-side code or public repositories. Always
                store it as an environment variable and access it from your server.
              </p>
            </div>
          </GuideBlock>

          <div className="mt-4">
            <GuideBlock title=".env" variant="code">
              <div className="space-y-1">
                <p className="text-ink-muted"># Store your key securely</p>
                <p className="text-clay">ANTHROPIC_API_KEY=sk-ant-...</p>
                <p className="mt-4 text-ink-muted"># Never commit this file to git</p>
                <p className="text-clay-dark">echo &quot;.env&quot; &gt;&gt; .gitignore</p>
              </div>
            </GuideBlock>
          </div>

          <div className="mt-4">
            <GuideBlock title="auth-header.ts" variant="code">
              <div className="space-y-1">
                <p className="text-ink-muted">{"// Correct: server-side only"}</p>
                <p className="text-clay">
                  {"const apiKey = process.env.ANTHROPIC_API_KEY;"}
                </p>
                <p className="mt-4 text-ink-muted">{"// Request header"}</p>
                <p className="text-clay-dark">
                  {'"x-api-key": apiKey,'}
                </p>
                <p className="text-clay-dark">
                  {'"anthropic-version": "2023-06-01",'}
                </p>
                <p className="text-clay-dark">
                  {'"content-type": "application/json"'}
                </p>
              </div>
            </GuideBlock>
          </div>
        </section>
      </Reveal>

      {/* Models */}
      <Reveal index={1}>
        <section id="models" className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Available Models</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {models.map((model) => (
              <div key={model.id} className="border border-sand bg-paper-card p-5">
                <span className="font-mono text-xs text-clay-dark">[{model.label}]</span>
                <p className="mt-2 font-mono text-sm font-bold text-clay">{model.id}</p>
                <p className="mt-2 text-sm text-ink-soft">{model.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-xs text-ink-muted">

            Check{" "}
            <a
              href="https://docs.anthropic.com/en/docs/about-claude/models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-soft hover:underline"
            >
              docs.anthropic.com/models
            </a>{" "}
            for the latest model IDs and context window sizes.
          </p>
        </section>
      </Reveal>

      {/* Basic Request */}
      <Reveal index={2}>
        <section id="basic-request" className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Basic Usage</h2>

          <GuideBlock title="basic-request.ts" variant="code">
            <div className="space-y-1 font-mono text-sm">
              <p className="text-ink-muted">{"// Using the Anthropic TypeScript SDK"}</p>
              <p className="text-ink-soft">import Anthropic from &quot;@anthropic-ai/sdk&quot;;</p>
              <p className="mt-3 text-ink-soft">
                {"const client = new Anthropic({"}
              </p>
              <p className="ml-4 text-ink-soft">
                {"apiKey: process.env.ANTHROPIC_API_KEY,"}
              </p>
              <p className="text-ink-soft">{"});"}</p>
              <p className="mt-3 text-ink-soft">
                {"const message = await client.messages.create({"}
              </p>
              <p className="ml-4 text-clay">{"model: \"claude-sonnet-4-5\","}</p>
              <p className="ml-4 text-clay">{"max_tokens: 1024,"}</p>
              <p className="ml-4 text-clay">{"messages: ["}</p>
              <p className="ml-8 text-clay-dark">
                {"{ role: \"user\", content: \"Explain recursion in simple terms.\" }"}
              </p>
              <p className="ml-4 text-clay">{"],"}</p>
              <p className="text-ink-soft">{"});"}</p>
              <p className="mt-3 text-ink-muted">{"// Access the response"}</p>
              <p className="text-ink-soft">
                {"console.log(message.content[0].text);"}
              </p>
            </div>
          </GuideBlock>

          <div className="mt-4">
            <GuideBlock title="response-structure.json" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-ink-muted">{"// Response object"}</p>
                <p className="text-ink-soft">{"{"}</p>
                <p className="ml-4 text-clay">{'"id": "msg_01XFDUDYJgAACzvnptvVoYEL",'}</p>
                <p className="ml-4 text-clay">{'"type": "message",'}</p>
                <p className="ml-4 text-clay">{'"role": "assistant",'}</p>
                <p className="ml-4 text-clay">{'"content": [{'}</p>
                <p className="ml-8 text-clay-dark">{'"type": "text",'}</p>
                <p className="ml-8 text-clay-dark">{'"text": "Recursion is..."'}</p>
                <p className="ml-4 text-clay">{"  }],"}</p>
                <p className="ml-4 text-clay">{'"model": "claude-sonnet-4-5",'}</p>
                <p className="ml-4 text-clay">
                  {'"stop_reason": "end_turn",'}
                </p>
                <p className="ml-4 text-clay">
                  {'"usage": { "input_tokens": 12, "output_tokens": 142 }'}
                </p>
                <p className="text-ink-soft">{"}"}</p>
              </div>
            </GuideBlock>
          </div>
        </section>
      </Reveal>

      {/* Streaming */}
      <Reveal index={2}>
        <section id="streaming" className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Streaming Responses</h2>
          <GuideBlock title="streaming.md" variant="default">
            <div className="space-y-3 text-ink-soft">
              <p>
                Streaming lets you display Claude&apos;s response as it generates, rather than
                waiting for the full reply. This is essential for chat interfaces and any
                experience where responsiveness matters.
              </p>
              <p>
                The API uses Server-Sent Events (SSE) for streaming. The TypeScript SDK handles
                this with an async iterator pattern.
              </p>
            </div>
          </GuideBlock>

          <div className="mt-4">
            <GuideBlock title="streaming.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-ink-muted">{"// Stream responses token by token"}</p>
                <p className="text-ink-soft">
                  {"const stream = client.messages.stream({"}
                </p>
                <p className="ml-4 text-clay">{"model: \"claude-sonnet-4-5\","}</p>
                <p className="ml-4 text-clay">{"max_tokens: 1024,"}</p>
                <p className="ml-4 text-clay">
                  {"messages: [{ role: \"user\", content: prompt }],"}
                </p>
                <p className="text-ink-soft">{"});"}</p>
                <p className="mt-3 text-ink-muted">{"// Process each chunk as it arrives"}</p>
                <p className="text-ink-soft">
                  {"for await (const chunk of stream) {"}
                </p>
                <p className="ml-4 text-ink-soft">
                  {"if (chunk.type === \"content_block_delta\") {"}
                </p>
                <p className="ml-8 text-clay-dark">{"process.stdout.write(chunk.delta.text);"}</p>
                <p className="ml-4 text-ink-soft">{"}"}</p>
                <p className="text-ink-soft">{"}"}</p>
                <p className="mt-3 text-ink-muted">{"// Get the final message"}</p>
                <p className="text-ink-soft">
                  {"const finalMessage = await stream.finalMessage();"}
                </p>
              </div>
            </GuideBlock>
          </div>
        </section>
      </Reveal>

      {/* Tool Use */}
      <Reveal index={3}>
        <section id="tool-use" className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Tool Use</h2>
          <GuideBlock title="tool-use.md" variant="default">
            <div className="space-y-3 text-ink-soft">
              <p>
                Tool use (also called function calling) lets Claude invoke functions you define.
                Claude decides when to call a tool, passes the right parameters, and you execute
                the function — returning the result for Claude to incorporate into its response.
              </p>
              <p>
                This is the foundation for building agentic applications: web search, database
                queries, API calls, file operations, and more.
              </p>
            </div>
          </GuideBlock>

          <div className="mt-4">
            <GuideBlock title="tool-definition.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-ink-muted">{"// Define a tool"}</p>
                <p className="text-ink-soft">{"const tools = [{"}</p>
                <p className="ml-4 text-clay">{"name: \"get_weather\","}</p>
                <p className="ml-4 text-clay">
                  {"description: \"Get current weather for a city\","}
                </p>
                <p className="ml-4 text-clay">{"input_schema: {"}</p>
                <p className="ml-8 text-clay-dark">{"type: \"object\","}</p>
                <p className="ml-8 text-clay-dark">{"properties: {"}</p>
                <p className="ml-12 text-ink-soft">
                  {"city: { type: \"string\", description: \"City name\" }"}
                </p>
                <p className="ml-8 text-clay-dark">{"},"}</p>
                <p className="ml-8 text-clay-dark">{"required: [\"city\"]"}</p>
                <p className="ml-4 text-clay">{"}"}</p>
                <p className="text-ink-soft">{"}];"}</p>
                <p className="mt-3 text-ink-muted">{"// Pass tools to the API"}</p>
                <p className="text-ink-soft">{"const response = await client.messages.create({"}</p>
                <p className="ml-4 text-clay">{"model: \"claude-sonnet-4-5\","}</p>
                <p className="ml-4 text-clay">{"max_tokens: 1024,"}</p>
                <p className="ml-4 text-clay">{"tools,"}</p>
                <p className="ml-4 text-clay">
                  {"messages: [{ role: \"user\", content: \"What is the weather in Nairobi?\" }]"}
                </p>
                <p className="text-ink-soft">{"});"}</p>
              </div>
            </GuideBlock>
          </div>
        </section>
      </Reveal>

      {/* System Prompts */}
      <Reveal index={3}>
        <section className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">System Prompts</h2>
          <GuideBlock title="system-prompts.ts" variant="code">
            <div className="space-y-1 font-mono text-sm">
              <p className="text-ink-muted">{"// System prompt sets Claude's behavior"}</p>
              <p className="text-ink-soft">{"const response = await client.messages.create({"}</p>
              <p className="ml-4 text-clay">{"model: \"claude-sonnet-4-5\","}</p>
              <p className="ml-4 text-clay">{"max_tokens: 1024,"}</p>
              <p className="ml-4 text-clay">
                {"system: \"You are a helpful assistant for Kenyan developers. " +
                  "You provide code examples in TypeScript and Python. " +
                  "Always mention community resources at claudekenya.org\","}
              </p>
              <p className="ml-4 text-clay">
                {"messages: [{ role: \"user\", content: userMessage }]"}
              </p>
              <p className="text-ink-soft">{"});"}</p>
            </div>
          </GuideBlock>
        </section>
      </Reveal>

      {/* Rate Limits */}
      <Reveal index={3}>
        <section id="rate-limits" className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Rate Limits</h2>
          <GuideBlock title="rate-limits.md" variant="default">
            <div className="space-y-3 text-ink-soft">
              <p>
                The API enforces rate limits on requests per minute (RPM) and tokens per minute
                (TPM). Your limits depend on your account tier. When you hit a limit, the API
                returns a <code className="text-ink-soft">429 Too Many Requests</code> response.
              </p>
              <p>
                For production applications, implement exponential backoff with jitter. Start
                with a 1-second delay, double on each retry, add random jitter, and cap at 60
                seconds. See our{" "}
                <Link href="/resources/production-guide" className="text-clay hover:underline">
                  Production Guide
                </Link>{" "}
                for complete retry logic.
              </p>
            </div>
          </GuideBlock>

          <div className="mt-4">
            <GuideBlock title="retry.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-ink-muted">{"// Exponential backoff with jitter"}</p>
                <p className="text-ink-soft">
                  {"async function callWithRetry(fn: () => Promise<unknown>, maxRetries = 3) {"}
                </p>
                <p className="ml-4 text-ink-soft">{"for (let i = 0; i <= maxRetries; i++) {"}</p>
                <p className="ml-8 text-ink-soft">{"try {"}</p>
                <p className="ml-12 text-clay">{"return await fn();"}</p>
                <p className="ml-8 text-ink-soft">{"} catch (err: unknown) {"}</p>
                <p className="ml-12 text-ink-soft">
                  {"if (err instanceof Anthropic.RateLimitError && i < maxRetries) {"}
                </p>
                <p className="ml-16 text-clay-dark">
                  {"const delay = Math.min(1000 * 2 ** i + Math.random() * 500, 60000);"}
                </p>
                <p className="ml-16 text-clay-dark">{"await new Promise(r => setTimeout(r, delay));"}</p>
                <p className="ml-12 text-ink-soft">{"} else throw err;"}</p>
                <p className="ml-8 text-ink-soft">{"}"}</p>
                <p className="ml-4 text-ink-soft">{"}"}</p>
                <p className="text-ink-soft">{"}"}</p>
              </div>
            </GuideBlock>
          </div>
        </section>
      </Reveal>

      {/* SDK Installation */}
      <Reveal index={4}>
        <section id="sdk" className="py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">SDK Installation</h2>
          <GuideBlock title="sdk-setup" variant="code">
            <div className="space-y-1">
              <p className="text-ink-muted"># TypeScript / JavaScript</p>
              <p className="text-clay">npm install @anthropic-ai/sdk</p>
              <p className="mt-4 text-ink-muted"># Python</p>
              <p className="text-clay">pip install anthropic</p>
            </div>
          </GuideBlock>
        </section>
      </Reveal>

      {/* Next Steps */}
      <Reveal index={4}>
        <section className="border-t border-sand py-12">
          <h2 className="mb-6 font-newsreader text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-ink">Next Steps</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/resources/production-guide"
              className="group border border-sand bg-paper-card p-5 transition-all hover:border-clay"
            >
              <p className="font-mono text-sm font-bold text-clay group-hover:underline">
                Production Guide →
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Error handling, retries, monitoring, and deploying Claude to production.
              </p>
            </Link>
            <Link
              href="/resources/claude-code"
              className="group border border-sand bg-paper-card p-5 transition-all hover:border-clay"
            >
              <p className="font-mono text-sm font-bold text-clay group-hover:underline">
                Claude Code Guide →
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Build software directly from your terminal with Claude Code CLI.
              </p>
            </Link>
            <Link
              href="/blog"
              className="group border border-sand bg-paper-card p-5 transition-all hover:border-clay"
            >
              <p className="font-mono text-sm font-bold text-clay group-hover:underline">
                Community Blog →
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Real examples and tutorials from Kenyan developers building with Claude.
              </p>
            </Link>
          </div>
          <p className="mt-8 font-sans text-ink-soft">
            Have questions or want to share what you built?{" "}
            <Link href="/join" className="text-clay hover:underline">
              Join Claude Community Kenya
            </Link>{" "}
            on Discord — our community members help each other troubleshoot API issues daily.
            Check out{" "}
            <Link href="/events" className="text-clay hover:underline">
              upcoming events
            </Link>{" "}
            for live workshops on Claude API development.
          </p>
        </section>
      </Reveal>
    </main>
  );
}
