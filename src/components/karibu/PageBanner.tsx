/**
 * PageBanner — the tinted photo banner + breadcrumb that opens every inner
 * Karibu page (ports Events.dc.html's header band). Server component: pure
 * markup, no state. `crumbs` is the breadcrumb trail with the current page
 * last, e.g. ["Home", "Events"] — the last entry renders as the active
 * (non-link) segment since PageBanner doesn't know the app's route tree.
 */

import Image from "next/image";

interface PageBannerProps {
  image: string;
  imageAlt: string;
  crumbs: string[];
  title: React.ReactNode;
  subtitle?: string;
  /** Small uppercase note bottom-right, e.g. photo credit. Optional. */
  note?: string;
}

export function PageBanner({ image, imageAlt, crumbs, title, subtitle, note }: PageBannerProps) {
  return (
    <div className="relative h-[240px] overflow-hidden bg-ink sm:h-[300px] lg:h-[340px]">
      <Image src={image} alt={imageAlt} fill priority sizes="100vw" className="object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-scrim/45 to-scrim/70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-clay/35 to-transparent" />
      <div className="relative mx-auto flex h-full max-w-[1180px] flex-col justify-end px-6 pb-7 md:px-10 lg:pb-12">
        <div className="mb-3.5 flex items-center gap-2.5 font-inter text-xs font-semibold uppercase tracking-[0.18em] text-clay-light">
          {crumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-2.5">
              {i > 0 && <span className="text-scrim-text-soft/60">/</span>}
              <span className={i === crumbs.length - 1 ? "text-clay-light" : "text-scrim-text-soft"}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
        <h1 className="mb-3 font-newsreader text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-scrim-text sm:text-[48px] lg:text-[58px]">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-[560px] font-inter text-[15px] leading-[1.55] text-scrim-text-soft sm:text-[17px]">
            {subtitle}
          </p>
        )}
      </div>
      {note && (
        <span className="absolute bottom-4 right-6 font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-scrim-text-soft/80 md:right-10">
          {note}
        </span>
      )}
    </div>
  );
}
