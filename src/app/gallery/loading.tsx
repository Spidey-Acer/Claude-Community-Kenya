import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /gallery — mirrors KaribuGallery anatomy. */
export default function GalleryLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

  return (
    <SkeletonPage label="Loading gallery">
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`}>
        <Skeleton className="mb-4 h-3 w-24" />
        <Skeleton className="mb-4 h-11 w-full max-w-[760px]" delay={0.08} />
        <Skeleton className="mb-6 h-5 w-full max-w-[600px]" delay={0.16} />
        <Skeleton className="h-4 w-48" delay={0.24} />
      </section>

      {/* Filter chips */}
      <section className={`${WRAP} pb-2`}>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" delay={0.28 + i * 0.04} />
          ))}
        </div>
      </section>

      {/* Photo grid */}
      <section className={`${WRAP} py-5 pb-16`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-[4/3] w-full rounded-xl"
              delay={Math.min(0.4 + i * 0.04, 0.5)}
            />
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
