import type { Metadata } from "next"
import { getShowcasePosts } from "@/lib/showcase/queries"
import { isShowcaseSort } from "@/lib/showcase/ranking"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { ShowcaseFeed } from "@/components/karibu/showcase/ShowcaseFeed"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Showcase | Claude Community Kenya",
  description:
    "What the Claude Community Kenya is building — projects, demos and works in progress from members across the country.",
  alternates: { canonical: "https://www.claudekenya.org/showcase" },
  openGraph: {
    title: "Showcase | Claude Community Kenya",
    description: "What the Claude Community Kenya is building.",
    url: "https://www.claudekenya.org/showcase",
    siteName: "Claude Community Kenya",
    type: "website",
  },
}

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawSort = typeof params.sort === "string" ? params.sort : "hot"
  const sort = isShowcaseSort(rawSort) ? rawSort : "hot"
  const eventId = typeof params.event === "string" ? params.event : undefined
  const need = typeof params.need === "string" ? params.need : undefined

  const { items, total } = await getShowcasePosts({ sort, eventId, need }).catch(() => ({
    items: [],
    total: 0,
  }))

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Showcase" }]} />
      <ShowcaseFeed
        items={items}
        total={total}
        activeSort={sort}
        activeEvent={eventId}
        activeNeed={need}
      />
    </>
  )
}
