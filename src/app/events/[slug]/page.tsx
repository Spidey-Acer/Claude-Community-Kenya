import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getEvents, getEventBySlug, getApprovedDemosByEventId, getEventPhotos } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";
import { KaribuEventDetail } from "@/components/karibu/KaribuEventDetail";
import { serializeJsonLd } from "@/lib/json-ld"
import { getOpenQuestionSession } from "@/lib/conversations/queries"
import { cohortForPublicEvent, linkedCohortForPublicEvent } from "@/lib/impact-lab/event-store"
import { findPublicEventResults, hasPublishedRecap } from "@/lib/impact-lab/public-recap-store"

export const revalidate = 1800;

export async function generateStaticParams() {
  const events = await getEvents().catch(() => []);
  return events.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return { title: "Event Not Found | Claude Community Kenya" };
  }

  return {
    title: `${event.title} | Claude Community Kenya`,
    description: `${event.description} — Claude developer meetup in ${event.city}, Kenya.`,
    alternates: {
      canonical: `${SITE_CONFIG.url}/events/${event.slug}`,
    },
    openGraph: {
      title: event.title,
      description: event.description,
      url: `${SITE_CONFIG.url}/events/${event.slug}`,
      siteName: SITE_CONFIG.name,
      type: "article",
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, allEvents] = await Promise.all([
    getEventBySlug(slug),
    getEvents().catch(() => []),
  ]);

  if (!event) {
    notFound();
  }

  // Two resolvers, deliberately. The judges panel may use the loose one: its
  // whole job is to show a panel on the night, before anybody has wired the
  // link, and it re-fetches client-side anyway. Anything published off a
  // snapshot (the winners, the recap link) uses the strict one, because
  // the loose resolver's LIVE fallback handed the AI Mashinani 02 page Build
  // Day's champions on 2026-09-21.
  const isHackathon = Boolean(event.id) && event.type === "hackathon";
  const judgesCohortPromise =
    isHackathon && event.id
      ? cohortForPublicEvent(event.id, event.slug, event.title).catch(() => null)
      : Promise.resolve(null);
  const linkedCohortPromise =
    isHackathon && event.id
      ? linkedCohortForPublicEvent(event.id, event.slug, event.title).catch(() => null)
      : Promise.resolve(null);

  const [approvedDemos, eventPhotos, openQuestionSession, judgesCohort, linkedCohort] =
    await Promise.all([
      event.id
        ? getApprovedDemosByEventId(event.id).catch(() => [])
        : Promise.resolve([]),
      getEventPhotos(event.slug).catch(() => []),
      event.id ? getOpenQuestionSession(event.id).catch(() => null) : Promise.resolve(null),
      judgesCohortPromise,
      linkedCohortPromise,
    ]);

  // Only a cohort that has actually published its results is worth a link —
  // the recap page itself 404s otherwise, and `hasPublishedRecap` is one
  // cheap count rather than fetching the whole recap just to throw it away.
  // The winners section reads the published snapshot itself, in the same
  // await, so a published cohort costs the page no extra sequential trip.
  // Both read `linkedCohort`: a recap link is a public claim about whose
  // results these are, exactly like the winners rows.
  const [recapPublished, results] = linkedCohort
    ? await Promise.all([
        hasPublishedRecap(linkedCohort).catch(() => false),
        findPublicEventResults(linkedCohort).catch(() => null),
      ])
    : [false, null];
  const recapHref = recapPublished ? `/impact-lab/${linkedCohort}` : null;

  const relatedEvents = allEvents
    .filter((e) => e.slug !== event.slug)
    .filter((e) => e.city === event.city || e.type === event.type)
    .slice(0, 2);

  const agendaEntries = event.agenda?.map((item, i) => {
    const dashIndex = item.indexOf("—");
    const time = dashIndex !== -1 ? item.slice(0, dashIndex).trim() : "";
    const title = dashIndex !== -1 ? item.slice(dashIndex + 1).trim() : item;
    return {
      date: time,
      title,
      description: "",
      hash: `a${String(i + 1).padStart(2, "0")}`,
    };
  });

  const descriptionText = event.fullDescription ?? event.description;
  const descriptionParagraphs = descriptionText.split("\n\n");

  const eventUrl = `${SITE_CONFIG.url}/events/${event.slug}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${event.title} — ${SITE_CONFIG.name}`
  )}&url=${encodeURIComponent(eventUrl)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    eventUrl
  )}`;

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.date,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city,
        addressCountry: "KE",
      },
    },
    organizer: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    url: eventUrl,
    ...(event.registrationUrl && {
      offers: {
        "@type": "Offer",
        url: event.registrationUrl,
        price: "0",
        priceCurrency: "KES",
      },
    }),
  };

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Events", url: "/events" },
          { name: event.title },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd) }}
      />
      <KaribuEventDetail
        event={event}
        agendaEntries={agendaEntries}
        descriptionParagraphs={descriptionParagraphs}
        approvedDemos={approvedDemos}
        relatedEvents={relatedEvents}
        twitterShareUrl={twitterShareUrl}
        linkedInShareUrl={linkedInShareUrl}
        photos={eventPhotos}
        openQuestionSession={openQuestionSession}
        judgesCohort={judgesCohort}
        recapHref={recapHref}
        results={results}
      />
    </>
  );
}
