/**
 * ShowcaseCard: one showcase post in the feed grid. A thin wrapper over the
 * page kit's `WorkCard`, which owns the markup; this keeps the post-shaped
 * prop the feed already passes.
 */

import { WorkCard } from "@/components/karibu/kit"
import type { ShowcasePostView } from "@/lib/showcase/queries"

interface ShowcaseCardProps {
  post: ShowcasePostView
}

export function ShowcaseCard({ post }: ShowcaseCardProps) {
  return <WorkCard submission={post} />
}
