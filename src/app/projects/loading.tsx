import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /projects — mirrors KaribuProjectsPage anatomy. */
export default function ProjectsLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

  return (
    <SkeletonPage label="Loading projects">
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`}>
        <Skeleton className="mb-4 h-3 w-28" />
        <Skeleton className="mb-4 h-11 w-2/3 max-w-lg" delay={0.08} />
        <Skeleton className="h-5 w-full max-w-[600px]" delay={0.16} />
      </section>

      {/* Submit CTA band */}
      <section className={`${WRAP} py-4`}>
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-sand p-7 sm:flex-row">
          <div className="w-full sm:w-auto">
            <Skeleton className="mb-2 h-6 w-56" delay={0.24} />
            <Skeleton className="h-4 w-72" delay={0.28} />
          </div>
          <Skeleton className="h-11 w-44 shrink-0 rounded-full" delay={0.32} />
        </div>
      </section>

      {/* Project card grid */}
      <section className={`${WRAP} pb-16 pt-4`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex h-full flex-col rounded-2xl border border-sand p-6">
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-4 w-16" delay={0.4 + i * 0.08} />
                <Skeleton className="h-5 w-20 rounded-full" delay={0.42 + i * 0.08} />
              </div>
              <Skeleton className="mb-1 h-6 w-2/3" delay={0.44 + i * 0.08} />
              <Skeleton className="mb-3 h-3 w-24" delay={0.46 + i * 0.08} />
              <Skeleton className="mb-4 h-4 w-full" delay={0.48 + i * 0.08} />
              <div className="mb-4 flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" delay={0.5 + i * 0.08} />
                <Skeleton className="h-5 w-14 rounded-full" delay={0.5 + i * 0.08} />
              </div>
              <Skeleton className="h-4 w-32 border-t border-sand pt-3" delay={0.5 + i * 0.08} />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
