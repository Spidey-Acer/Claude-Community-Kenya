import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton"

/** Route skeleton for /community/[slug] — mirrors CommunitySubmissionDetail anatomy. */
export default function CommunitySubmissionLoading() {
  return (
    <SkeletonPage label="Loading community resource">
      <div className="mx-auto max-w-[820px] px-6 pb-20 pt-12 md:px-10">
        <Skeleton className="mb-8 h-4 w-44" />
        <Skeleton className="mb-4 h-5 w-24 rounded-full" delay={0.06} />
        <Skeleton className="mb-3 h-10 w-3/4" delay={0.12} />
        <Skeleton className="mb-4 h-5 w-full" delay={0.18} />
        <Skeleton className="mb-8 h-9 w-40 rounded-full" delay={0.24} />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" delay={0.3} />
          <Skeleton className="h-4 w-full" delay={0.34} />
          <Skeleton className="h-4 w-2/3" delay={0.38} />
        </div>
      </div>
    </SkeletonPage>
  )
}
