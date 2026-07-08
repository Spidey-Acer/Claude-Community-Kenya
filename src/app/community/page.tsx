import type { Metadata } from "next"
import { getCommunitySubmissions } from "@/lib/data"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { KaribuCommunity } from "@/components/karibu/KaribuCommunity"

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
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Community Hub" }]} />
      <KaribuCommunity items={items} total={total} activeType={type} activeSort={sort} />
    </>
  )
}
