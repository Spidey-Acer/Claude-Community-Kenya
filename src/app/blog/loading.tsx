import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /blog — mirrors KaribuBlog anatomy. */
export default function BlogLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

  return (
    <SkeletonPage label="Loading blog">
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`}>
        <Skeleton className="mb-4 h-3 w-24" />
        <Skeleton className="mb-4 h-11 w-2/3 max-w-lg" delay={0.08} />
        <Skeleton className="h-5 w-full max-w-[600px]" delay={0.16} />
      </section>

      {/* Featured post card */}
      <section className={`${WRAP} py-5`}>
        <div className="rounded-2xl border border-sand p-8 sm:p-10">
          <Skeleton className="mb-4 h-3 w-20" delay={0.24} />
          <Skeleton className="mb-4 h-9 w-full max-w-[720px]" delay={0.28} />
          <Skeleton className="mb-5 h-5 w-full max-w-[640px]" delay={0.32} />
          <Skeleton className="h-4 w-64" delay={0.36} />
        </div>
      </section>

      {/* Post card grid */}
      <section className={`${WRAP} py-5 pb-16`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-sand p-7">
              <Skeleton className="mb-2 h-6 w-3/4" delay={0.4 + i * 0.08} />
              <Skeleton className="mb-1.5 h-4 w-full" delay={0.42 + i * 0.08} />
              <Skeleton className="mb-4 h-4 w-2/3" delay={0.44 + i * 0.08} />
              <Skeleton className="h-4 w-40" delay={0.46 + i * 0.08} />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
