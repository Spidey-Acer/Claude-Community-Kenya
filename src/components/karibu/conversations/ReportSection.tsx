/**
 * ReportSection — "The report" section on a public Conversations event page,
 * shown when the admin has attached a written brief (reportSummary) and/or a
 * link to the full report (reportUrl). Renders after the contribution
 * columns/form. Server component, Karibu tokens (see StatWall for the same
 * card idiom).
 */

import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

interface ReportSectionProps {
  reportSummary: string | null;
  reportUrl: string | null;
}

export function ReportSection({ reportSummary, reportUrl }: ReportSectionProps) {
  if (!reportSummary && !reportUrl) return null;

  const paragraphs = reportSummary ? reportSummary.split(/\n\s*\n/) : [];

  return (
    <section className={`${WRAP} pb-14`} aria-label="The report">
      <Reveal>
        <div className="mx-auto max-w-[760px] rounded-2xl border border-sand bg-paper-card p-8 sm:p-10">
          <div className="mb-4 font-inter text-xs font-semibold uppercase tracking-[0.18em] text-clay">
            The report
          </div>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="mb-4 last:mb-0 font-inter text-[15px] leading-[1.7] text-ink"
            >
              {p}
            </p>
          ))}
          {reportUrl && (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Read the report
            </a>
          )}
        </div>
      </Reveal>
    </section>
  );
}
