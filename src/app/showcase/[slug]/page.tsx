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
  if (!post) return { title: "Not found" }

  return {
    title: `${post.title} | Showcase`,
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

  // Comments are non-critical to the post itself; if their fetch fails the
  // page still renders, but the section says so instead of "No comments yet".
  let comments: Awaited<ReturnType<typeof getCommunityCommentsBySlug>> = []
  let commentsFailed = false
  try {
    comments = await getCommunityCommentsBySlug(slug)
  } catch (error) {
    console.error("[SHOWCASE] Failed to load comments for post:", slug, error)
    commentsFailed = true
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Showcase", url: "/showcase" },
          { name: post.title },
        ]}
      />
      <ShowcaseDetail post={post} comments={comments} commentsFailed={commentsFailed} />
    </>
  )
}
