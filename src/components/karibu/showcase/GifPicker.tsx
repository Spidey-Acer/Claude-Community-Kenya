"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, ImageOff } from "lucide-react"
import type { MediaDescriptor } from "@/lib/showcase/media"
import { TENOR_KEY_PREFIX } from "@/lib/showcase/constants"

/**
 * GifPicker — searches Tenor via the server proxy and hands back a
 * MediaDescriptor for whatever the member picks.
 *
 * The proxy returns 503 when TENOR_API_KEY isn't set and 502 when Tenor
 * itself is down. Both degrade to a plain message rather than a spinner or
 * a crash — the composer stays usable with GIFs simply unavailable.
 */

const SEARCH_DEBOUNCE_MS = 400

interface TenorSearchResult {
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
  | { kind: "results"; items: TenorSearchResult[] }
  | { kind: "empty" }
  | { kind: "unavailable"; message: string }

export function GifPicker({ onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("")
  const [state, setState] = useState<SearchState>({ kind: "idle" })
  const requestSeq = useRef(0)

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setState({ kind: "idle" })
      return
    }

    const timer = setTimeout(() => {
      const seq = ++requestSeq.current
      setState({ kind: "loading" })

      fetch(`/api/showcase/gifs?q=${encodeURIComponent(term)}`)
        .then(async (res) => {
          const json = await res.json().catch(() => null)
          // A response for a query the user has since changed is stale — a
          // later request may already be in flight or may have finished.
          if (seq !== requestSeq.current) return

          if (res.status === 503 || res.status === 502) {
            setState({ kind: "unavailable", message: json?.error || "GIF search is unavailable right now." })
            return
          }
          if (!res.ok || !json?.success) {
            setState({ kind: "unavailable", message: json?.error || "GIF search failed." })
            return
          }

          const items: TenorSearchResult[] = json.data.results
          setState(items.length > 0 ? { kind: "results", items } : { kind: "empty" })
        })
        .catch(() => {
          if (seq === requestSeq.current) {
            setState({ kind: "unavailable", message: "GIF search is unavailable right now." })
          }
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(item: TenorSearchResult) {
    onSelect({
      // Not an R2 object — there is no upload key for a Tenor GIF. Prefixed
      // so it's unmistakably not a pending-upload key if it ever needs to be
      // told apart from one downstream.
      // The server pins this prefix and the Tenor host; do not hand-write it.
      key: `${TENOR_KEY_PREFIX}${item.id}`,
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
          placeholder="Search GIFs..."
          className="w-full rounded-lg border border-sand-2 bg-paper-card py-1.5 pl-8 pr-3 font-inter text-sm text-ink placeholder:text-ink-muted/70 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
        />
      </div>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 py-4 font-inter text-xs text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
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
        <>
          <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
            {state.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="overflow-hidden rounded-lg border border-sand-2 transition-colors hover:border-clay"
              >
                {
                  // eslint-disable-next-line @next/next/no-img-element -- external Tenor thumbnail, not an optimizable local asset
                }
                <img src={item.previewUrl} alt={item.description || "GIF"} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
          {/* Required by Tenor's API terms whenever results are shown. */}
          <p className="mt-2 font-inter text-[10px] uppercase tracking-[0.08em] text-ink-muted">
            Powered by Tenor
          </p>
        </>
      )}
    </div>
  )
}
