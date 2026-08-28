/**
 * ResultBanner — "Nairobi picked this" banner on a Conversations event page,
 * rendered above everything else once ConversationsPage.result is
 * published. A permanently-dark panel regardless of light/dark theme, so it
 * uses the non-inverting --panel-dark trio (never bg-ink — see repo Known
 * Issues). Server component.
 */

import { Reveal } from "@/components/karibu/motion/Reveal";
import type { ConversationsResult } from "@/lib/conversations/queries";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

interface ResultBannerProps {
  result: ConversationsResult;
  /** CTA target — see ConversationsPageView.impactLabLumaUrl for how this is chosen. */
  ctaUrl: string | null;
}

export function ResultBanner({ result, ctaUrl }: ResultBannerProps) {
  return (
    <section className={`${WRAP} pb-4 pt-10`} aria-label="The room's decision">
      <Reveal>
        <div className="rounded-2xl bg-panel-dark p-8 text-on-panel-dark sm:p-10">
          <div className="mb-3 font-inter text-xs font-semibold uppercase tracking-[0.18em] text-on-panel-dark-muted">
            Nairobi picked this
          </div>
          <h2 className="mb-2 font-newsreader text-[26px] leading-[1.2] text-on-panel-dark sm:text-[30px]">
            {result.winner.title}
          </h2>
          <p className="mb-6 max-w-[700px] font-inter text-[15px] leading-[1.6] text-on-panel-dark-muted">
            {result.winner.statement}
          </p>

          {result.runnersUp.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 font-inter text-[11px] font-semibold uppercase tracking-[0.1em] text-on-panel-dark-muted">
                Runners-up
              </div>
              <ul className="space-y-1.5" role="list">
                {result.runnersUp.map((r, i) => (
                  <li key={i} className="font-inter text-[14px] text-on-panel-dark">
                    {r.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.note && (
            <p className="mb-6 font-inter text-[13.5px] italic text-on-panel-dark-muted">{result.note}</p>
          )}

          {ctaUrl && (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#554E44] px-6 py-3 font-inter text-[14.5px] font-semibold text-on-panel-dark transition-colors hover:border-on-panel-dark"
            >
              See it built at Claude Impact Lab →
            </a>
          )}
        </div>
      </Reveal>
    </section>
  );
}
