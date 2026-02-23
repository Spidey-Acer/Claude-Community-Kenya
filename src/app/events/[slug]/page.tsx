import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getEventBySlug, events } from "@/data/events";
import { Badge } from "@/components/ui/Badge";
import { Timeline } from "@/components/ui/Timeline";
import { TerminalWindow, ScrollReveal } from "@/components/terminal";
import { formatDate } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  ArrowLeft,
  Users,
  Building2,
  Link as LinkIcon,
  CheckCircle2,
  Trophy,
  Shield,
} from "lucide-react";
import { EventDetailClient } from "./EventDetailClient";

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);

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

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  "registration-open": "Registration Open",
  completed: "Completed",
  "sold-out": "Sold Out",
};

const typeLabels: Record<string, string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  "career-talk": "Career Talk",
  hackathon: "Hackathon",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const isActionable =
    event.status === "upcoming" || event.status === "registration-open";

  // Build agenda timeline entries
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

  // Description text (preserve paragraph breaks)
  const descriptionText = event.fullDescription ?? event.description;
  const descriptionParagraphs = descriptionText.split("\n\n");

  // Share URLs
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
    eventStatus:
      event.status === "completed"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventScheduled",
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
    ...(event.registrationUrl && { offers: { "@type": "Offer", url: event.registrationUrl, price: "0", priceCurrency: "KES" } }),
  };

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Events", url: "/events" },
          { name: event.title },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <Link
          href="/events"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {/* Header section */}
        <ScrollReveal>
          <header className="mb-10">
            <div className="mb-4">
              <Badge variant={event.status}>
                {statusLabels[event.status]}
              </Badge>
            </div>

            <h1 className="mb-6 font-mono text-3xl font-bold text-text-primary sm:text-4xl lg:text-5xl">
              {event.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap gap-6 text-text-secondary">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-dim" aria-hidden="true" />
                <span className="font-sans text-sm">{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-dim" aria-hidden="true" />
                <span className="font-sans text-sm">{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-dim" aria-hidden="true" />
                <span className="font-sans text-sm">
                  {event.venue}, {event.city}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-dim" aria-hidden="true" />
                <span className="font-mono text-xs uppercase tracking-wider">
                  {typeLabels[event.type]}
                </span>
              </div>
            </div>
          </header>
        </ScrollReveal>

        {/* Description */}
        <ScrollReveal delay={100}>
          <section className="mb-10">
            <TerminalWindow title={`cat events/${event.slug}/README.md`} variant="default">
              <div className="space-y-4">
                {descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-text-secondary leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </TerminalWindow>
          </section>
        </ScrollReveal>

        {/* Agenda */}
        {agendaEntries && agendaEntries.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
              <span className="text-text-dim">## </span>Agenda
            </h2>
            <Timeline entries={agendaEntries} />
          </section>
        )}

        {/* Host & Partner */}
        {(event.host || event.partnerOrg) && (
          <section className="mb-10 grid gap-4 sm:grid-cols-2">
            {event.host && (
              <div className="border border-border-default bg-bg-card p-5">
                <div className="mb-2 flex items-center gap-2 text-text-dim">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span className="font-mono text-xs uppercase tracking-wider">
                    Hosted by
                  </span>
                </div>
                <p className="font-sans text-text-primary">{event.host}</p>
              </div>
            )}
            {event.partnerOrg && (
              <div className="border border-border-default bg-bg-card p-5">
                <div className="mb-2 flex items-center gap-2 text-text-dim">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  <span className="font-mono text-xs uppercase tracking-wider">
                    Partner Organizations
                  </span>
                </div>
                <p className="font-sans text-text-primary">{event.partnerOrg}</p>
              </div>
            )}
          </section>
        )}

        {/* Prizes (hackathon / upcoming) */}
        {event.prizes && event.prizes.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
              <span className="text-text-dim">## </span>Prizes & Swag
            </h2>
            <TerminalWindow title="prizes.md" variant="command">
              <ul className="space-y-3">
                {event.prizes.map((prize, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Trophy
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber"
                      aria-hidden="true"
                    />
                    <span className="text-text-secondary">{prize}</span>
                  </li>
                ))}
              </ul>
            </TerminalWindow>
          </section>
        )}

        {/* Rules */}
        {event.rules && event.rules.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
              <span className="text-text-dim">## </span>Rules
            </h2>
            <TerminalWindow title="rules.md" variant="default">
              <ul className="space-y-3">
                {event.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Shield
                      className="mt-0.5 h-4 w-4 shrink-0 text-cyan"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-sm text-text-secondary">
                      <span className="text-green-dim mr-2">{String(i + 1).padStart(2, "0")}.</span>
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </TerminalWindow>
          </section>
        )}

        {/* Highlights (completed events only) */}
        {event.status === "completed" &&
          event.highlights &&
          event.highlights.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
                <span className="text-text-dim">## </span>Highlights
              </h2>
              <TerminalWindow
                title={`cat events/${event.slug}/highlights.log`}
                variant="command"
              >
                <ul className="space-y-3">
                  {event.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-green-primary"
                        aria-hidden="true"
                      />
                      <span className="text-text-secondary">{highlight}</span>
                    </li>
                  ))}
                </ul>
                {event.attendeeCount && (
                  <p className="mt-4 border-t border-border-default pt-4 font-mono text-sm text-text-dim">
                    Total attendees: {event.attendeeCount}
                  </p>
                )}
              </TerminalWindow>
            </section>
          )}

        {/* Registration CTA */}
        {isActionable && event.registrationUrl && (
          <section className="mb-10">
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-green-primary bg-green-primary/10 px-8 py-4 font-mono text-base font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              <span aria-hidden="true">&gt;</span>
              Register Now
            </a>
          </section>
        )}

        {/* Share section */}
        <section className="border-t border-border-default pt-8">
          <h2 className="mb-4 font-mono text-sm uppercase tracking-wider text-text-dim">
            Share this event
          </h2>
          <div className="flex flex-wrap gap-3">
            <EventDetailClient eventUrl={eventUrl} />
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              aria-label="Share on Twitter"
            >
              Twitter
            </a>
            <a
              href={linkedInShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              aria-label="Share on LinkedIn"
            >
              LinkedIn
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
