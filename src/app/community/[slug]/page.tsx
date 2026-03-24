import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Github, Copy } from "lucide-react"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { getCommunitySubmissionBySlug, getCommunityCommentsBySlug } from "@/lib/data"
import { TerminalWindow, ScrollReveal } from "@/components/terminal"
import { UpvoteButton } from "@/components/community/UpvoteButton"
import { CommentForm } from "@/components/community/CommentForm"
import { CommentList } from "@/components/community/CommentList"
import { SITE_CONFIG } from "@/lib/constants"

export const dynamic = "force-dynamic"

const TYPE_LABELS: Record<string, string> = {
  MCP: "MCP Server",
  PROMPT: "Prompt Template",
  WORKFLOW: "Workflow",
  TOOL: "Tool / Project",
}

const TYPE_COLORS: Record<string, string> = {
  MCP: "text-cyan border-cyan/30 bg-cyan/10",
  PROMPT: "text-green-primary border-green-primary/30 bg-green-primary/10",
  WORKFLOW: "text-amber border-amber/30 bg-amber/10",
  TOOL: "text-green-dim border-green-dim/30 bg-green-dim/10",
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const submission = await getCommunitySubmissionBySlug(slug)

  if (!submission) {
    return { title: "Resource Not Found | Claude Community Kenya" }
  }

  return {
    title: `${submission.title} | Community Hub | Claude Community Kenya`,
    description: submission.shortDescription,
    alternates: {
      canonical: `${SITE_CONFIG.url}/community/${submission.slug}`,
    },
    openGraph: {
      title: submission.title,
      description: submission.shortDescription,
      url: `${SITE_CONFIG.url}/community/${submission.slug}`,
      siteName: SITE_CONFIG.name,
      type: "article",
    },
  }
}

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [submission, comments] = await Promise.all([
    getCommunitySubmissionBySlug(slug),
    getCommunityCommentsBySlug(slug),
  ])

  if (!submission) {
    notFound()
  }

  const descriptionParagraphs = submission.fullDescription.split("\n\n")

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Community Hub", url: "/community" },
          { name: submission.title },
        ]}
      />
      <div className="mx-auto max-w-4xl">
        <Link
          href="/community"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Community Hub
        </Link>

        <ScrollReveal>
          <header className="mb-10">
            {/* Type badge */}
            <div className="mb-4">
              <span
                className={`inline-block rounded-sm border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${TYPE_COLORS[submission.type] ?? ""}`}
              >
                {TYPE_LABELS[submission.type] ?? submission.type}
              </span>
            </div>

            <h1 className="mb-4 font-mono text-3xl font-bold text-text-primary sm:text-4xl lg:text-5xl">
              {submission.title}
            </h1>

            <p className="mb-6 font-sans text-lg text-text-secondary">
              {submission.shortDescription}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4">
              <UpvoteButton slug={submission.slug} initialCount={submission.upvoteCount} />

              {submission.submitterName && (
                <span className="font-mono text-sm text-text-dim">
                  by {submission.submitterName}
                </span>
              )}

              <span className="font-mono text-xs text-text-dim">
                {new Date(submission.createdAt).toLocaleDateString("en-KE", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </header>
        </ScrollReveal>

        {/* Links */}
        {(submission.url || submission.repoUrl) && (
          <ScrollReveal delay={50}>
            <div className="mb-8 flex flex-wrap gap-3">
              {submission.url && (
                <a
                  href={submission.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-green-primary/30 bg-green-primary/5 px-4 py-2 font-mono text-sm text-green-primary transition-all hover:bg-green-primary/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit Resource
                </a>
              )}
              {submission.repoUrl && (
                <a
                  href={submission.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                >
                  <Github className="h-4 w-4" />
                  GitHub Repo
                </a>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* Tags */}
        {submission.tags.length > 0 && (
          <ScrollReveal delay={75}>
            <div className="mb-8 flex flex-wrap gap-2">
              {submission.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-border-default px-2.5 py-1 font-mono text-xs text-text-dim"
                >
                  {tag}
                </span>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Full description */}
        <ScrollReveal delay={100}>
          <section className="mb-10">
            <TerminalWindow title={`cat community/${submission.slug}/README.md`} variant="default">
              <div className="space-y-4">
                {descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-text-secondary leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </TerminalWindow>
          </section>
        </ScrollReveal>

        {/* Install instructions */}
        {submission.installInstructions && (
          <ScrollReveal delay={150}>
            <section className="mb-10">
              <h2 className="mb-4 font-mono text-xl font-semibold text-green-primary">
                <span className="text-text-dim">## </span>Installation
              </h2>
              <TerminalWindow title="install.sh" variant="command">
                <div className="relative">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-text-secondary">
                    {submission.installInstructions}
                  </pre>
                  <CopyButton text={submission.installInstructions} />
                </div>
              </TerminalWindow>
            </section>
          </ScrollReveal>
        )}

        {/* Comments */}
        <ScrollReveal delay={200}>
          <section className="border-t border-border-default pt-10">
            <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
              <span className="text-text-dim">## </span>
              Comments ({comments.length})
            </h2>

            <div className="mb-8">
              <CommentForm slug={submission.slug} />
            </div>

            <CommentList comments={comments} />
          </section>
        </ScrollReveal>
      </div>
    </main>
  )
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="absolute right-2 top-2 rounded border border-border-default p-1.5 text-text-dim transition-colors hover:border-green-primary/50 hover:text-green-primary"
      aria-label="Copy to clipboard"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  )
}
