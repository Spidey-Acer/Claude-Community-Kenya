import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getGalleryPhotos, getEventsWithPhotos } from "@/lib/data";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Gallery | Claude Community Kenya",
  description:
    "Photos from Claude Community Kenya meetups, workshops, and gatherings in Nairobi, Mombasa, and beyond.",
  alternates: {
    canonical: "https://www.claudekenya.org/gallery",
  },
  openGraph: {
    title: "Gallery | Claude Community Kenya",
    description:
      "Photos from Claude Community Kenya meetups, workshops, and gatherings.",
    url: "https://www.claudekenya.org/gallery",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

interface GalleryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const eventFilter = typeof params.event === "string" ? params.event : null;

  const [photos, eventChips] = await Promise.all([
    getGalleryPhotos().catch(() => []),
    getEventsWithPhotos().catch(() => []),
  ]);

  const totalCount = photos.length;
  const cityList = Array.from(
    new Set(eventChips.map((e) => e.city).filter(Boolean)),
  );

  return (
    <main className="min-h-screen px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Gallery" }]}
      />

      {/* Ambient gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 35% at 50% -10%, rgba(217, 119, 87, 0.08), transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 60%, rgba(106, 155, 204, 0.05), transparent 65%)
          `,
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Hero */}
        <section className="mb-12 text-center">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2a2a28] bg-[#1e1e1d]/60 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#b0aea5] backdrop-blur-sm">
              <img src="/images/claude-sparkle.svg" alt="" className="h-3 w-3" />
              <span>Community Gallery</span>
            </span>
          </div>

          <h1
            className="mb-5 text-[42px] font-medium text-[#faf9f5] sm:text-[56px] lg:text-[64px]"
            style={{
              fontFamily: 'var(--font-display), ui-serif, Georgia, serif',
              letterSpacing: "-0.025em",
            }}
          >
            Faces of the community
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-[17px] leading-relaxed text-[#b0aea5]">
            Real people, real meetups, real Kenya. Every shot here is from
            one of our gatherings — across Nairobi, Mombasa, and beyond.
          </p>

          {totalCount > 0 && (
            <div className="mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a7870]">
              <span className="tabular-nums">
                <span className="text-[#d97757]">{totalCount}</span> photos
              </span>
              {eventChips.length > 0 && (
                <>
                  <span className="text-[#3a3a37]">·</span>
                  <span className="tabular-nums">
                    <span className="text-[#6a9bcc]">{eventChips.length}</span> events
                  </span>
                </>
              )}
              {cityList.length > 0 && (
                <>
                  <span className="text-[#3a3a37]">·</span>
                  <span>{cityList.join(" & ")}</span>
                </>
              )}
            </div>
          )}
        </section>

        {/* Grid */}
        <section aria-label="Photo gallery">
          <GalleryGrid
            photos={photos}
            eventChips={eventChips}
            initialFilter={eventFilter}
          />
        </section>
      </div>
    </main>
  );
}
