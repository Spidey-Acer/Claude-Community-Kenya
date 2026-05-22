"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotoView } from "@/lib/data";
import { PhotoLightbox } from "./PhotoLightbox";

interface EventChip {
  slug: string;
  title: string;
  date: Date | string;
  city: string;
  count: number;
}

interface GalleryGridProps {
  photos: PhotoView[];
  eventChips?: EventChip[];
  /**
   * The slug of the currently-selected event filter, or null for "all".
   * Passed as a URL search param so the filter survives a refresh.
   */
  initialFilter?: string | null;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function GalleryGrid({ photos, eventChips = [], initialFilter = null }: GalleryGridProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(initialFilter);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredPhotos = useMemo(() => {
    if (!activeFilter) return photos;
    return photos.filter((p) => p.event?.slug === activeFilter);
  }, [photos, activeFilter]);

  if (photos.length === 0) {
    return (
      <div className="card-elevated mx-auto max-w-2xl rounded-2xl p-12 text-center">
        <Camera
          className="mx-auto mb-4 h-10 w-10 text-[#7a7870]"
          aria-hidden="true"
        />
        <h2
          className="mb-3 text-[24px] font-medium text-[#faf9f5]"
          style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif' }}
        >
          Photos coming soon
        </h2>
        <p className="mx-auto max-w-md text-[14px] leading-relaxed text-[#b0aea5]">
          We&apos;re curating photos from the first few meetups. Join the next
          one in person — and you might end up here.
        </p>
        <Link
          href="/events"
          className="link-refined mt-5 inline-block text-[13px] font-semibold text-[#d97757] hover:text-[#e89576]"
        >
          See upcoming events →
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Filter chips — only if there are multiple events with photos */}
      {eventChips.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            aria-pressed={activeFilter === null}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-200",
              activeFilter === null
                ? "border-[#d97757] bg-[#d97757]/15 text-[#d97757]"
                : "border-[#2a2a28] text-[#b0aea5] hover:border-[#3a3a37] hover:text-[#e8e6dc]",
            )}
          >
            All ({photos.length})
          </button>
          {eventChips.map((chip) => (
            <button
              key={chip.slug}
              type="button"
              onClick={() => setActiveFilter(chip.slug)}
              aria-pressed={activeFilter === chip.slug}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-200",
                activeFilter === chip.slug
                  ? "border-[#d97757] bg-[#d97757]/15 text-[#d97757]"
                  : "border-[#2a2a28] text-[#b0aea5] hover:border-[#3a3a37] hover:text-[#e8e6dc]",
              )}
            >
              {chip.title} ({chip.count})
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        {filteredPhotos.map((photo, i) => (
          <motion.li
            key={photo.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: Math.min(i * 0.03, 0.4), ease: EASE_OUT }}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              aria-label={photo.caption ?? `Open photo ${i + 1}`}
              className="group relative block w-full overflow-hidden rounded-2xl border border-[#2a2a28] bg-[#1e1e1d] transition-all duration-300 hover:border-[#3a3a37] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={photo.thumbnailUrl ?? photo.url}
                  alt={photo.alt ?? photo.caption ?? "Community photo"}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {/* Bottom-gradient overlay reveals caption on hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              </div>
              {(photo.caption || photo.event) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 px-4 py-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {photo.caption && (
                    <p className="line-clamp-2 text-[13px] leading-snug text-[#faf9f5]">
                      {photo.caption}
                    </p>
                  )}
                  {photo.event && (
                    <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#d97757]">
                      {photo.event.title}
                    </p>
                  )}
                </div>
              )}
              {photo.featured && (
                <span
                  aria-label="Featured photo"
                  className="absolute right-2 top-2 rounded-full border border-[#d97757]/40 bg-[#d97757]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#faf9f5] backdrop-blur-sm"
                >
                  Featured
                </span>
              )}
            </button>
          </motion.li>
        ))}
      </ul>

      {filteredPhotos.length === 0 && (
        <div className="mt-6 text-center text-[14px] text-[#b0aea5]">
          No photos from this event yet.
        </div>
      )}

      <PhotoLightbox
        photos={filteredPhotos}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}
