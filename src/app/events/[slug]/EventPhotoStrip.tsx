"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSkin } from "@/contexts/SkinContext";
import type { PhotoView } from "@/lib/data";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";

interface EventPhotoStripProps {
  photos: PhotoView[];
  eventSlug: string;
}

/**
 * Inline photo preview shown on an event detail page.
 * Renders up to 9 photos in a grid with a "See all" link to the gallery
 * pre-filtered to this event.
 */
export function EventPhotoStrip({ photos, eventSlug }: EventPhotoStripProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const previewPhotos = photos.slice(0, 9);
  const hasMore = photos.length > previewPhotos.length;

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2
            id="event-photos-heading"
            className={
              isPro
                ? "text-[26px] font-medium text-[#faf9f5]"
                : "font-mono text-[22px] font-bold text-green-primary"
            }
            style={
              isPro
                ? {
                    fontFamily: "var(--font-display), ui-serif, Georgia, serif",
                    letterSpacing: "-0.025em",
                  }
                : undefined
            }
          >
            {isPro ? "Photos from this event" : "## photos"}
          </h2>
          {isPro && (
            <p className="mt-1 text-[13px] text-[#9a9890]">
              {photos.length} {photos.length === 1 ? "photo" : "photos"} from
              the meetup.
            </p>
          )}
        </div>
        <Link
          href={`/gallery?event=${encodeURIComponent(eventSlug)}`}
          className={
            isPro
              ? "link-refined shrink-0 text-[13px] font-semibold text-[#d97757] hover:text-[#e89576]"
              : "font-mono text-sm text-green-primary hover:text-amber transition-colors"
          }
        >
          {isPro ? "See all →" : "> see_all"}
        </Link>
      </div>

      <ul
        className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-3"
        role="list"
      >
        {previewPhotos.map((photo, i) => {
          const isLastSlotWithMore = hasMore && i === previewPhotos.length - 1;
          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                aria-label={photo.caption ?? `Open photo ${i + 1}`}
                className="group relative block w-full overflow-hidden rounded-xl border border-[#2a2a28] bg-[#1e1e1d] transition-all duration-300 hover:border-[#3a3a37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <Image
                    src={photo.thumbnailUrl ?? photo.url}
                    alt={photo.alt ?? photo.caption ?? "Meetup photo"}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 200px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  {isLastSlotWithMore && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[15px] font-semibold text-[#faf9f5] backdrop-blur-sm">
                      +{photos.length - previewPhotos.length} more
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <PhotoLightbox
        photos={photos}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}
