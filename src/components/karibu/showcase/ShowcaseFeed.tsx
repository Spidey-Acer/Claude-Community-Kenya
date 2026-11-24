"use client"

/**
 * ShowcaseFeed — the public `/showcase` listing, Karibu warm-light.
 *
 * URL-driven sort/type/filter state via `useSearchParams` + `router.push`,
 * one feed for every submission type, a card grid, and a deliberate empty
 * state. Two empty states here rather than one — "nothing posted yet" and
 * "nothing matches this filter" read very differently to a visitor and only
 * one of them should suggest posting.
 */

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Flame, Clock, TrendingUp, LifeBuoy, Plus, X, type LucideIcon } from "lucide-react"
import type { ShowcasePostView } from "@/lib/showcase/queries"
import type { ShowcaseSort } from "@/lib/showcase/ranking"
import { NEED_LABELS, type NeedKey } from "@/lib/showcase/constants"
import { ShowcaseCard } from "@/components/karibu/showcase/ShowcaseCard"
import { Reveal } from "@/components/karibu/motion/Reveal"
import { FeedPagination, FeedErrorPanel } from "@/components/karibu/FeedPagination"
import { BTN_OUTLINE, BTN_PRIMARY, EmptyState, Masthead, WRAP } from "@/components/karibu/kit"
import { CtaBand } from "@/components/karibu/CtaBand"
import { cn } from "@/lib/utils"

/** Below this count, sort/filter pills read as decorative rather than useful. */
const MIN_ITEMS_FOR_SORT_PILLS = 8

/** Type chips; `key` is the `?type=` URL value (see TYPE_PARAM). */
const TYPE_CHIPS: Array<{ key: string | undefined; label: string }> = [
  { key: undefined, label: "All" },
  { key: "project", label: "Projects" },
  { key: "demo", label: "Demos" },
  { key: "tool", label: "Tools" },
  { key: "prompt", label: "Prompts" },
  { key: "workflow", label: "Workflows" },
  { key: "mcp", label: "MCP servers" },
]

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
  activeType?: string
  activeEvent?: string
  activeNeed?: string
  page?: number
  dbError?: boolean
}

export function ShowcaseFeed({
  items,
  total,
  activeSort,
  activeType,
  activeEvent,
  activeNeed,
  page = 1,
  dbError = false,
}: ShowcaseFeedProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasFilters = Boolean(activeType || activeEvent || activeNeed)

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
      <Masthead
        eyebrow="Showcase"
        title="What the community is building."
        lead="Projects, demos, tools, prompts and workflows from members across the country. React, comment, and help each other ship."
        media={
          <Image
            src="/images/community/crowd-nairobi.webp"
            alt="A crowd at a CCK Nairobi event"
            fill
            priority
            sizes="(min-width: 1024px) 440px, 100vw"
            className="object-cover"
          />
        }
      />

      <section className={`${WRAP} pb-6 pt-10`} aria-label="Filter and share">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
              {TYPE_CHIPS.map(({ key, label }) => {
                const on = activeType === key
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update("type", key)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2",
                      on
                        ? "bg-band-bg text-on-band"
                        : "border border-sand-2 bg-paper-card font-medium text-ink-soft hover:border-ink",
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <Link href="/showcase/submit" className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Share what you built
            </Link>
          </div>
        </Reveal>
      </section>

      <section className={`${WRAP} pb-6`} aria-label="Sort and filters">
        {/* Decorative at low volume — see the 2026-09-05 structure-redesign
         * spec, section 5: hide sort pills below 8 items. Filter chips (an
         * active event/need) stay since they're state to clear, not decor. */}
        {total >= MIN_ITEMS_FOR_SORT_PILLS && (
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
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors",
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
        )}

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

      <section className={`${WRAP} pb-16`} aria-labelledby="showcase-posts-heading">
        <h2 id="showcase-posts-heading" className="sr-only">
          Showcase posts
        </h2>
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
              <EmptyState title="Nothing on this page." body="That page number has no posts. Use the page controls to go back." />
            )}
            <FeedPagination
              page={page}
              total={total}
              onPageChange={(p) => update("page", p > 1 ? String(p) : undefined)}
            />
          </>
        ) : hasFilters ? (
          <EmptyState
            title="Nothing matches this filter yet."
            body="Clear the filters to see everything that has been shared."
            action={
              <button type="button" onClick={() => router.push("/showcase")} className={BTN_OUTLINE}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title="Nothing here yet. Be the first."
            body="Built something with Claude, such as a demo, a launch or a work in progress? Post it and let the community react."
            action={
              <Link href="/showcase/submit" className={BTN_PRIMARY}>
                Share something
              </Link>
            }
          />
        )}
      </section>

      <section className={`${WRAP} pb-16`} aria-label="Join CTA">
        <CtaBand />
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
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-clay bg-clay/10 px-3 py-1.5 font-inter text-[13px] font-medium text-clay transition-colors hover:bg-clay/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
    >
      {label}
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  )
}
