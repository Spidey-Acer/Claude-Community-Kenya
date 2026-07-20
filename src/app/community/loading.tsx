import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /community — mirrors KaribuCommunity anatomy. */
export default function CommunityLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

  return (
    <SkeletonPage label="Loading community hub">
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Skeleton className="mb-4 h-3 w-28" />
            <Skeleton className="mb-3 h-11 w-80 max-w-full" delay={0.08} />
            <Skeleton className="h-5 w-full max-w-[600px]" delay={0.16} />
          </div>
          <Skeleton className="h-11 w-48 shrink-0 rounded-full" delay={0.2} />
        </div>
      </section>

      {/* Filter chips */}
      <section className={`${WRAP} pb-6`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" delay={0.24 + i * 0.04} />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-7 w-16 rounded-full" delay={0.44} />
            <Skeleton className="h-7 w-16 rounded-full" delay={0.48} />
          </div>
        </div>
      </section>

      {/* Submission card grid */}
      <section className={`${WRAP} pb-16`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex h-full flex-col rounded-2xl border border-sand p-6">
              <Skeleton className="mb-3 h-5 w-20 rounded-full" delay={0.5 + i * 0.08} />
              <Skeleton className="mb-2 h-6 w-3/4" delay={0.5 + i * 0.08} />
              <Skeleton className="mb-4 h-4 w-full" delay={0.5 + i * 0.08} />
              <div className="mb-4 flex gap-1.5">
                <Skeleton className="h-5 w-12 rounded-full" delay={0.5 + i * 0.08} />
                <Skeleton className="h-5 w-12 rounded-full" delay={0.5 + i * 0.08} />
              </div>
              <Skeleton className="h-4 w-full border-t border-sand pt-3" delay={0.5 + i * 0.08} />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
