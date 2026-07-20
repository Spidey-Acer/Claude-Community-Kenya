import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Route skeleton for /admin — dark noir palette, mirrors dashboard anatomy. */
export default function AdminLoading() {
  return (
    <div className="k-skeleton-noir min-h-screen bg-[#0a0a0a] p-8">
      <SkeletonPage label="Loading admin dashboard" className="mx-auto max-w-[1200px]">
        {/* Header */}
        <Skeleton className="mb-8 h-8 w-60 rounded" />

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg border border-[#222]" delay={i * 0.15} />
          ))}
        </div>

        {/* Content panel */}
        <div className="rounded-lg border border-[#222] p-6">
          {["w-[100%]", "w-[85%]", "w-[70%]", "w-[90%]", "w-[60%]"].map((width, i) => (
            <Skeleton
              key={width}
              className={`h-4 rounded ${width} ${i < 4 ? "mb-4" : ""}`}
              delay={i * 0.1}
            />
          ))}
        </div>
      </SkeletonPage>
    </div>
  );
}
