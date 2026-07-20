import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /team — mirrors KaribuTeam anatomy. */
export default function TeamLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

  return (
    <SkeletonPage label="Loading team">
      {/* Header */}
      <section className={`${WRAP} pb-8 pt-16 text-center`}>
        <Skeleton className="mx-auto mb-4 h-3 w-24" />
        <Skeleton className="mx-auto mb-4 h-11 w-full max-w-[600px]" delay={0.08} />
        <Skeleton className="mx-auto h-5 w-full max-w-[560px]" delay={0.16} />
      </section>

      {/* Member grid */}
      <section className={`${WRAP} pb-16`}>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-sand p-5 text-center">
              <Skeleton
                className="mx-auto mb-4 h-24 w-24 rounded-full"
                delay={Math.min(0.24 + i * 0.04, 0.5)}
              />
              <Skeleton
                className="mx-auto mb-1.5 h-4 w-24"
                delay={Math.min(0.26 + i * 0.04, 0.5)}
              />
              <Skeleton
                className="mx-auto h-3 w-16"
                delay={Math.min(0.28 + i * 0.04, 0.5)}
              />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
