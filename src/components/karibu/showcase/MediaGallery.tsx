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
 * a native `<video>`. Every container is a fixed aspect ratio with
 * `overflow-hidden` so the layout never reflows as media loads in.
 *
 * The mp4 autoplays only when the OS has no reduced-motion preference; it is
 * always muted, looped and inline regardless, so a reduced-motion visitor
 * still gets a poster frame with the same fixed footprint, not a gap.
 */
export function MediaGallery({ media }: MediaGalleryProps) {
  const prefersReducedMotion = useReducedMotion()
  const [active, setActive] = useState(0)

  if (media.length === 0) return null

  const current = media[active]

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-sand bg-paper-card">
        {current.kind === "mp4" ? (
          <video
            key={current.url}
            muted
            loop
            playsInline
            preload="metadata"
            autoPlay={!prefersReducedMotion}
            poster={current.posterUrl}
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
            className="object-contain"
          />
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Media thumbnails">
          {media.map((item, i) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={i === active}
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
