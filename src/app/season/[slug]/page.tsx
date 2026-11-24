import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { KaribuSeason } from "@/components/karibu/KaribuSeason"
import { findSeason } from "@/data/seasons"
import { SITE_CONFIG } from "@/lib/constants"
import { getSeasonData } from "@/lib/seasons/queries"

/** Short revalidate so the "next date" highlight moves on within minutes. */
export const revalidate = 600

interface SeasonPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const { slug } = await params
  const season = findSeason(slug)
  if (!season) return { title: "Season Not Found | Claude Community Kenya" }
  return {
    title: `${season.name} | Claude Community Kenya`,
    description: season.intro,
    alternates: { canonical: `${SITE_CONFIG.url}/season/${season.slug}` },
  }
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { slug } = await params
  const season = findSeason(slug)
  if (!season) notFound()

  const data = await getSeasonData(season)
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: season.name }]} />
      <KaribuSeason season={season} data={data} />
    </>
  )
}
