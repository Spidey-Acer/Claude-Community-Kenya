"use client";

/**
 * KaribuGallery — warm-light gallery page for the Karibu identity.
 *
 * Preserves the existing gallery behavior (event filter chips, lightbox,
 * empty state) restyled to the warm-light Karibu palette.
 */

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotoView } from "@/lib/data";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface EventChip {
  slug: string;
  title: string;
  date: Date | string;
  city: string;
  count: number;
}

interface KaribuGalleryProps {
  photos: PhotoView[];
  eventChips?: EventChip[];
  initialFilter?: string | null;
}

export function KaribuGallery({ photos, eventChips = [], initialFilter = null }: KaribuGalleryProps) {
  const { whatsapp } = useSocialLinks();
  const [activeFilter, setActiveFilter] = useState<string | null>(initialFilter);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredPhotos = useMemo(() => {
    if (!activeFilter) return photos;
    return photos.filter((p) => p.event?.slug === activeFilter);
  }, [photos, activeFilter]);

  const totalCount = photos.length;
  const cityList = Array.from(new Set(eventChips.map((e) => e.city).filter(Boolean)));

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Gallery header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Gallery · Picha</div>
          <h1 className="mb-4 max-w-[760px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Faces of the <span className="italic text-clay">community.</span>
          </h1>
          <p className="mb-6 max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Real people, real meetups, real Kenya. Every shot here is from one
            of our gatherings — across Nairobi, Mombasa, and beyond.
          </p>
          {totalCount > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-inter text-[13px] text-ink-muted">
              <span className="tabular-nums">
                <span className="font-semibold text-clay">{totalCount}</span> photos
              </span>
              {eventChips.length > 0 && (
                <>
                  <span className="text-sand-2">·</span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-clay">{eventChips.length}</span> events
                  </span>
                </>
              )}
              {cityList.length > 0 && (
                <>
                  <span className="text-sand-2">·</span>
                  <span>{cityList.join(" & ")}</span>
                </>
              )}
            </div>
          )}
        </Reveal>
      </section>

      {/* Grid */}
      <section className={`${WRAP} py-5 pb-16`} aria-label="Photo gallery">
        {photos.length === 0 ? (
          <Reveal>
            <div className="mx-auto max-w-2xl rounded-2xl border border-sand bg-paper-card p-12 text-center">
              <Camera className="mx-auto mb-4 h-10 w-10 text-clay" aria-hidden="true" />
              <h2 className="mb-3 font-newsreader text-[24px] text-ink">No photos yet</h2>
              <p className="mx-auto mb-6 max-w-md font-inter text-[14.5px] leading-[1.6] text-ink-soft">
                We&apos;re curating photos from the first few meetups. Join the
                next one in person — and you might end up here.
              </p>
              {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
              >
                Join us on WhatsApp →
              </a>
              )}
            </div>
          </Reveal>
        ) : (
          <>
            {/* Filter chips */}
            {eventChips.length > 1 && (
              <Reveal className="mb-8 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter(null)}
                  aria-pressed={activeFilter === null}
                  className={cn(
                    "rounded-full border px-4 py-1.5 font-inter text-[13px] font-medium transition-colors",
                    activeFilter === null
                      ? "border-clay bg-[#F3E3D9] text-clay"
                      : "border-sand text-ink-muted hover:border-clay",
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
                      "rounded-full border px-4 py-1.5 font-inter text-[13px] font-medium transition-colors",
                      activeFilter === chip.slug
                        ? "border-clay bg-[#F3E3D9] text-clay"
                        : "border-sand text-ink-muted hover:border-clay",
                    )}
                  >
                    {chip.title} ({chip.count})
                  </button>
                ))}
              </Reveal>
            )}

            <Reveal>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
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
                      className="group relative block w-full overflow-hidden rounded-xl border border-sand bg-paper-card transition-colors hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <Image
                          src={photo.thumbnailUrl ?? photo.url}
                          alt={photo.alt ?? ""}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          /* R2 thumbs are already 800px webp — re-optimising
                             them would pay Vercel to shrink an image that is
                             already the right size, on top of free R2 egress. */
                          unoptimized={photo.fromR2}
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-scrim/80 via-scrim/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        />
                      </div>
                      {(photo.caption || photo.event) && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 px-4 py-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          {photo.caption && (
                            <p className="line-clamp-2 font-inter text-[13px] leading-snug text-scrim-text">
                              {photo.caption}
                            </p>
                          )}
                          {photo.event && (
                            <p className="mt-0.5 font-inter text-[10.5px] font-medium uppercase tracking-[0.14em] text-clay-light">
                              {photo.event.title}
                            </p>
                          )}
                        </div>
                      )}
                      {photo.featured && (
                        <span
                          aria-label="Featured photo"
                          className="absolute right-2 top-2 rounded-full border border-clay/40 bg-[#F3E3D9] px-2 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wider text-clay"
                        >
                          Featured
                        </span>
                      )}
                    </button>
                  </motion.li>
                ))}
              </ul>

              {filteredPhotos.length === 0 && (
                <div className="mt-6 text-center font-inter text-[14px] text-ink-muted">
                  No photos from this event yet.
                </div>
              )}
            </Reveal>
          </>
        )}
      </section>

      <PhotoLightbox
        photos={filteredPhotos}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}
