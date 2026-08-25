import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getShowcasePostBySlug } from "@/lib/showcase/queries"
import { getCommunityCommentsBySlug } from "@/lib/data"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { ShowcaseDetail } from "@/components/karibu/showcase/ShowcaseDetail"

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getShowcasePostBySlug(slug)
  if (!post) return { title: "Not found | Claude Community Kenya" }

  return {
    title: `${post.title} | Showcase | Claude Community Kenya`,
    description: post.shortDescription,
    alternates: { canonical: `https://www.claudekenya.org/showcase/${slug}` },
    openGraph: {
      title: post.title,
      description: post.shortDescription,
      url: `https://www.claudekenya.org/showcase/${slug}`,
      type: "article",
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl }] } : {}),
    },
  }
}

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getShowcasePostBySlug(slug)
  if (!post) notFound()

  const comments = await getCommunityCommentsBySlug(slug).catch(() => [])

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Showcase", url: "/showcase" },
          { name: post.title },
        ]}
      />
      <ShowcaseDetail post={post} comments={comments} />
    </>
  )
}
