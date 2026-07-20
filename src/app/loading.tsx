import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Fallback route skeleton for pages without their own loading.tsx — neutral Karibu shell. */
export default function GlobalLoading() {
  return (
    <SkeletonPage label="Loading page">
      <div className="mx-auto max-w-[1180px] px-6 pb-24 pt-28 md:px-10">
        <Skeleton className="mb-4 h-10 w-2/3 max-w-md" />
        <Skeleton className="mb-10 h-5 w-full max-w-lg" delay={0.08} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" delay={0.16 + i * 0.08} />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
