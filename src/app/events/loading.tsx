import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /events — mirrors KaribuEvents anatomy. */
export default function EventsLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

  return (
    <SkeletonPage label="Loading events">
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`}>
        <Skeleton className="mb-4 h-3 w-32" />
        <Skeleton className="mb-[18px] h-11 w-2/3 max-w-md" />
        <Skeleton className="mb-7 h-5 w-full max-w-[560px]" delay={0.08} />
        <div className="flex flex-wrap gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" delay={0.16 + i * 0.04} />
          ))}
        </div>
      </section>

      {/* Featured "Next up" card */}
      <section className={`${WRAP} py-5`}>
        <div className="grid overflow-hidden rounded-2xl border border-sand md:grid-cols-[minmax(0,300px)_1fr] lg:grid-cols-[380px_1fr]">
          <Skeleton className="aspect-square w-full" delay={0.24} />
          <div className="p-8 md:p-[34px]">
            <div className="mb-3.5 flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" delay={0.28} />
              <Skeleton className="h-6 w-20 rounded-full" delay={0.32} />
            </div>
            <Skeleton className="mb-2.5 h-3 w-3/4" delay={0.36} />
            <Skeleton className="mb-3.5 h-8 w-full" delay={0.4} />
            <Skeleton className="mb-5 h-5 w-full" delay={0.44} />
            <Skeleton className="h-11 w-40 rounded-full" delay={0.48} />
          </div>
        </div>
      </section>

      {/* Upcoming list rows */}
      <section className={`${WRAP} pb-16 pt-2`}>
        <Skeleton className="mb-2 h-3 w-40" delay={0.5} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[84px_1fr] items-center gap-5 border-b border-sand py-5 sm:grid-cols-[120px_1fr_auto] sm:gap-[26px]">
            <Skeleton className="h-16 w-full" delay={0.5 + i * 0.04} />
            <div>
              <Skeleton className="mb-1.5 h-5 w-32" delay={0.5 + i * 0.04} />
              <Skeleton className="h-6 w-2/3" delay={0.5 + i * 0.04} />
            </div>
            <Skeleton className="col-span-2 h-9 w-24 rounded-full sm:col-span-1" delay={0.5 + i * 0.04} />
          </div>
        ))}
      </section>
    </SkeletonPage>
  );
}
