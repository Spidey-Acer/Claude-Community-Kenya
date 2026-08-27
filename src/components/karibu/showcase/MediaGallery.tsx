"use client"

import { useState } from "react"
import Image from "next/image"
import { useReducedMotion } from "framer-motion"
import { Play } from "lucide-react"
import type { MediaDescriptor } from "@/lib/showcase/media"
import { cn } from "@/lib/utils"

interface MediaGalleryProps {
  media: MediaDescriptor[]
}

/**
 * The post's media strip: images and gifs through `next/image`, mp4 through
 * a native `<video>`. The container never letterboxes: a single image gets a
 * frame matching its own aspect ratio (so the upload fills it edge to edge),
 * while multi-item posts share one fixed 16:9 frame with `object-cover` so
 * switching items never resizes the viewer. `overflow-hidden` everywhere so
 * the layout never reflows as media loads in.
 *
 * The mp4 autoplays only when the OS has no reduced-motion preference; it is
 * always muted, looped and inline regardless, so a reduced-motion visitor
 * still gets a poster frame with the same fixed footprint, not a gap.
 */

/** Tallest frame a single upload may claim: 4:5, so a phone-portrait shot cannot swallow the page. */
const MIN_SINGLE_RATIO = 0.8

export function MediaGallery({ media }: MediaGalleryProps) {
  const prefersReducedMotion = useReducedMotion()
  const [active, setActive] = useState(0)

  if (media.length === 0) return null

  const current = media[active]

  // A lone image adopts its own aspect ratio; anything else keeps 16:9.
  const hasOwnRatio =
    media.length === 1 && current.kind !== "mp4" && current.width > 0 && current.height > 0
  const singleRatio = hasOwnRatio
    ? Math.max(current.width / current.height, MIN_SINGLE_RATIO)
    : undefined
  // If the ratio had to be clamped, contain would letterbox — cover instead.
  const ratioClamped = hasOwnRatio && current.width / current.height < MIN_SINGLE_RATIO

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-sand bg-paper-card",
          !hasOwnRatio && "aspect-video",
        )}
        style={singleRatio ? { aspectRatio: `${singleRatio}` } : undefined}
      >
        {current.kind === "mp4" ? (
          <video
            key={current.url}
            muted
            loop
            playsInline
            controls
            preload="metadata"
            autoPlay={!prefersReducedMotion}
            poster={current.posterUrl}
            aria-label={current.alt || "Project demo video"}
            className="h-full w-full object-contain"
          >
            <source src={current.url} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={current.url}
            alt={current.alt ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized={current.kind === "gif"}
            className={hasOwnRatio && !ratioClamped ? "object-contain" : "object-cover"}
          />
        )}
      </div>

      {/* Plain toggle buttons, not role=tab — tab semantics promise
        * arrow-key navigation and a tabpanel this strip doesn't have. */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Media thumbnails">
          {media.map((item, i) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={i === active}
              aria-label={`Show media ${i + 1} of ${media.length}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2",
                i === active ? "border-clay" : "border-sand hover:border-clay/50",
              )}
            >
              {item.kind === "mp4" && !item.posterUrl ? (
                <div className="flex h-full w-full items-center justify-center bg-panel-dark text-on-panel-dark">
                  <Play className="h-4 w-4" aria-hidden="true" />
                </div>
              ) : (
                <Image
                  src={item.posterUrl ?? item.url}
                  alt=""
                  fill
                  sizes="80px"
                  unoptimized={item.kind !== "image"}
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
