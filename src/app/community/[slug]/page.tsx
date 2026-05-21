import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { getCommunitySubmissions, getCommunitySubmissionBySlug, getCommunityCommentsBySlug } from "@/lib/data"
import { SITE_CONFIG } from "@/lib/constants"
import { CommunitySubmissionDetail } from "./CommunitySubmissionDetail"

export const revalidate = 1800

export async function generateStaticParams() {
  const { items } = await getCommunitySubmissions().catch(() => ({ items: [] }))
  return items.map((item) => ({ slug: item.slug }))
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
      <CommunitySubmissionDetail
        submission={submission}
        comments={comments}
        descriptionParagraphs={descriptionParagraphs}
      />
    </main>
  )
}
