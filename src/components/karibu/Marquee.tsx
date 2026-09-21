/**
 * Marquee: the clay band that sits above the nav on every Karibu page.
 *
 * Static, despite the name (kept so the import site does not churn). It used
 * to scroll on an infinite CSS loop; Peter's ruling on 2026-09-06 was that a
 * moving strip reads as amateur, so the band holds still. It now carries one
 * live sentence in the display italic (see `band-copy.ts` for the three
 * states) instead of a row of caps-and-separators phrases.
 *
 * The Claude mark sits once at the left as a decorative signature; it carries
 * its own aria-hidden. The link, when there is one, is plain at rest and
 * underlines on hover and keyboard focus. The `.karibu :focus-visible` ring is
 * clay on clay here, so the band overrides it with its own darker token.
 */

import Link from "next/link";
import { ClaudeMark } from "@/components/karibu/ClaudeMark";
import type { BandCopy } from "@/components/karibu/band-copy";

export function Marquee({ text, href, linkText }: BandCopy) {
  return (
    <div data-marquee className="border-b border-band-bg-hover bg-band-bg">
      <p className="mx-auto flex max-w-[1180px] items-center justify-center gap-2.5 px-4 py-[7px] text-center font-serif text-[15px] font-light italic leading-[1.35] text-on-band sm:px-6 sm:text-[17px] md:px-10">
        <ClaudeMark className="h-3.5 w-3.5 shrink-0" />
        <span>
          {text}
          {href && linkText && (
            <Link
              href={href}
              className="text-on-band underline-offset-[3px] hover:underline focus-visible:underline focus-visible:outline-band-bg-hover!"
            >
              {linkText}
            </Link>
          )}
        </span>
      </p>
    </div>
  );
}
