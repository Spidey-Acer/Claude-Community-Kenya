"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

/**
 * Prev/next pagination for the URL-driven Karibu feeds. The server queries
 * already paginate (default 20 per page); this is the control that finally
 * exposes pages past the first one.
 */
export function FeedPagination({
  page,
  total,
  limit = 20,
  onPageChange,
}: {
  page: number
  total: number
  limit?: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-1.5 rounded-full border border-sand-2 px-4 py-2 font-inter text-[13px] font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Previous
      </button>
      <span className="font-inter text-[13px] tabular-nums text-ink-muted">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-1.5 rounded-full border border-sand-2 px-4 py-2 font-inter text-[13px] font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </nav>
  )
}

/** Shown when the feed's data fetch failed — distinct from a real empty feed. */
export function FeedErrorPanel({ surface }: { surface: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-error/30 bg-error/10 p-10 text-center">
      <p className="mb-2 font-newsreader text-[22px] text-ink">
        Couldn&apos;t load the {surface} right now.
      </p>
      <p className="font-inter text-[14px] text-ink-soft">
        Something went wrong on our side — please refresh in a moment.
      </p>
    </div>
  )
}
