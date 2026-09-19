/**
 * FramedPhoto — the offset-shadow, clay-bordered photo frame used by "Who we
 * are" (home + about) and reusable anywhere else a single real photo needs
 * the Karibu answer to africahackon's red picture frame: a sand card sat
 * behind the photo and offset down-right, then a 1px clay border on the
 * photo itself. Server component — no state, just markup.
 */

import Image from "next/image";

interface FramedPhotoProps {
  src: string;
  alt: string;
  /** Small uppercase chip in the top-left corner, e.g. "First meetup · Jan 2026". */
  caption?: string;
  /** Tailwind aspect-ratio class. Defaults to the artboard's 4:3. */
  aspect?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export function FramedPhoto({
  src,
  alt,
  caption,
  aspect = "aspect-[4/3]",
  priority,
  sizes = "(max-width: 768px) 100vw, 500px",
  className,
}: FramedPhotoProps) {
  return (
    <div className={`relative pb-4 pr-4 ${className ?? ""}`}>
      <div className="absolute inset-0 left-4 top-4 rounded-2xl bg-sand" aria-hidden="true" />
      <div className={`relative overflow-hidden rounded-2xl border border-clay bg-paper-alt ${aspect}`}>
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
        {caption && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-scrim/70 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-scrim-text-soft">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
