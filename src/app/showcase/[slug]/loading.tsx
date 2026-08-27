import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton"

/** Route skeleton for /showcase/[slug] — mirrors ShowcaseDetail anatomy. */
export default function ShowcasePostLoading() {
  return (
    <SkeletonPage label="Loading showcase post">
      <div className="mx-auto max-w-[820px] px-6 pb-20 pt-12 md:px-10">
        <Skeleton className="mb-8 h-4 w-36" />
        <Skeleton className="mb-3 h-10 w-3/4" delay={0.08} />
        <Skeleton className="mb-4 h-5 w-full" delay={0.16} />
        <Skeleton className="mb-8 h-4 w-48" delay={0.2} />
        <Skeleton className="aspect-video w-full rounded-2xl" delay={0.24} />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-full" delay={0.32} />
          <Skeleton className="h-4 w-full" delay={0.36} />
          <Skeleton className="h-4 w-2/3" delay={0.4} />
        </div>
      </div>
    </SkeletonPage>
  )
}
