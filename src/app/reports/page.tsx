import type { Metadata } from "next"
import Link from "next/link"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { SITE_CONFIG } from "@/lib/constants"
import { listPublishedConversationsReports } from "@/lib/conversations/queries"
import { listPublishedRecapCohorts } from "@/lib/impact-lab/public-recap-store"

/**
 * The index `/reports` was 404ing behind — every published Conversations
 * write-up and Impact Lab recap, in one place. Sourced live from the
 * database on every request rather than a hand-maintained list, so a report
 * published later shows up here without a code change.
 */
export const dynamic = "force-dynamic"

const WRAP = "mx-auto max-w-[860px] px-6 md:px-10"

/**
 * The one Conversations PDF known to exist in `public/reports/` at the time
 * this index was built (29 Aug 2026, Nairobi) — kept as a floor so the link
 * is never dangling even if its `ConversationsPage.reportUrl` has not been
 * set in the database. Deduplicated against the live query by URL.
 */
const KNOWN_PDF_FALLBACK = {
  eventTitle: "Claude Conversations — Nairobi",
  eventDate: "2026-08-29T00:00:00.000Z",
  reportUrl: "/reports/claude-conversations-nairobi-2026-08-29.pdf",
}

export const metadata: Metadata = {
  title: "Reports | Claude Community Kenya",
  description: "Published write-ups and results from Claude Community Kenya events.",
  alternates: { canonical: `${SITE_CONFIG.url}/reports` },
}

function formatDate(iso: string): string {
  const dt = new Date(iso)
  return Number.isNaN(dt.getTime())
    ? iso
    : dt.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
}

export default async function ReportsIndexPage() {
  const [conversationsReports, recapCohorts] = await Promise.all([
    listPublishedConversationsReports(),
    listPublishedRecapCohorts(),
  ])

  const hasKnownPdf = conversationsReports.some((r) => r.reportUrl === KNOWN_PDF_FALLBACK.reportUrl)
  const conversations = hasKnownPdf ? conversationsReports : [...conversationsReports, KNOWN_PDF_FALLBACK]

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Reports" }]} />

      <section className={`${WRAP} pb-8 pt-16`}>
        <div className="mb-3 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay">
          Reports
        </div>
        <h1 className="font-newsreader text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-ink sm:text-[42px]">
          What we published
        </h1>
      </section>

      <section className={`${WRAP} pb-14`}>
        {recapCohorts.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              Impact Lab results
            </h2>
            <ul className="flex flex-col gap-3">
              {recapCohorts.map((r) => (
                <li key={r.cohort} className="rounded-xl border border-sand bg-paper-card p-5">
                  <Link
                    href={`/impact-lab/${r.cohort}`}
                    className="font-newsreader text-[18px] text-ink hover:text-clay"
                  >
                    {r.eventName}
                  </Link>
                  <p className="mt-1 font-inter text-[12.5px] text-ink-muted">
                    Published {formatDate(r.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {conversations.length > 0 && (
          <div>
            <h2 className="mb-4 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              Claude Conversations
            </h2>
            <ul className="flex flex-col gap-3">
              {conversations.map((r) => (
                <li key={r.reportUrl} className="rounded-xl border border-sand bg-paper-card p-5">
                  <a
                    href={r.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-newsreader text-[18px] text-ink hover:text-clay"
                  >
                    {r.eventTitle} →
                  </a>
                  <p className="mt-1 font-inter text-[12.5px] text-ink-muted">{formatDate(r.eventDate)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recapCohorts.length === 0 && conversations.length === 0 && (
          <p className="font-inter text-[15px] text-ink-soft">Nothing published yet.</p>
        )}
      </section>
    </>
  )
}
