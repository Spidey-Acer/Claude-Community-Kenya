/**
 * "I'm attending" card page: /events/[slug]/attending.
 *
 * Registered guests (checked by email against the event's Luma guest list)
 * turn their own photo into a branded card to post. Only live for upcoming
 * events. The page never says "verified", shows no counts, and is excluded
 * from analytics and search; next.config.ts sets its Content-Security-Policy.
 */
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getEventBySlug } from "@/lib/data"
import { isEventPast } from "@/lib/event-dates"
import { SITE_CONFIG } from "@/lib/constants"
import { buildInfoLine, formatCardDate } from "@/lib/attending/card-layout"
import { AttendingFlow } from "@/components/karibu/attending/AttendingFlow"

// Upcoming status is checked per request, never from a cached render.
export const dynamic = "force-dynamic"

const NOTICE =
  "We check your email against this event's Luma guest list and keep nothing you type; your photo stays on your device and is never uploaded."

export const metadata: Metadata = {
  title: "Make your attending card | Claude Community Kenya",
  robots: { index: false, follow: false },
}

export default async function AttendingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  const isOpen = event && (event.status === "upcoming" || event.status === "registration-open") && !isEventPast(event.date)
  if (!event || !isOpen) notFound()

  const dateLabel = formatCardDate(event.date)
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="font-newsreader text-[32px] text-ink">I&rsquo;m attending {event.title}</h1>
          <p className="font-inter text-[15px] leading-[1.6] text-ink-soft">{NOTICE}</p>
        </header>
        <AttendingFlow
          slug={event.slug}
          eventTitle={event.title}
          city={event.city}
          dateLabel={dateLabel}
          infoLine={buildInfoLine(dateLabel, event.city, event.venue)}
          eventUrl={`${SITE_CONFIG.url}/events/${event.slug}`}
        />
      </div>
    </div>
  )
}
