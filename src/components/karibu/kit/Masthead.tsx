/**
 * Masthead: the opening block of an inner page. Eyebrow, the page's one h1, a
 * lead paragraph, and an optional media node (a photo) beside it on wide
 * screens. Server component. `flush` drops the outer padding for guide pages
 * that already sit inside a padded section.
 */

import type { ReactNode } from "react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { EYEBROW, H1, LEAD, WRAP } from "./tokens";

interface MastheadProps {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  /** A photo; give it `fill` and let the frame size it. */
  media?: ReactNode;
  flush?: boolean;
  /** Anything that belongs under the lead, such as in-page links. */
  children?: ReactNode;
}

export function Masthead({ eyebrow, title, lead, media, flush = false, children }: MastheadProps) {
  const layout = media ? "grid items-center gap-10 lg:grid-cols-[1fr_440px]" : "";
  return (
    <header className={flush ? "" : `${WRAP} py-12 sm:py-16`}>
      <Reveal className={layout}>
        <div>
          <p className={`${EYEBROW} mb-4`}>{eyebrow}</p>
          <h1 className={`${H1} mb-4 max-w-[820px]`}>{title}</h1>
          {lead && <p className={`${LEAD} max-w-[620px]`}>{lead}</p>}
          {children}
        </div>
        {media && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-sand">{media}</div>
        )}
      </Reveal>
    </header>
  );
}
