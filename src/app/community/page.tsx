import type { Metadata } from "next"
import Link from "next/link"
import { ScrollReveal, CommandPrefix } from "@/components/terminal"
import { CommunityResourceCard } from "@/components/sections/CommunityResourceCard"
import { getCommunitySubmissions } from "@/lib/data"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { CommunityFilters } from "./CommunityFilters"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Community Hub | Claude Community Kenya",
  description:
    "Discover MCPs, prompts, workflows, and tools built by the Claude Community Kenya. Share your own creations.",
  alternates: {
    canonical: "https://www.claudekenya.org/community",
  },
  openGraph: {
    title: "Community Hub | Claude Community Kenya",
    description:
      "Discover MCPs, prompts, workflows, and tools built by the Claude Community Kenya.",
    url: "https://www.claudekenya.org/community",
    siteName: "Claude Community Kenya",
    type: "website",
  },
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const type = typeof params.type === "string" ? params.type : undefined
  const sort = typeof params.sort === "string" ? (params.sort as "recent" | "popular") : "recent"

  const { items, total } = await getCommunitySubmissions({ type, sort }).catch(() => ({ items: [], total: 0 }))

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Community Hub" }]} />
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <ScrollReveal>
          <section className="mb-12">
            <h1 className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl">
              <CommandPrefix />
              ls community/ --shared
            </h1>
            <p className="max-w-2xl font-sans text-lg text-text-secondary">
              MCPs, prompts, workflows, and tools built by the community.
              Browse what others have shared or submit your own.
            </p>
            <Link
              href="/community/submit"
              className="mt-6 inline-flex items-center gap-2 border border-green-primary bg-green-primary/10 px-6 py-3 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary"
            >
              <span aria-hidden="true">&gt;</span>
              Submit a Resource
            </Link>
          </section>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={100}>
          <CommunityFilters activeType={type} activeSort={sort} />
        </ScrollReveal>

        {/* Results count */}
        <ScrollReveal delay={150}>
          <p className="mb-6 font-mono text-xs text-text-dim">
            {total} {total === 1 ? "resource" : "resources"} found
          </p>
        </ScrollReveal>

        {/* Grid */}
        {items.length > 0 ? (
          <ScrollReveal
            stagger={100}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((submission) => (
              <CommunityResourceCard key={submission.slug} submission={submission} />
            ))}
          </ScrollReveal>
        ) : (
          <ScrollReveal>
            <div className="rounded border border-border-default bg-bg-card p-8 text-center">
              <p className="font-mono text-sm text-text-dim">
                No resources found{type ? ` for type "${type}"` : ""}.
              </p>
              <Link
                href="/community/submit"
                className="mt-4 inline-block font-mono text-sm text-green-primary hover:text-amber transition-colors"
              >
                Be the first to submit one &rarr;
              </Link>
            </div>
          </ScrollReveal>
        )}
      </div>
    </main>
  )
}
