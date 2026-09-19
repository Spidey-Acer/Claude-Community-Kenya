"use client";

/**
 * CtaBand — the full-width clay closing band that ends every public page
 * (ports the "Come build with us." band from every artboard). Fixed brand
 * chrome like the footer and ticker: it stays clay in both themes via the
 * --band-bg/--on-band tokens, never the theme-flipping --clay.
 */

import { useSocialLinks } from "@/contexts/SocialLinksContext";

interface CtaBandProps {
  heading?: React.ReactNode;
  body?: string;
  className?: string;
}

export function CtaBand({
  heading = "Come build with us.",
  body = "No fees, no application. Say hi, tell us your city and what you're curious about, and come to the next meetup.",
  className,
}: CtaBandProps) {
  const { whatsapp, discord } = useSocialLinks();

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] bg-band-bg px-8 py-14 text-on-band sm:px-14 sm:py-[72px] ${className ?? ""}`}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-[300px] w-[300px] rounded-full border border-on-band/15 sm:h-[360px] sm:w-[360px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-36 right-10 h-[260px] w-[260px] rounded-full border border-on-band/10"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-3.5 font-newsreader text-[34px] font-normal leading-[1.08] tracking-[-0.02em] text-on-band sm:text-[44px] lg:text-[52px]">
            {heading}
          </h2>
          <p className="max-w-[520px] font-inter text-[15px] leading-[1.55] text-on-band-soft sm:text-[17px]">
            {body}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-paper-card px-6 py-[15px] font-inter text-[15px] font-semibold text-ink transition-opacity hover:opacity-90"
            >
              Join on WhatsApp
            </a>
          )}
          {discord && (
            <a
              href={discord}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-on-band/50 px-6 py-[15px] font-inter text-[15px] font-semibold text-on-band transition-colors hover:border-on-band"
            >
              Join Discord
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
