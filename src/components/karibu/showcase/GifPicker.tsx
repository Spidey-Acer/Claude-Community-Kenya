"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { Loader2, Search, ImageOff, ImageIcon } from "lucide-react"
import type { MediaDescriptor } from "@/lib/showcase/media"
import { GIPHY_KEY_PREFIX } from "@/lib/showcase/constants"

/**
 * GifPicker — searches GIPHY via the server proxy and hands back a
 * MediaDescriptor for whatever the member picks. An empty search box shows
 * GIPHY's trending set, so the picker is never a dead input waiting for a
 * query.
 *
 * The proxy returns 503 when GIPHY_API_KEY isn't set and 502 when GIPHY
 * itself is down. Both degrade to a plain message rather than a spinner or
 * a crash — the composer stays usable with GIFs simply unavailable.
 */

const SEARCH_DEBOUNCE_MS = 400

interface GifSearchResult {
  id: string
  url: string
  previewUrl: string
  width: number
  height: number
  description: string
}

interface GifPickerProps {
  onSelect: (media: MediaDescriptor) => void
}

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; items: GifSearchResult[] }
  | { kind: "empty" }
  | { kind: "unavailable"; message: string }

export function GifPicker({ onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("")
  const [state, setState] = useState<SearchState>({ kind: "idle" })
  const requestSeq = useRef(0)
  const prefersReducedMotion = useReducedMotion()

  const term = query.trim()

  useEffect(() => {
    // An empty box loads trending immediately; a typed term debounces. Both
    // go through the same sequence guard so a stale response never lands
    // after the query has changed.
    const timer = setTimeout(() => {
      const seq = ++requestSeq.current
      setState({ kind: "loading" })

      fetch(term ? `/api/showcase/gifs?q=${encodeURIComponent(term)}` : "/api/showcase/gifs")
        .then(async (res) => {
          const json = await res.json().catch(() => null)
          if (seq !== requestSeq.current) return

          if (res.status === 503 || res.status === 502) {
            setState({ kind: "unavailable", message: json?.error || "GIF search is unavailable right now." })
            return
          }
          if (!res.ok || !json?.success) {
            setState({ kind: "unavailable", message: json?.error || "GIF search failed." })
            return
          }

          const items: GifSearchResult[] = json.data.results
          setState(items.length > 0 ? { kind: "results", items } : { kind: "empty" })
        })
        .catch(() => {
          if (seq === requestSeq.current) {
            setState({ kind: "unavailable", message: "GIF search is unavailable right now." })
          }
        })
    }, term ? SEARCH_DEBOUNCE_MS : 0)

    return () => clearTimeout(timer)
  }, [term])

  function handleSelect(item: GifSearchResult) {
    onSelect({
      // Not an R2 object — a picked GIF has no upload key. The server keys
      // off this prefix to skip the pending-upload check and pin the host
      // instead, so do not hand-write it.
      key: `${GIPHY_KEY_PREFIX}${item.id}`,
      url: item.url,
      width: item.width,
      height: item.height,
      kind: "gif",
      alt: item.description || undefined,
    })
  }

  return (
    <div className="rounded-lg border border-sand-2 bg-paper p-3">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs, or pick from trending..."
          aria-label="Search GIFs"
          className="w-full rounded-lg border border-sand-2 bg-paper-card py-1.5 pl-8 pr-3 font-inter text-sm text-ink placeholder:text-ink-muted/70 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
        />
      </div>

      {/* One polite live region spanning every async state, so screen-reader
        * users hear the search resolve (or fail) after they stop typing. */}
      <div aria-live="polite">
        {state.kind === "loading" && (
          <div className="flex items-center gap-2 py-4 font-inter text-xs text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {term ? "Searching..." : "Loading trending GIFs..."}
          </div>
        )}

        {state.kind === "unavailable" && (
          <div className="flex items-center gap-2 py-4 font-inter text-xs text-ink-muted">
            <ImageOff className="h-3.5 w-3.5 shrink-0" /> {state.message}
          </div>
        )}

        {state.kind === "empty" && (
          <p className="py-4 font-inter text-xs text-ink-muted">No GIFs found for &ldquo;{query}&rdquo;.</p>
        )}

        {state.kind === "results" && (
          <p className="sr-only">
            {state.items.length} GIF{state.items.length === 1 ? "" : "s"} found.
          </p>
        )}
      </div>

      {state.kind === "results" && (
        <>
          <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
            {state.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="overflow-hidden rounded-lg border border-sand-2 transition-colors hover:border-clay"
              >
                {prefersReducedMotion ? (
                  // Animated previews auto-play with no pause control, so under
                  // reduced motion show a describable tile instead.
                  <span className="flex h-20 w-full flex-col items-center justify-center gap-1 bg-paper-card px-1 text-center">
                    <ImageIcon className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                    <span className="line-clamp-2 font-inter text-[10px] leading-tight text-ink-soft">
                      {item.description || "GIF"}
                    </span>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- a remote GIPHY thumbnail, not a local asset next/image can optimise
                  <img src={item.previewUrl} alt={item.description || "GIF"} className="h-20 w-full object-cover" />
                )}
              </button>
            ))}
          </div>
          {/* Required by GIPHY's API terms whenever results are shown. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- GIPHY's own attribution mark, served from their CDN per their terms */}
          <img
            src="https://giphy.com/static/img/poweredby_giphy.png"
            alt="Powered by GIPHY"
            className="mt-2 h-4 w-auto"
          />
        </>
      )}
    </div>
  )
}
