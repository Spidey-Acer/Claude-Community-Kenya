"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Camera, Download, ImageIcon } from "lucide-react";
import type { GalleryAlbum } from "@/lib/data";
import { SOCIAL_LINKS } from "@/lib/constants";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { PageBanner } from "@/components/karibu/PageBanner";
import { CtaBand } from "@/components/karibu/CtaBand";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

/** Human-readable download size, so nobody on mobile data taps blind. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

/**
 * Gallery index — one card per event album, with city chips to filter them
 * (structure-redesign spec, section 5: "4-column grid, album chips"). The
 * lightbox itself still lives on the album page, where it's actually needed.
 */
export function KaribuGalleryIndex({ albums }: { albums: GalleryAlbum[] }) {
  const totalPhotos = albums.reduce((n, a) => n + a.count, 0);
  const [activeCity, setActiveCity] = useState<string | null>(null);

  // Album chips: "All" plus every city that actually has an album — no chip
  // for a city with zero albums.
  const cities = useMemo(
    () => [...new Set(albums.map((a) => a.city).filter(Boolean))],
    [albums],
  );
  const filtered = useMemo(
    () => (activeCity ? albums.filter((a) => a.city === activeCity) : albums),
    [albums, activeCity],
  );

  return (
    <>
      <PageBanner
        image="/images/community/mural-laptops.webp"
        imageAlt="Members building on their laptops at a CCK meetup"
        crumbs={["Home", "Gallery"]}
        title="Faces of the community."
        subtitle="Photos from our meetups and build days across Nairobi, Mombasa and beyond — taken by community members at the events themselves."
      />

      <section className={`${WRAP} pb-2 pt-10`} aria-label="Filter albums">
        {totalPhotos > 0 && (
          <p className="mb-4 font-inter text-[13px] text-ink-muted">
            <span className="font-semibold tabular-nums text-clay">{totalPhotos}</span> photos
            {" · "}
            <span className="font-semibold tabular-nums text-clay">{albums.length}</span>{" "}
            {albums.length === 1 ? "event" : "events"}
          </p>
        )}
        {cities.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCity(null)}
              aria-pressed={activeCity === null}
              className={`rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors ${
                activeCity === null
                  ? "bg-ink text-paper-card"
                  : "border border-sand-2 bg-paper-card font-medium text-ink-soft hover:border-ink"
              }`}
            >
              All
            </button>
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setActiveCity(city)}
                aria-pressed={activeCity === city}
                className={`rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors ${
                  activeCity === city
                    ? "bg-ink text-paper-card"
                    : "border border-sand-2 bg-paper-card font-medium text-ink-soft hover:border-ink"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={`${WRAP} py-5 pb-16`} aria-label="Event albums">
        {albums.length === 0 ? (
          <Reveal>
            <div className="mx-auto max-w-2xl rounded-2xl border border-sand bg-paper-card p-12 text-center">
              <Camera className="mx-auto mb-4 h-10 w-10 text-clay" aria-hidden="true" />
              <h2 className="mb-3 font-newsreader text-[24px] text-ink">No photos yet</h2>
              <p className="mx-auto mb-6 max-w-md font-inter text-[14.5px] leading-[1.6] text-ink-soft">
                Come to the next meetup in person — and you might end up here.
              </p>
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
              >
                Join us on WhatsApp →
              </a>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" role="list">
              {filtered.map((album) => (
                <li key={album.slug}>
                  <Link
                    href={`/gallery/${album.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-sand bg-paper-card transition-colors hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-alt">
                      {album.coverUrl ? (
                        <Image
                          src={album.coverUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized={album.coverFromR2}
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-ink-faint" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h2 className="mb-1.5 font-newsreader text-[21px] leading-tight text-ink">
                        {album.title}
                      </h2>
                      <p className="font-inter text-[13px] text-ink-muted">
                        {formatDate(album.date)} · {album.city}
                      </p>
                      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-inter text-[12.5px] text-ink-soft">
                        <span className="tabular-nums">
                          {album.count} {album.count === 1 ? "photo" : "photos"}
                        </span>
                        {album.bundleBytes && (
                          <span className="inline-flex items-center gap-1 text-ink-muted">
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatBytes(album.bundleBytes)} zip
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </section>

      <section className={`${WRAP} pb-16`} aria-label="Join CTA">
        <CtaBand />
      </section>
    </>
  );
}
