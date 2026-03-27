import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getEvents, getEventBySlug, getApprovedDemosByEventId } from "@/lib/data";
import { Badge } from "@/components/ui/Badge";
import { MediaFrame } from "@/components/ui/MediaFrame";
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
  CheckCircle2,
  Trophy,
  Shield,
  Monitor,
  ExternalLink,
  Video,
  FileText,
} from "lucide-react";
import { EventDetailClient } from "./EventDetailClient";
import { DemoRequestForm } from "./DemoRequestForm";

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

  const isActionable =
    event.status === "upcoming" || event.status === "registration-open";

  const approvedDemos = event.id
    ? await getApprovedDemosByEventId(event.id).catch(() => [])
    : [];

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
        <Link
          href="/events"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {/* Event Poster */}
        {event.posterUrl && (
          <MediaFrame
            src={event.posterUrl}
            alt={`${event.title} poster`}
            title={`${event.slug}-poster.png`}
            width={896}
            height={504}
            variant="hero"
            priority
            glowColor="green"
            className="mb-8"
          />
        )}

        <ScrollReveal>
          <header className="mb-10">
            <div className="mb-4">
              <Badge variant={event.status}>
                {statusLabels[event.status] ?? event.status}
              </Badge>
            </div>

            <h1 className="mb-6 font-mono text-3xl font-bold text-text-primary sm:text-4xl lg:text-5xl">
              {event.title}
            </h1>

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
                  {typeLabels[event.type] ?? event.type}
                </span>
              </div>
            </div>
          </header>
        </ScrollReveal>

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

        {agendaEntries && agendaEntries.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
              <span className="text-text-dim">## </span>Agenda
            </h2>
            <Timeline entries={agendaEntries} />
          </section>
        )}

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

        {/* Scheduled Demos */}
        {approvedDemos.length > 0 && (
          <ScrollReveal delay={150}>
            <section className="mb-10">
              <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
                <span className="text-text-dim">## </span>Scheduled Demos
              </h2>
              <div className="space-y-3">
                {approvedDemos.map((demo) => (
                  <div
                    key={demo.id}
                    className="border border-border-default bg-bg-card p-4 transition-colors hover:border-green-primary/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Monitor className="h-4 w-4 text-cyan shrink-0" aria-hidden="true" />
                          <h3 className="font-mono text-sm font-semibold text-text-primary truncate">
                            {demo.projectTitle}
                          </h3>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-2">
                          {demo.description}
                        </p>
                        <div className="flex items-center gap-4 text-[11px] font-mono text-text-dim">
                          <span>by {demo.name}</span>
                          <span>{demo.estimatedTime} min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {demo.demoUrl && (
                          <a
                            href={demo.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-text-dim hover:text-green-primary transition-colors"
                            aria-label="Live demo"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* Resources for Completed Events */}
        {event.status === "completed" && (event.recordingUrl || event.slidesUrl) && (
          <ScrollReveal delay={150}>
            <section className="mb-10">
              <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
                <span className="text-text-dim">## </span>Resources
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {event.recordingUrl && (
                  <a
                    href={event.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border border-border-default bg-bg-card p-4 transition-all hover:border-green-primary/30 hover:bg-bg-card/80"
                  >
                    <Video className="h-5 w-5 text-green-primary shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-mono text-sm font-semibold text-text-primary">Watch Recording</p>
                      <p className="text-[11px] font-mono text-text-dim">Full event recording</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-text-dim ml-auto shrink-0" />
                  </a>
                )}
                {event.slidesUrl && (
                  <a
                    href={event.slidesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border border-border-default bg-bg-card p-4 transition-all hover:border-green-primary/30 hover:bg-bg-card/80"
                  >
                    <FileText className="h-5 w-5 text-cyan shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-mono text-sm font-semibold text-text-primary">View Slides</p>
                      <p className="text-[11px] font-mono text-text-dim">Presentation materials</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-text-dim ml-auto shrink-0" />
                  </a>
                )}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* Demo Request Form */}
        {isActionable && (
          <ScrollReveal delay={200}>
            <section className="mb-10">
              <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
                <span className="text-text-dim">## </span>Request a Demo Slot
              </h2>
              <p className="text-sm text-text-secondary mb-6 max-w-xl">
                Have something to show? Request a demo slot to showcase your project, tool, or workflow at this event.
              </p>
              <DemoRequestForm eventSlug={event.slug} />
            </section>
          </ScrollReveal>
        )}

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

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <section className="mb-10 border-t border-border-default pt-8">
            <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
              <span className="text-text-dim">## </span>Related Events
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedEvents.map((related) => (
                <Link
                  key={related.slug}
                  href={`/events/${related.slug}`}
                  className="group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/30"
                >
                  <Badge variant={related.status} className="mb-3">
                    {statusLabels[related.status] ?? related.status}
                  </Badge>
                  <h3 className="font-mono text-sm font-semibold text-text-primary group-hover:text-green-primary transition-colors mb-2">
                    {related.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text-dim">
                    <span>{formatDate(related.date)}</span>
                    <span>{related.city}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
