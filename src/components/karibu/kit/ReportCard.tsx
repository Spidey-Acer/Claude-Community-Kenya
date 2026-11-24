/**
 * ReportCard: one published report (an Impact Lab recap or a Conversations
 * report) as a link card. `kind` sets the small label above the title.
 */

import Link from "next/link";
import { CARD, META } from "./tokens";
import { NewTabNote } from "./NewTabNote";
import { formatDate } from "@/lib/utils";

interface ReportCardProps {
  kind: "recap" | "conversation";
  href: string;
  title: string;
  /** ISO date string. */
  date: string;
  summary: string;
}

const KIND_LABEL: Record<ReportCardProps["kind"], string> = {
  recap: "Recap",
  conversation: "Conversations report",
};

function displayDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return formatDate(iso);
}

export function ReportCard({ kind, href, title, date, summary }: ReportCardProps) {
  // A PDF is a file, not a page: it opens in a new tab through a plain anchor, not client navigation.
  const external = /^https?:\/\//.test(href) || /\.pdf(\?|#|$)/i.test(href);
  const body = (
    <div className="flex flex-1 flex-col p-6">
      <p className="mb-2 font-inter text-xs font-semibold uppercase tracking-[0.1em] text-clay">{KIND_LABEL[kind]}</p>
      <h3 className="mb-2 font-newsreader text-[22px] leading-tight text-ink">{title}</h3>
      <p className={`${META} mb-3`}>{displayDate(date)}</p>
      <p className="line-clamp-3 font-inter text-[14.5px] leading-[1.55] text-ink-soft">{summary}</p>
    </div>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={CARD}>
      {body}
      <NewTabNote />
    </a>
  ) : (
    <Link href={href} className={CARD}>
      {body}
    </Link>
  );
}
