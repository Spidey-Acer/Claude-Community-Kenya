import Link from "next/link";
import { FileText } from "lucide-react";
import type { ConversationsReportView } from "@/lib/conversations/queries";

/**
 * Compact card surfacing the written report from a Claude Conversations
 * event linked to this Impact Lab cohort (ImpactLabEvent.conversationsEventId).
 * Server component — no state, just links out to the report and the public
 * conversation page. Terminal Noir classes, matching the rest of this page.
 */
export function ConversationsReportCard({
  report,
}: {
  report: ConversationsReportView;
}) {
  const firstParagraph = report.reportSummary.split(/\n\s*\n/)[0] ?? "";

  return (
    <section
      className="mb-6 rounded-lg border border-border-default bg-bg-secondary p-5"
      aria-label="Claude Conversations report"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-cyan/30 bg-cyan/10">
          <FileText className="h-4 w-4 text-cyan" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-sm font-bold text-text-primary">
            From Claude Conversations: {report.event.title}
          </h2>
          {firstParagraph && (
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {firstParagraph}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {report.reportUrl && (
              <a
                href={report.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-3 py-1.5 text-xs font-mono font-semibold text-green-primary transition-colors hover:bg-green-primary/20"
              >
                Read the report
              </a>
            )}
            <Link
              href={`/conversations/${report.event.slug}`}
              className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-3 py-1.5 text-xs font-mono text-text-secondary transition-colors hover:border-green-primary/40 hover:text-green-primary"
            >
              See the conversation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
