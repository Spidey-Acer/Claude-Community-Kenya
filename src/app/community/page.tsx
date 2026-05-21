import type { Metadata } from "next"
import { ScrollReveal } from "@/components/terminal"
import { CommunityResourceCard } from "@/components/sections/CommunityResourceCard"
import { getCommunitySubmissions } from "@/lib/data"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { CommunityFilters } from "./CommunityFilters"
import { CommunityHeader, CommunityEmpty, CommunityCountChip } from "./CommunityHeader"

export const revalidate = 1800

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
        <CommunityHeader />

        {/* Filters */}
        <ScrollReveal delay={100}>
          <CommunityFilters activeType={type} activeSort={sort} />
        </ScrollReveal>

        {/* Results count */}
        <ScrollReveal delay={150}>
          <CommunityCountChip total={total} />
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
            <CommunityEmpty type={type} />
          </ScrollReveal>
        )}
      </div>
    </main>
  )
}
