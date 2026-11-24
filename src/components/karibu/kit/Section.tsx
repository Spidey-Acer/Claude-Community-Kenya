/**
 * Section: a titled page section. Eyebrow, h2, optional lead, then children,
 * revealed once on scroll. `aria-labelledby` ties the region to its heading.
 */

import type { ReactNode } from "react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { EYEBROW, H2, LEAD, WRAP } from "./tokens";

interface SectionProps {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  children: ReactNode;
}

export function Section({ id, eyebrow, title, lead, children }: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`${WRAP} py-10 sm:py-12`}>
      <Reveal>
        <div className="mb-7 max-w-[680px]">
          <p className={`${EYEBROW} mb-3`}>{eyebrow}</p>
          <h2 id={headingId} className={`${H2} mb-3`}>
            {title}
          </h2>
          {lead && <p className={LEAD}>{lead}</p>}
        </div>
        {children}
      </Reveal>
    </section>
  );
}
