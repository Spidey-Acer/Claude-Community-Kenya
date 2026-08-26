import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton"

/** Route skeleton for /showcase — mirrors ShowcaseFeed anatomy. */
export default function ShowcaseLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10"

  return (
    <SkeletonPage label="Loading showcase">
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Skeleton className="mb-4 h-3 w-32" />
            <Skeleton className="mb-3 h-11 w-96 max-w-full" delay={0.08} />
            <Skeleton className="h-5 w-full max-w-[600px]" delay={0.16} />
          </div>
          <Skeleton className="h-11 w-52 shrink-0 rounded-full" delay={0.2} />
        </div>
      </section>

      {/* Sort chips */}
      <section className={`${WRAP} pb-6`}>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" delay={0.24 + i * 0.04} />
          ))}
        </div>
      </section>

      {/* Post card grid */}
      <section className={`${WRAP} pb-16`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex h-full flex-col overflow-hidden rounded-2xl border border-sand">
              <Skeleton className="aspect-video w-full rounded-none" delay={0.4 + i * 0.06} />
              <div className="flex flex-1 flex-col p-5">
                <Skeleton className="mb-2 h-6 w-3/4" delay={0.4 + i * 0.06} />
                <Skeleton className="mb-4 h-4 w-full" delay={0.4 + i * 0.06} />
                <Skeleton className="mt-auto h-4 w-1/2" delay={0.4 + i * 0.06} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  )
}
