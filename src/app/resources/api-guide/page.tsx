import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TerminalWindow, CommandPrefix, ScrollReveal } from "@/components/terminal";
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
            man claude-api
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text-secondary">
            A complete reference for integrating Claude into your applications via the Anthropic API.
          </p>
          <nav className="mt-6 flex flex-wrap gap-3 font-mono text-xs" aria-label="Page sections">
            {["Overview", "Authentication", "Models", "Basic Request", "Streaming", "Tool Use", "Rate Limits", "SDK"].map((s) => (
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

      {/* Overview */}
      <ScrollReveal delay={100}>
        <section id="overview" className="py-12">
          <TerminalWindow title="overview.md" variant="default">
            <h2 className="font-mono text-xl font-bold text-amber"># Claude API Overview</h2>
            <div className="mt-4 space-y-3 text-text-secondary">
              <p>
                The Claude API is a REST API provided by{" "}
                <span className="text-cyan">Anthropic</span> that lets you integrate Claude's
                intelligence into any application. Whether you are building a customer support bot,
                a code review tool, a document analyzer, or a fully agentic system, the API gives
                you direct access to Claude's capabilities.
              </p>
              <p>
                The API differs from{" "}
                <Link href="/resources/claude-code" className="text-green-primary hover:underline">
                  Claude Code
                </Link>{" "}
                (which is a terminal tool for developers) in that it is meant for programmatic
                integration — you call it from your backend, your scripts, or your services.
              </p>
              <p>
                If you are new to Claude, start with our{" "}
                <Link href="/resources/getting-started" className="text-green-primary hover:underline">
                  Getting Started guide
                </Link>{" "}
                before diving into the API. Once comfortable, this guide covers everything you
                need to build production-grade applications.
              </p>
            </div>
          </TerminalWindow>
        </section>
      </ScrollReveal>

      {/* Authentication */}
      <ScrollReveal delay={150}>
        <section id="authentication" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            export ANTHROPIC_API_KEY=&quot;...&quot;
          </h2>
          <TerminalWindow title="authentication.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                All API requests require an API key passed in the{" "}
                <code className="text-cyan">x-api-key</code> header. Get your key from the{" "}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-primary hover:underline"
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
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title=".env" variant="code">
              <div className="space-y-1">
                <p className="text-text-dim"># Store your key securely</p>
                <p className="text-green-primary">ANTHROPIC_API_KEY=sk-ant-...</p>
                <p className="mt-4 text-text-dim"># Never commit this file to git</p>
                <p className="text-amber">echo &quot;.env&quot; &gt;&gt; .gitignore</p>
              </div>
            </TerminalWindow>
          </div>

          <div className="mt-4">
            <TerminalWindow title="auth-header.ts" variant="code">
              <div className="space-y-1">
                <p className="text-text-dim">// Correct: server-side only</p>
                <p className="text-green-primary">
                  {"const apiKey = process.env.ANTHROPIC_API_KEY;"}
                </p>
                <p className="mt-4 text-text-dim">// Request header</p>
                <p className="text-amber">
                  {'"x-api-key": apiKey,'}
                </p>
                <p className="text-amber">
                  {'"anthropic-version": "2023-06-01",'}
                </p>
                <p className="text-amber">
                  {'"content-type": "application/json"'}
                </p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* Models */}
      <ScrollReveal delay={200}>
        <section id="models" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            claude models --list
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {models.map((model) => (
              <div key={model.id} className="border border-border-default bg-bg-card p-5">
                <span className="font-mono text-xs text-amber">[{model.label}]</span>
                <p className="mt-2 font-mono text-sm font-bold text-green-primary">{model.id}</p>
                <p className="mt-2 text-sm text-text-secondary">{model.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-xs text-text-dim">
            <CommandPrefix symbol="#" />
            Check{" "}
            <a
              href="https://docs.anthropic.com/en/docs/about-claude/models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:underline"
            >
              docs.anthropic.com/models
            </a>{" "}
            for the latest model IDs and context window sizes.
          </p>
        </section>
      </ScrollReveal>

      {/* Basic Request */}
      <ScrollReveal delay={250}>
        <section id="basic-request" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            curl https://api.anthropic.com/v1/messages
          </h2>

          <TerminalWindow title="basic-request.ts" variant="code">
            <div className="space-y-1 font-mono text-sm">
              <p className="text-text-dim">// Using the Anthropic TypeScript SDK</p>
              <p className="text-cyan">import Anthropic from &quot;@anthropic-ai/sdk&quot;;</p>
              <p className="mt-3 text-text-secondary">
                {"const client = new Anthropic({"}
              </p>
              <p className="ml-4 text-text-secondary">
                {"apiKey: process.env.ANTHROPIC_API_KEY,"}
              </p>
              <p className="text-text-secondary">{"});"}</p>
              <p className="mt-3 text-text-secondary">
                {"const message = await client.messages.create({"}
              </p>
              <p className="ml-4 text-green-primary">{"model: \"claude-sonnet-4-5\","}</p>
              <p className="ml-4 text-green-primary">{"max_tokens: 1024,"}</p>
              <p className="ml-4 text-green-primary">{"messages: ["}</p>
              <p className="ml-8 text-amber">
                {"{ role: \"user\", content: \"Explain recursion in simple terms.\" }"}
              </p>
              <p className="ml-4 text-green-primary">{"],"}</p>
              <p className="text-text-secondary">{"});"}</p>
              <p className="mt-3 text-text-dim">{"// Access the response"}</p>
              <p className="text-text-secondary">
                {"console.log(message.content[0].text);"}
              </p>
            </div>
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title="response-structure.json" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-text-dim">// Response object</p>
                <p className="text-text-secondary">{"{"}</p>
                <p className="ml-4 text-green-primary">{'"id": "msg_01XFDUDYJgAACzvnptvVoYEL",'}</p>
                <p className="ml-4 text-green-primary">{'"type": "message",'}</p>
                <p className="ml-4 text-green-primary">{'"role": "assistant",'}</p>
                <p className="ml-4 text-green-primary">{'"content": [{'}</p>
                <p className="ml-8 text-amber">{'"type": "text",'}</p>
                <p className="ml-8 text-amber">{'"text": "Recursion is..."'}</p>
                <p className="ml-4 text-green-primary">{"  }],"}</p>
                <p className="ml-4 text-green-primary">{'"model": "claude-sonnet-4-5",'}</p>
                <p className="ml-4 text-green-primary">
                  {'"stop_reason": "end_turn",'}
                </p>
                <p className="ml-4 text-green-primary">
                  {'"usage": { "input_tokens": 12, "output_tokens": 142 }'}
                </p>
                <p className="text-text-secondary">{"}"}</p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* Streaming */}
      <ScrollReveal delay={300}>
        <section id="streaming" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            claude --stream
          </h2>
          <TerminalWindow title="streaming.md" variant="default">
            <div className="space-y-3 text-text-secondary">
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
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title="streaming.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-text-dim">// Stream responses token by token</p>
                <p className="text-text-secondary">
                  {"const stream = client.messages.stream({"}
                </p>
                <p className="ml-4 text-green-primary">{"model: \"claude-sonnet-4-5\","}</p>
                <p className="ml-4 text-green-primary">{"max_tokens: 1024,"}</p>
                <p className="ml-4 text-green-primary">
                  {"messages: [{ role: \"user\", content: prompt }],"}
                </p>
                <p className="text-text-secondary">{"});"}</p>
                <p className="mt-3 text-text-dim">{"// Process each chunk as it arrives"}</p>
                <p className="text-text-secondary">
                  {"for await (const chunk of stream) {"}
                </p>
                <p className="ml-4 text-text-secondary">
                  {"if (chunk.type === \"content_block_delta\") {"}
                </p>
                <p className="ml-8 text-amber">{"process.stdout.write(chunk.delta.text);"}</p>
                <p className="ml-4 text-text-secondary">{"}"}</p>
                <p className="text-text-secondary">{"}"}</p>
                <p className="mt-3 text-text-dim">{"// Get the final message"}</p>
                <p className="text-text-secondary">
                  {"const finalMessage = await stream.finalMessage();"}
                </p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* Tool Use */}
      <ScrollReveal delay={350}>
        <section id="tool-use" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            claude --tools
          </h2>
          <TerminalWindow title="tool-use.md" variant="default">
            <div className="space-y-3 text-text-secondary">
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
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title="tool-definition.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-text-dim">// Define a tool</p>
                <p className="text-text-secondary">{"const tools = [{"}</p>
                <p className="ml-4 text-green-primary">{"name: \"get_weather\","}</p>
                <p className="ml-4 text-green-primary">
                  {"description: \"Get current weather for a city\","}
                </p>
                <p className="ml-4 text-green-primary">{"input_schema: {"}</p>
                <p className="ml-8 text-amber">{"type: \"object\","}</p>
                <p className="ml-8 text-amber">{"properties: {"}</p>
                <p className="ml-12 text-text-secondary">
                  {"city: { type: \"string\", description: \"City name\" }"}
                </p>
                <p className="ml-8 text-amber">{"},"}</p>
                <p className="ml-8 text-amber">{"required: [\"city\"]"}</p>
                <p className="ml-4 text-green-primary">{"}"}</p>
                <p className="text-text-secondary">{"}];"}</p>
                <p className="mt-3 text-text-dim">{"// Pass tools to the API"}</p>
                <p className="text-text-secondary">{"const response = await client.messages.create({"}</p>
                <p className="ml-4 text-green-primary">{"model: \"claude-sonnet-4-5\","}</p>
                <p className="ml-4 text-green-primary">{"max_tokens: 1024,"}</p>
                <p className="ml-4 text-green-primary">{"tools,"}</p>
                <p className="ml-4 text-green-primary">
                  {"messages: [{ role: \"user\", content: \"What is the weather in Nairobi?\" }]"}
                </p>
                <p className="text-text-secondary">{"});"}</p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* System Prompts */}
      <ScrollReveal delay={380}>
        <section className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            claude --system &quot;You are...&quot;
          </h2>
          <TerminalWindow title="system-prompts.ts" variant="code">
            <div className="space-y-1 font-mono text-sm">
              <p className="text-text-dim">{"// System prompt sets Claude's behavior"}</p>
              <p className="text-text-secondary">{"const response = await client.messages.create({"}</p>
              <p className="ml-4 text-green-primary">{"model: \"claude-sonnet-4-5\","}</p>
              <p className="ml-4 text-green-primary">{"max_tokens: 1024,"}</p>
              <p className="ml-4 text-green-primary">
                {"system: \"You are a helpful assistant for Kenyan developers. " +
                  "You provide code examples in TypeScript and Python. " +
                  "Always mention community resources at claudekenya.org\","}
              </p>
              <p className="ml-4 text-green-primary">
                {"messages: [{ role: \"user\", content: userMessage }]"}
              </p>
              <p className="text-text-secondary">{"});"}</p>
            </div>
          </TerminalWindow>
        </section>
      </ScrollReveal>

      {/* Rate Limits */}
      <ScrollReveal delay={400}>
        <section id="rate-limits" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            claude --rate-limits
          </h2>
          <TerminalWindow title="rate-limits.md" variant="default">
            <div className="space-y-3 text-text-secondary">
              <p>
                The API enforces rate limits on requests per minute (RPM) and tokens per minute
                (TPM). Your limits depend on your account tier. When you hit a limit, the API
                returns a <code className="text-cyan">429 Too Many Requests</code> response.
              </p>
              <p>
                For production applications, implement exponential backoff with jitter. Start
                with a 1-second delay, double on each retry, add random jitter, and cap at 60
                seconds. See our{" "}
                <Link href="/resources/production-guide" className="text-green-primary hover:underline">
                  Production Guide
                </Link>{" "}
                for complete retry logic.
              </p>
            </div>
          </TerminalWindow>

          <div className="mt-4">
            <TerminalWindow title="retry.ts" variant="code">
              <div className="space-y-1 font-mono text-sm">
                <p className="text-text-dim">{"// Exponential backoff with jitter"}</p>
                <p className="text-text-secondary">
                  {"async function callWithRetry(fn: () => Promise<unknown>, maxRetries = 3) {"}
                </p>
                <p className="ml-4 text-text-secondary">{"for (let i = 0; i <= maxRetries; i++) {"}</p>
                <p className="ml-8 text-text-secondary">{"try {"}</p>
                <p className="ml-12 text-green-primary">{"return await fn();"}</p>
                <p className="ml-8 text-text-secondary">{"} catch (err: unknown) {"}</p>
                <p className="ml-12 text-text-secondary">
                  {"if (err instanceof Anthropic.RateLimitError && i < maxRetries) {"}
                </p>
                <p className="ml-16 text-amber">
                  {"const delay = Math.min(1000 * 2 ** i + Math.random() * 500, 60000);"}
                </p>
                <p className="ml-16 text-amber">{"await new Promise(r => setTimeout(r, delay));"}</p>
                <p className="ml-12 text-text-secondary">{"} else throw err;"}</p>
                <p className="ml-8 text-text-secondary">{"}"}</p>
                <p className="ml-4 text-text-secondary">{"}"}</p>
                <p className="text-text-secondary">{"}"}</p>
              </div>
            </TerminalWindow>
          </div>
        </section>
      </ScrollReveal>

      {/* SDK Installation */}
      <ScrollReveal delay={450}>
        <section id="sdk" className="py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            npm install @anthropic-ai/sdk
          </h2>
          <TerminalWindow title="sdk-setup" variant="code">
            <div className="space-y-1">
              <p className="text-text-dim"># TypeScript / JavaScript</p>
              <p className="text-green-primary">npm install @anthropic-ai/sdk</p>
              <p className="mt-4 text-text-dim"># Python</p>
              <p className="text-green-primary">pip install anthropic</p>
            </div>
          </TerminalWindow>
        </section>
      </ScrollReveal>

      {/* Next Steps */}
      <ScrollReveal delay={500}>
        <section className="border-t border-border-default py-12">
          <h2 className="mb-6 font-mono text-xl font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            cat ./next-steps.md
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/resources/production-guide"
              className="group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/50"
            >
              <p className="font-mono text-sm font-bold text-green-primary group-hover:underline">
                Production Guide →
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Error handling, retries, monitoring, and deploying Claude to production.
              </p>
            </Link>
            <Link
              href="/resources/claude-code"
              className="group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/50"
            >
              <p className="font-mono text-sm font-bold text-green-primary group-hover:underline">
                Claude Code Guide →
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Build software directly from your terminal with Claude Code CLI.
              </p>
            </Link>
            <Link
              href="/blog"
              className="group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/50"
            >
              <p className="font-mono text-sm font-bold text-green-primary group-hover:underline">
                Community Blog →
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Real examples and tutorials from Kenyan developers building with Claude.
              </p>
            </Link>
          </div>
          <p className="mt-8 font-sans text-text-secondary">
            Have questions or want to share what you built?{" "}
            <Link href="/join" className="text-green-primary hover:underline">
              Join Claude Community Kenya
            </Link>{" "}
            on Discord — our community members help each other troubleshoot API issues daily.
            Check out{" "}
            <Link href="/events" className="text-green-primary hover:underline">
              upcoming events
            </Link>{" "}
            for live workshops on Claude API development.
          </p>
        </section>
      </ScrollReveal>
    </main>
  );
}
