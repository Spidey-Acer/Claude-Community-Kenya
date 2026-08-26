import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { getTeamMembers } from "@/lib/data"
import { KaribuTeam } from "@/components/karibu/KaribuTeam"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "The team behind CCK",
  description:
    "Meet the organizers, ambassadors, and contributors who run Claude Community Kenya — Kenya's independent, volunteer-run Claude developer community.",
  alternates: { canonical: "https://www.claudekenya.org/team" },
  openGraph: {
    title: "The team behind CCK",
    description:
      "Meet the organizers and ambassadors running Kenya's independent, volunteer-run Claude developer community.",
    url: "https://www.claudekenya.org/team",
    siteName: "Claude Community Kenya",
    type: "website",
  },
}

export default async function TeamPage() {
  const members = await getTeamMembers().catch(() => [])

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Team" }]} />
      <KaribuTeam members={members} />
    </>
  )
}
