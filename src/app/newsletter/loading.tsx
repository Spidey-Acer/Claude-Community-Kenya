import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /newsletter — mirrors KaribuNewsletter anatomy. */
export default function NewsletterLoading() {
  const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

  return (
    <SkeletonPage label="Loading newsletter">
      {/* Header + subscribe */}
      <section className={`${WRAP} pb-10 pt-16 text-center`}>
        <Skeleton className="mx-auto mb-4 h-3 w-32" />
        <Skeleton className="mx-auto mb-4 h-11 w-full max-w-[500px]" delay={0.08} />
        <Skeleton className="mx-auto mb-8 h-5 w-full max-w-[560px]" delay={0.16} />
        <Skeleton className="mx-auto h-14 w-full max-w-md rounded-full" delay={0.24} />
      </section>

      {/* Past issue rows */}
      <section className={`${WRAP} py-10`}>
        <Skeleton className="mb-6 h-3 w-24" delay={0.32} />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-sand p-7">
              <Skeleton className="mb-3 h-3 w-32" delay={0.4 + i * 0.08} />
              <Skeleton className="mb-2 h-7 w-2/3" delay={0.42 + i * 0.08} />
              <Skeleton className="h-4 w-full" delay={0.44 + i * 0.08} />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
