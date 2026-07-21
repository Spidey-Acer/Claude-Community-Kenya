"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { Timeline } from "@/components/ui/Timeline";
import { TerminalWindow, ScrollReveal } from "@/components/terminal";
import { useSkin } from "@/contexts/SkinContext";
import { formatDate } from "@/lib/utils";
import type { Event } from "@/lib/types";
import type { DemoRequestView, PhotoView } from "@/lib/data";
import { EventPhotoStrip } from "./EventPhotoStrip";
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

/** Fraunces display-serif style for Pro headings. */
const FRAUNCES: React.CSSProperties = {
  fontFamily: "var(--font-display), ui-serif, Georgia, serif",
  letterSpacing: "-0.025em",
};

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

interface TimelineEntry {
  date: string;
  title: string;
  description: string;
  hash: string;
}

interface EventDetailContentProps {
  event: Event;
  agendaEntries?: TimelineEntry[];
  descriptionParagraphs: string[];
  approvedDemos: DemoRequestView[];
  /** Subset of all events used as "related" suggestions. */
  relatedEvents: Event[];
  eventUrl: string;
  twitterShareUrl: string;
  linkedInShareUrl: string;
  photos?: PhotoView[];
}

export function EventDetailContent({
  event,
  agendaEntries,
  descriptionParagraphs,
  approvedDemos,
  relatedEvents,
  eventUrl,
  twitterShareUrl,
  linkedInShareUrl,
  photos = [],
}: EventDetailContentProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  const isActionable =
    event.status === "upcoming" || event.status === "registration-open";

  // ─── Pro section heading ───────────────────────────────────────────────────
  function ProHeading({ children }: { children: React.ReactNode }) {
    return (
      <h2
        className="mb-6 mt-12 text-[28px] font-medium text-[#faf9f5]"
        style={FRAUNCES}
      >
        {children}
      </h2>
    );
  }

  // ─── Dev section heading ───────────────────────────────────────────────────
  function DevHeading({ children }: { children: React.ReactNode }) {
    return (
      <h2 className="mb-6 font-mono text-xl font-semibold text-green-primary">
        <span className="text-text-dim">## </span>
        {children}
      </h2>
    );
  }

  const SectionHeading = isPro ? ProHeading : DevHeading;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      {isPro ? (
        <Link
          href="/events"
          className="link-refined mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#9a9890] hover:text-[#e8e6dc]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to events
        </Link>
      ) : (
        <Link
          href="/events"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      )}

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

          {isPro ? (
            <h1
              className="mb-6 text-3xl font-bold text-[#faf9f5] sm:text-4xl lg:text-5xl"
              style={FRAUNCES}
            >
              {event.title}
            </h1>
          ) : (
            <h1 className="mb-6 font-mono text-3xl font-bold text-text-primary sm:text-4xl lg:text-5xl">
              {event.title}
            </h1>
          )}

          <div className="flex flex-wrap gap-6 text-text-secondary">
            <div className="flex items-center gap-2">
              <Calendar
                className={`h-4 w-4 ${isPro ? "text-[#d97757]" : "text-green-dim"}`}
                aria-hidden="true"
              />
              <span className={`text-sm ${isPro ? "text-[#b0aea5]" : "font-sans"}`}>
                {formatDate(event.date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock
                className={`h-4 w-4 ${isPro ? "text-[#d97757]" : "text-green-dim"}`}
                aria-hidden="true"
              />
              <span className={`text-sm ${isPro ? "text-[#b0aea5]" : "font-sans"}`}>
                {event.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin
                className={`h-4 w-4 ${isPro ? "text-[#d97757]" : "text-green-dim"}`}
                aria-hidden="true"
              />
              <span className={`text-sm ${isPro ? "text-[#b0aea5]" : "font-sans"}`}>
                {event.venue}, {event.city}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag
                className={`h-4 w-4 ${isPro ? "text-[#d97757]" : "text-green-dim"}`}
                aria-hidden="true"
              />
              {isPro ? (
                <span className="text-sm text-[#b0aea5]">
                  {typeLabels[event.type] ?? event.type}
                </span>
              ) : (
                <span className="font-mono text-xs uppercase tracking-wider">
                  {typeLabels[event.type] ?? event.type}
                </span>
              )}
            </div>
          </div>
        </header>
      </ScrollReveal>

      {/* Description */}
      <ScrollReveal delay={100}>
        <section className="mb-10">
          {isPro ? (
            <div className="card-elevated rounded-2xl p-8 space-y-4">
              {descriptionParagraphs.map((paragraph, i) => (
                <p key={i} className="leading-relaxed text-[#b0aea5]">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <TerminalWindow
              title={`cat events/${event.slug}/README.md`}
              variant="default"
            >
              <div className="space-y-4">
                {descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-text-secondary leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </TerminalWindow>
          )}
        </section>
      </ScrollReveal>

      {/* Agenda */}
      {agendaEntries && agendaEntries.length > 0 && (
        <section className="mb-10">
          <SectionHeading>Agenda</SectionHeading>
          <Timeline entries={agendaEntries} />
        </section>
      )}

      {/* Host / Partner */}
      {(event.host || event.partnerOrg) && (
        <section className="mb-10 grid gap-4 sm:grid-cols-2">
          {event.host && (
            <div
              className={
                isPro
                  ? "card-elevated rounded-2xl p-5"
                  : "border border-border-default bg-bg-card p-5"
              }
            >
              <div
                className={`mb-2 flex items-center gap-2 ${isPro ? "text-[#9a9890]" : "text-text-dim"}`}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                <span
                  className={
                    isPro
                      ? "text-xs uppercase tracking-wider"
                      : "font-mono text-xs uppercase tracking-wider"
                  }
                >
                  Hosted by
                </span>
              </div>
              <p
                className={isPro ? "text-[#faf9f5]" : "font-sans text-text-primary"}
              >
                {event.host}
              </p>
            </div>
          )}
          {event.partnerOrg && (
            <div
              className={
                isPro
                  ? "card-elevated rounded-2xl p-5"
                  : "border border-border-default bg-bg-card p-5"
              }
            >
              <div
                className={`mb-2 flex items-center gap-2 ${isPro ? "text-[#9a9890]" : "text-text-dim"}`}
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <span
                  className={
                    isPro
                      ? "text-xs uppercase tracking-wider"
                      : "font-mono text-xs uppercase tracking-wider"
                  }
                >
                  With Thanks To
                </span>
              </div>
              <p
                className={isPro ? "text-[#faf9f5]" : "font-sans text-text-primary"}
              >
                {event.partnerOrg}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Prizes */}
      {event.prizes && event.prizes.length > 0 && (
        <section className="mb-10">
          <SectionHeading>Prizes &amp; Swag</SectionHeading>
          {isPro ? (
            <div className="card-elevated rounded-2xl p-8">
              <ul className="space-y-3">
                {event.prizes.map((prize, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#d97757]" aria-hidden="true">•</span>
                    <span className="text-[#b0aea5]">{prize}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
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
          )}
        </section>
      )}

      {/* Rules */}
      {event.rules && event.rules.length > 0 && (
        <section className="mb-10">
          <SectionHeading>Rules</SectionHeading>
          {isPro ? (
            <div className="card-elevated rounded-2xl p-8">
              <ul className="space-y-3">
                {event.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#d97757]" aria-hidden="true">•</span>
                    <span className="text-[#b0aea5]">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <TerminalWindow title="rules.md" variant="default">
              <ul className="space-y-3">
                {event.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Shield
                      className="mt-0.5 h-4 w-4 shrink-0 text-cyan"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-sm text-text-secondary">
                      <span className="text-green-dim mr-2">
                        {String(i + 1).padStart(2, "0")}.
                      </span>
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </TerminalWindow>
          )}
        </section>
      )}

      {/* Highlights */}
      {event.status === "completed" &&
        event.highlights &&
        event.highlights.length > 0 && (
          <section className="mb-10">
            <SectionHeading>Highlights</SectionHeading>
            {isPro ? (
              <div className="card-elevated rounded-2xl p-8">
                <ul className="space-y-3">
                  {event.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-[#d97757]" aria-hidden="true">•</span>
                      <span className="text-[#b0aea5]">{highlight}</span>
                    </li>
                  ))}
                </ul>
                {event.attendeeCount && (
                  <p className="mt-4 border-t border-[#2a2a28] pt-4 text-sm text-[#9a9890]">
                    Total attendees: {event.attendeeCount}
                  </p>
                )}
              </div>
            ) : (
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
            )}
          </section>
        )}

      {/* Photos from this event */}
      {photos.length > 0 && (
        <ScrollReveal delay={120}>
          <section className="mb-10" aria-labelledby="event-photos-heading">
            <EventPhotoStrip photos={photos} eventSlug={event.slug} />
          </section>
        </ScrollReveal>
      )}

      {/* Scheduled Demos */}
      {approvedDemos.length > 0 && (
        <ScrollReveal delay={150}>
          <section className="mb-10">
            <SectionHeading>Scheduled Demos</SectionHeading>
            <div className="space-y-3">
              {approvedDemos.map((demo) => (
                <div
                  key={demo.id}
                  className={
                    isPro
                      ? "card-elevated rounded-2xl p-4 transition-all"
                      : "border border-border-default bg-bg-card p-4 transition-colors hover:border-green-primary/30"
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Monitor
                          className={`h-4 w-4 shrink-0 ${isPro ? "text-[#d97757]" : "text-cyan"}`}
                          aria-hidden="true"
                        />
                        <h3
                          className={`text-sm font-semibold truncate ${isPro ? "text-[#faf9f5]" : "font-mono text-text-primary"}`}
                        >
                          {demo.projectTitle}
                        </h3>
                      </div>
                      <p
                        className={`text-sm leading-relaxed line-clamp-2 mb-2 ${isPro ? "text-[#b0aea5]" : "text-text-secondary"}`}
                      >
                        {demo.description}
                      </p>
                      <div
                        className={`flex items-center gap-4 text-[11px] ${isPro ? "text-[#9a9890]" : "font-mono text-text-dim"}`}
                      >
                        <span>by {demo.name}</span>
                        <span>{demo.estimatedTime}&nbsp;min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {demo.demoUrl && (
                        <a
                          href={demo.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 transition-colors ${isPro ? "text-[#9a9890] hover:text-[#d97757]" : "text-text-dim hover:text-green-primary"}`}
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

      {/* Resources (completed events) */}
      {event.status === "completed" &&
        (event.recordingUrl || event.slidesUrl) && (
          <ScrollReveal delay={150}>
            <section className="mb-10">
              <SectionHeading>Resources</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                {event.recordingUrl && (
                  <a
                    href={event.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      isPro
                        ? "card-elevated flex items-center gap-3 rounded-2xl p-4 transition-all hover:no-underline"
                        : "flex items-center gap-3 border border-border-default bg-bg-card p-4 transition-all hover:border-green-primary/30 hover:bg-bg-card/80"
                    }
                  >
                    <Video
                      className={`h-5 w-5 shrink-0 ${isPro ? "text-[#d97757]" : "text-green-primary"}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${isPro ? "text-[#faf9f5]" : "font-mono text-text-primary"}`}
                      >
                        Watch Recording
                      </p>
                      <p
                        className={`text-[11px] ${isPro ? "text-[#9a9890]" : "font-mono text-text-dim"}`}
                      >
                        Full event recording
                      </p>
                    </div>
                    <ExternalLink
                      className={`ml-auto h-4 w-4 shrink-0 ${isPro ? "text-[#9a9890]" : "text-text-dim"}`}
                    />
                  </a>
                )}
                {event.slidesUrl && (
                  <a
                    href={event.slidesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      isPro
                        ? "card-elevated flex items-center gap-3 rounded-2xl p-4 transition-all hover:no-underline"
                        : "flex items-center gap-3 border border-border-default bg-bg-card p-4 transition-all hover:border-green-primary/30 hover:bg-bg-card/80"
                    }
                  >
                    <FileText
                      className={`h-5 w-5 shrink-0 ${isPro ? "text-[#d97757]" : "text-cyan"}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${isPro ? "text-[#faf9f5]" : "font-mono text-text-primary"}`}
                      >
                        View Slides
                      </p>
                      <p
                        className={`text-[11px] ${isPro ? "text-[#9a9890]" : "font-mono text-text-dim"}`}
                      >
                        Presentation materials
                      </p>
                    </div>
                    <ExternalLink
                      className={`ml-auto h-4 w-4 shrink-0 ${isPro ? "text-[#9a9890]" : "text-text-dim"}`}
                    />
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
            <SectionHeading>Request a Demo Slot</SectionHeading>
            <p
              className={`text-sm mb-6 max-w-xl ${isPro ? "text-[#b0aea5]" : "text-text-secondary"}`}
            >
              Have something to show? Request a demo slot to showcase your
              project, tool, or workflow at this event.
            </p>
            <DemoRequestForm eventSlug={event.slug} />
          </section>
        </ScrollReveal>
      )}

      {/* Seat progress — only when both capacity and attendeeCount set on an upcoming event */}
      {isActionable && event.capacity && event.attendeeCount !== undefined && event.attendeeCount !== null && (
        <section className="mb-6" aria-label="Seat availability">
          {(() => {
            const taken = Math.min(event.attendeeCount!, event.capacity!)
            const pct = Math.max(0, Math.min(100, Math.round((taken / event.capacity!) * 100)))
            const remaining = Math.max(0, event.capacity! - taken)
            const isFull = remaining === 0
            const isAlmostFull = !isFull && pct >= 80
            return isPro ? (
              <div className="card-elevated rounded-2xl p-5">
                <div className="mb-2 flex items-center justify-between text-[13px] text-[#b0aea5]">
                  <span>
                    <span className="text-[#faf9f5] tabular-nums">{taken}</span>
                    <span className="text-[#7a7870]"> / </span>
                    <span className="tabular-nums">{event.capacity}</span>{" "}
                    seats taken
                  </span>
                  <span className={isFull ? "text-[#d97757]" : isAlmostFull ? "text-[#ffb000]" : "text-[#7a7870]"}>
                    {isFull ? "Sold out" : `${remaining} left`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a28]">
                  <div
                    className="h-full rounded-full bg-[#d97757] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            ) : (
              <div className="border border-border-default bg-bg-secondary/40 p-4 font-mono text-sm">
                <div className="mb-2 flex items-center justify-between text-text-secondary">
                  <span>
                    <span className="text-green-primary tabular-nums">{taken}</span>
                    <span className="text-text-dim"> / </span>
                    <span className="tabular-nums">{event.capacity}</span> seats
                  </span>
                  <span className={isFull ? "text-red" : isAlmostFull ? "text-amber" : "text-text-dim"}>
                    {isFull ? "// sold out" : `// ${remaining} left`}
                  </span>
                </div>
                <div className="h-1 w-full bg-bg-elevated">
                  <div
                    className="h-full bg-green-primary"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )
          })()}
        </section>
      )}

      {/* Registration CTA */}
      {isActionable && event.registrationUrl && (
        <section className="mb-10">
          {isPro ? (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary-shadow inline-flex items-center gap-2 rounded-full bg-[#d97757] px-6 py-3 text-[14px] font-semibold text-[#faf9f5] hover:bg-[#c06848]"
            >
              Register Now →
            </a>
          ) : (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-green-primary bg-green-primary/10 px-8 py-4 font-mono text-base font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              <span aria-hidden="true">&gt;</span>
              Register Now
            </a>
          )}
        </section>
      )}

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <section className="mb-10 border-t border-border-default pt-8">
          <SectionHeading>Related Events</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedEvents.map((related) => (
              <Link
                key={related.slug}
                href={`/events/${related.slug}`}
                className={
                  isPro
                    ? "card-elevated group block rounded-2xl p-5"
                    : "group border border-border-default bg-bg-card p-5 transition-all hover:border-green-primary/30"
                }
              >
                <Badge variant={related.status} className="mb-3">
                  {statusLabels[related.status] ?? related.status}
                </Badge>
                <h3
                  className={`text-sm font-semibold mb-2 transition-colors ${isPro ? "text-[#faf9f5] group-hover:text-[#d97757]" : "font-mono text-text-primary group-hover:text-green-primary"}`}
                >
                  {related.title}
                </h3>
                <div
                  className={`flex items-center gap-3 text-[11px] ${isPro ? "text-[#9a9890]" : "font-mono text-text-dim"}`}
                >
                  <span>{formatDate(related.date)}</span>
                  <span>{related.city}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Share */}
      <section className="border-t border-border-default pt-8">
        <h2
          className={`mb-4 ${isPro ? "text-sm text-[#9a9890]" : "font-mono text-sm uppercase tracking-wider text-text-dim"}`}
        >
          Share this event
        </h2>
        <div className="flex flex-wrap gap-3">
          <EventDetailClient eventUrl={eventUrl} />
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isPro
                ? "inline-flex items-center gap-2 rounded-full border border-[#2a2a28] px-4 py-2 text-sm text-[#b0aea5] transition-colors hover:border-[#3a3a37] hover:text-[#faf9f5]"
                : "inline-flex items-center gap-2 border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
            }
            aria-label="Share on Twitter"
          >
            Twitter
          </a>
          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isPro
                ? "inline-flex items-center gap-2 rounded-full border border-[#2a2a28] px-4 py-2 text-sm text-[#b0aea5] transition-colors hover:border-[#3a3a37] hover:text-[#faf9f5]"
                : "inline-flex items-center gap-2 border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
            }
            aria-label="Share on LinkedIn"
          >
            LinkedIn
          </a>
        </div>
      </section>
    </div>
  );
}
