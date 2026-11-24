import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { SITE_CONFIG } from "@/lib/constants"
import { listPublishedConversationsReports } from "@/lib/conversations/queries"
import { listPublishedRecapCohorts } from "@/lib/impact-lab/public-recap-store"
import { EmptyState, Masthead, ReportCard, Section } from "@/components/karibu/kit"

/**
 * The index `/reports` was 404ing behind — every published Conversations
 * write-up and Impact Lab recap, in one place. Sourced live from the
 * database on every request rather than a hand-maintained list, so a report
 * published later shows up here without a code change.
 */
export const dynamic = "force-dynamic"

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

const CONVERSATIONS_INTRO =
  "Claude Conversations is where Kenyans decide what the community builds next: a room, a question, and a result we publish."

const GRID = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"

export const metadata: Metadata = {
  title: "Reports | Claude Community Kenya",
  description: "Published write-ups and results from Claude Community Kenya events.",
  alternates: { canonical: `${SITE_CONFIG.url}/reports` },
}

/** Runs a read that may fail (database down); logs and falls back so the page still renders. */
async function readOrEmpty<T>(label: string, read: () => Promise<T[]>): Promise<T[]> {
  try {
    return await read()
  } catch (error) {
    console.error(`[reports] could not load ${label}`, error)
    return []
  }
}

export default async function ReportsIndexPage() {
  const [conversationsReports, recapCohorts] = await Promise.all([
    readOrEmpty("conversations reports", listPublishedConversationsReports),
    readOrEmpty("impact lab recaps", listPublishedRecapCohorts),
  ])

  const hasKnownPdf = conversationsReports.some((r) => r.reportUrl === KNOWN_PDF_FALLBACK.reportUrl)
  const conversations = hasKnownPdf ? conversationsReports : [...conversationsReports, KNOWN_PDF_FALLBACK]

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Reports" }]} />
      <Masthead
        eyebrow="Reports"
        title="What we published"
        lead="Write-ups and results from Impact Labs and Claude Conversations, published after each event."
      />

      <div id="impact-labs" className="scroll-mt-24">
        <Section eyebrow="Impact Lab" title="Impact Lab recaps">
          {recapCohorts.length > 0 ? (
            <ul className={GRID}>
              {recapCohorts.map((r) => (
                <li key={r.cohort}>
                  <ReportCard
                    kind="recap"
                    href={`/impact-lab/${r.cohort}`}
                    title={r.eventName}
                    date={r.publishedAt}
                    summary="Results and highlights from this Impact Lab cohort."
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing published yet." body="Recaps appear here once an Impact Lab cohort publishes its results." />
          )}
        </Section>
      </div>

      <div id="conversations" className="scroll-mt-24">
        <Section eyebrow="Claude Conversations" title="Conversations reports" lead={CONVERSATIONS_INTRO}>
          <ul className={GRID}>
            {conversations.map((r) => (
              <li key={r.reportUrl}>
                <ReportCard
                  kind="conversation"
                  href={r.reportUrl}
                  title={r.eventTitle}
                  date={r.eventDate}
                  summary="The published write-up from this Claude Conversations event (PDF)."
                />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
