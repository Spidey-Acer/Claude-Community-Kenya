"use client"

/**
 * ShowcaseFeed — the public `/showcase` listing, Karibu warm-light.
 *
 * Structural model is `KaribuCommunity`: URL-driven sort/filter state via
 * `useSearchParams` + `router.push`, a card grid, and a deliberate empty
 * state. Two empty states here rather than one — "nothing posted yet" and
 * "nothing matches this filter" read very differently to a visitor and only
 * one of them should suggest posting.
 */

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Flame, Clock, TrendingUp, LifeBuoy, Plus, X, type LucideIcon } from "lucide-react"
import type { ShowcasePostView } from "@/lib/showcase/queries"
import type { ShowcaseSort } from "@/lib/showcase/ranking"
import { NEED_LABELS, type NeedKey } from "@/lib/showcase/constants"
import { ShowcaseCard } from "@/components/karibu/showcase/ShowcaseCard"
import { Reveal } from "@/components/karibu/motion/Reveal"
import { FeedPagination, FeedErrorPanel } from "@/components/karibu/FeedPagination"
import { cn } from "@/lib/utils"

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10"
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay"

const SORTS: Array<{ key: ShowcaseSort; label: string; icon: LucideIcon }> = [
  { key: "hot", label: "Hot", icon: Flame },
  { key: "recent", label: "Recent", icon: Clock },
  { key: "popular", label: "Popular", icon: TrendingUp },
  { key: "needs-help", label: "Needs help", icon: LifeBuoy },
]

interface ShowcaseFeedProps {
  items: ShowcasePostView[]
  total: number
  activeSort: ShowcaseSort
  activeEvent?: string
  activeNeed?: string
  page?: number
  dbError?: boolean
}

export function ShowcaseFeed({
  items,
  total,
  activeSort,
  activeEvent,
  activeNeed,
  page = 1,
  dbError = false,
}: ShowcaseFeedProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasFilters = Boolean(activeEvent || activeNeed)

  function update(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    // Changing a filter or sort restarts from the first page — a page number
    // only means anything within the result set it was computed for.
    if (key !== "page") params.delete("page")
    router.push(`/showcase${params.toString() ? `?${params.toString()}` : ""}`)
  }

  // Every returned item already belongs to the filtered event, so the first
  // one's name is the filter's name — no separate event lookup needed here.
  // When the filter matches zero posts there's no row to read the name from —
  // "selected event" at least says which chip the visitor can clear.
  const eventLabel = activeEvent ? (items[0]?.eventName ?? "selected event") : null

  return (
    <>
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Showcase header">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className={`${KICKER} mb-4`}>Showcase · Maonyesho</div>
              <h1 className="mb-3 font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[52px]">
                What the community is building.
              </h1>
              <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
                Projects, demos and works in progress from members across the
                country. React, comment, and help each other ship.
              </p>
              <p className="mt-2 font-inter text-[14px] text-ink-muted">
                Sharing an MCP, prompt or workflow?{" "}
                <Link href="/community" className="font-semibold text-clay underline-offset-2 hover:underline">
                  That lives in Tools &amp; Prompts
                </Link>
              </p>
            </div>
            <Link
              href="/showcase/submit"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-3 font-inter text-sm font-semibold text-paper-card transition-[background-color,transform] duration-150 ease-[var(--ease-reversible)] hover:scale-[1.03] hover:bg-clay-dark"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Share what you built
            </Link>
          </div>
        </Reveal>
      </section>

      <section className={`${WRAP} pb-6`} aria-label="Sort and filters">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sort showcase">
          {SORTS.map(({ key, label, icon: Icon }) => {
            const on = activeSort === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => update("sort", key === "hot" ? undefined : key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2",
                  on
                    ? "bg-ink text-paper-card"
                    : "border border-sand-2 bg-paper-card font-medium text-ink-soft hover:border-ink",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeNeed && (
              <FilterChip
                label={`Looking for: ${NEED_LABELS[activeNeed as NeedKey] ?? activeNeed}`}
                onClear={() => update("need", undefined)}
              />
            )}
            {activeEvent && (
              <FilterChip label={`Event: ${eventLabel}`} onClear={() => update("event", undefined)} />
            )}
          </div>
        )}

        <p className="mt-3 font-inter text-[13px] text-ink-muted">
          {total} {total === 1 ? "post" : "posts"}
        </p>
      </section>

      <section className={`${WRAP} pb-16`}>
        <h2 className="sr-only">Showcase posts</h2>
        {dbError ? (
          <FeedErrorPanel surface="showcase" />
        ) : total > 0 ? (
          <>
            {items.length > 0 ? (
              <Reveal className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((post) => (
                  <ShowcaseCard key={post.slug} post={post} />
                ))}
              </Reveal>
            ) : (
              // An out-of-range ?page (stale bookmark, removed post) — keep
              // the pagination visible so the visitor can get back.
              <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
                <p className="font-newsreader text-[22px] text-ink">
                  Nothing on this page.
                </p>
              </div>
            )}
            <FeedPagination
              page={page}
              total={total}
              onPageChange={(p) => update("page", p > 1 ? String(p) : undefined)}
            />
          </>
        ) : hasFilters ? (
          <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
            <p className="mb-4 font-newsreader text-[22px] text-ink">
              Nothing matches this filter yet.
            </p>
            <button
              type="button"
              onClick={() => router.push("/showcase")}
              className="inline-flex rounded-full border border-sand px-6 py-3 font-inter text-sm font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
            <p className="mb-4 font-newsreader text-[24px] text-ink">
              Nothing here yet — be the first.
            </p>
            <p className="mx-auto mb-6 max-w-md font-inter text-[14.5px] leading-[1.6] text-ink-soft">
              Built something with Claude — a demo, a launch, or a work in
              progress? Post it and let the community react.
            </p>
            <Link
              href="/showcase/submit"
              className="inline-flex rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Share something
            </Link>
          </div>
        )}
      </section>
    </>
  )
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Remove filter — ${label}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-clay bg-clay/10 px-3 py-1.5 font-inter text-[12.5px] font-medium text-clay transition-colors hover:bg-clay/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
    >
      {label}
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  )
}
