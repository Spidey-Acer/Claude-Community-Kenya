"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download } from "lucide-react";
import type { PhotoView } from "@/lib/data";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { TakedownRequest } from "@/components/gallery/TakedownRequest";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

interface AlbumHeader {
  slug: string;
  title: string;
  date: Date | string;
  city: string;
  venue: string;
}

/**
 * One event's album: grid plus lightbox plus download-all.
 *
 * The lightbox is the shared PhotoLightbox component — including its keyboard
 * handling and focus management — rather than a second implementation that
 * would drift from it.
 */
export function KaribuAlbum({
  event,
  photos,
  bundleUrl,
  bundleLabel,
  takedownEmail,
}: {
  event: AlbumHeader;
  photos: PhotoView[];
  bundleUrl: string | null;
  bundleLabel: string | null;
  takedownEmail: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const dateLabel = new Date(event.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });

  return (
    <>
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Album header">
        <Reveal>
          <Link
            href="/gallery"
            className="mb-5 inline-flex items-center gap-1.5 font-inter text-[13px] font-medium text-ink-muted transition-colors hover:text-clay"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All events
          </Link>
          <div className={`${KICKER} mb-3`}>Gallery · Picha</div>
          <h1 className="mb-3 max-w-[820px] font-newsreader text-[38px] font-normal leading-[1.06] tracking-[-0.02em] text-ink sm:text-[48px]">
            {event.title}
          </h1>
          <p className="mb-6 font-inter text-[15px] text-ink-soft">
            {dateLabel} · {event.venue}, {event.city} ·{" "}
            <span className="tabular-nums">{photos.length}</span>{" "}
            {photos.length === 1 ? "photo" : "photos"}
          </p>

          {bundleUrl && (
            <a
              href={bundleUrl}
              className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-[14.5px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download all photos
              {bundleLabel && <span className="font-normal opacity-90">({bundleLabel})</span>}
            </a>
          )}
        </Reveal>
      </section>

      <section className={`${WRAP} py-5 pb-10`} aria-label="Photos">
        <Reveal>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {photos.map((photo, i) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={photo.caption ?? `Open photo ${i + 1} of ${photos.length}`}
                  className="group relative block w-full overflow-hidden rounded-xl border border-sand bg-paper-card transition-colors hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={photo.thumbnailUrl ?? photo.url}
                      alt={photo.alt ?? ""}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized={photo.fromR2}
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  {photo.caption && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/80 to-transparent px-4 py-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="line-clamp-2 font-inter text-[13px] leading-snug text-paper-card">
                        {photo.caption}
                      </p>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* Consent + takedown. Small, but it belongs on the page with the photos
          rather than buried in a policy nobody opens. */}
      <section className={`${WRAP} pb-16`} aria-label="Photo consent">
        <TakedownRequest albumSlug={event.slug} contactEmail={takedownEmail} />
      </section>

      <PhotoLightbox
        photos={photos}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}
