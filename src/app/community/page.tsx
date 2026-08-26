import type { Metadata } from "next"
import { getCommunitySubmissions } from "@/lib/data"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { KaribuCommunity } from "@/components/karibu/KaribuCommunity"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "Community Hub",
  description:
    "Discover MCPs, prompts, workflows, and tools built by the Claude Community Kenya. Share your own creations.",
  alternates: {
    canonical: "https://www.claudekenya.org/community",
  },
  openGraph: {
    title: "Community Hub",
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
  // Validate rather than cast: an unknown type would otherwise throw inside
  // Prisma's enum coercion and surface as a misleading empty feed.
  const VALID_TYPES = ["MCP", "PROMPT", "WORKFLOW", "TOOL"]
  const type =
    typeof params.type === "string" && VALID_TYPES.includes(params.type) ? params.type : undefined
  const sort = params.sort === "popular" ? ("popular" as const) : ("recent" as const)
  const rawPage = typeof params.page === "string" ? parseInt(params.page, 10) : 1
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1

  // A database failure must not render as a cheerful "nothing here yet" —
  // the feed distinguishes an outage from a genuinely empty hub.
  let items: Awaited<ReturnType<typeof getCommunitySubmissions>>["items"] = []
  let total = 0
  let dbError = false
  try {
    ;({ items, total } = await getCommunitySubmissions({ type, sort, page }))
  } catch (error) {
    console.error("[COMMUNITY] Failed to load submissions feed:", error)
    dbError = true
  }

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Community Hub" }]} />
      <KaribuCommunity
        items={items}
        total={total}
        activeType={type}
        activeSort={sort}
        page={page}
        dbError={dbError}
      />
    </>
  )
}
