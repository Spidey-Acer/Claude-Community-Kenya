"use client";

/**
 * KaribuEventDetail — warm-light event detail page for the Karibu identity.
 *
 * Ports event-detail.dc.html and preserves every dynamic feature of the
 * Terminal Noir page, restyled: cover, about, schedule, sidebar (when/where/
 * cost + register + ask), photo strip, scheduled demos, demo-request form,
 * share links, and related events. All content is DB-backed.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Twitter, Linkedin, Link as LinkIcon } from "lucide-react";
import type { Event } from "@/lib/types";
import type { DemoRequestView, PhotoView } from "@/lib/data";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { KaribuDemoRequestForm } from "@/components/karibu/KaribuDemoRequestForm";
import { eventCover } from "@/components/karibu/photos";
import { EventCoverPlaceholder } from "@/components/karibu/EventCoverPlaceholder";
import { Reveal } from "@/components/karibu/motion/Reveal";
import {
  BADGE_CLAY,
  BADGE_SAND,
  BTN_PRIMARY,
  EventCard,
  H1,
  LEAD,
  SUBHEAD,
  TYPE_LABEL,
  WRAP,
  formatDate as fmt,
  parseEventDate as parseDate,
} from "@/components/karibu/kit";
import { isEventPast } from "@/lib/event-dates";
import { EventQaBlock } from "@/components/karibu/conversations/EventQaBlock";
import { KaribuWinnersSection } from "@/components/karibu/KaribuWinnersSection";
import { KaribuProjectsSection } from "@/components/karibu/KaribuProjectsSection";
import { EventBodyTabs } from "@/components/karibu/EventBodyTabs";
import type { EventResults } from "@/lib/impact-lab/event-results";
import type { EventProject } from "@/lib/impact-lab/event-projects";
import type { OpenQuestionSessionView } from "@/lib/conversations/queries";

interface AgendaEntry {
  date: string;
  title: string;
  hash: string;
}

interface KaribuEventDetailProps {
  event: Event;
  descriptionParagraphs: string[];
  agendaEntries?: AgendaEntry[];
  approvedDemos: DemoRequestView[];
  relatedEvents: Event[];
  photos: PhotoView[];
  twitterShareUrl: string;
  linkedInShareUrl: string;
  /** Null when the event has no open EventQuestionSession — the whole Q&A section is skipped. */
  openQuestionSession: OpenQuestionSessionView | null;
  /**
   * The Impact Lab cohort whose judge panel belongs on this page, or null when
   * this event is not a hackathon or is not linked to a cohort. The section
   * fetches its own data (see KaribuJudgesSection) and renders nothing until
   * a panel is published, so a non-null cohort with no judges is not an error.
   */
  judgesCohort: string | null;
  /** `/impact-lab/[cohort]` when this event's cohort has published a public recap, else null. */
  recapHref: string | null;
  /** The published winners for this event's cohort; null until results are published. */
  results: EventResults | null;
  /** Every submitted project for this event's cohort, from the published record; null until published. */
  projects: EventProject[] | null;
}

export function KaribuEventDetail({
  event,
  descriptionParagraphs,
  agendaEntries,
  approvedDemos,
  relatedEvents,
  photos,
  twitterShareUrl,
  linkedInShareUrl,
  openQuestionSession,
  judgesCohort,
  recapHref,
  results,
  projects,
}: KaribuEventDetailProps) {
  const { whatsapp } = useSocialLinks();
  const dt = parseDate(event.date);
  const registerUrl = event.registrationUrl || event.lumaUrl;
  const soldOut = event.status === "sold-out";
  // Status alone is not enough — it is set by hand in admin. See lib/event-dates.
  const isPast = event.status === "completed" || isEventPast(event.date);
  const cover = eventCover(event.posterUrl);

  // The About tab: everything in the body except the winners and judges
  // sections, which get their own tabs below.
  const aboutPanel = (
    <>
      {/* About */}
      <h2 className={`mb-3 ${SUBHEAD}`}>
        About this {TYPE_LABEL[event.type].toLowerCase()}
      </h2>
      <div className="mb-7 space-y-4">
        {descriptionParagraphs.map((p, i) => (
          <p key={i} className="font-inter text-[15.5px] leading-[1.65] text-ink-soft">
            {p}
          </p>
        ))}
      </div>

      {/* Schedule */}
      {agendaEntries && agendaEntries.length > 0 && (
        <>
          <h2 className={`mb-3 ${SUBHEAD}`}>
            The day, roughly
          </h2>
          <div className="mb-7 flex flex-col gap-2.5">
            {agendaEntries.map((a) => (
              <div key={a.hash} className="flex gap-3 font-inter text-[15px] text-ink-soft">
                {a.date && <span className="font-bold text-clay">{a.date}</span>}
                <span>{a.title}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Highlights / who it's for */}
      {event.highlights && event.highlights.length > 0 ? (
        <>
          <h2 className={`mb-3 ${SUBHEAD}`}>Highlights</h2>
          <ul className="mb-7 space-y-2">
            {event.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5 font-inter text-[15.5px] leading-[1.6] text-ink-soft">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-clay" />
                {h}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className={`mb-3 ${SUBHEAD}`}>Who it&apos;s for</h2>
          <p className="mb-7 font-inter text-[15.5px] leading-[1.65] text-ink-soft">
            Anyone curious — students, founders, and developers. If you can
            open a laptop, you can take part. Bring a charger.
          </p>
        </>
      )}

      {/* Photos */}
      {photos.length > 0 && <PhotoStrip photos={photos} />}

      {/* Scheduled demos */}
      {approvedDemos.length > 0 && (
        <div className="mt-9">
          <h2 className={`mb-4 ${SUBHEAD}`}>Scheduled demos</h2>
          <div className="space-y-3">
            {approvedDemos.map((demo) => (
              <div key={demo.id} className="rounded-2xl border border-sand bg-paper-card p-5">
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-newsreader text-[19px] text-ink">{demo.projectTitle}</span>
                  <span className="font-inter text-[12.5px] text-ink-muted">
                    {demo.estimatedTime} min
                  </span>
                </div>
                <p className="mb-2 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                  {demo.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 font-inter text-[13px] text-ink-muted">
                  <span>by {demo.name}</span>
                  {demo.demoUrl && (
                    <a
                      href={demo.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-clay hover:underline"
                    >
                      Live demo →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo request form: upcoming meetups and workshops only. A hackathon's
          demos come from its heats and the logged-in dashboard submission,
          and Conversations events have their own participation forms. */}
      {!isPast && event.type !== "hackathon" && event.type !== "conversations" && (
        <div className="mt-9">
          <h2 className={`mb-2 ${SUBHEAD}`}>
            Request a demo slot
          </h2>
          <p className="mb-5 font-inter text-[15px] leading-[1.6] text-ink-soft">
            Have something to show? Request a slot to demo your project to the
            room.
          </p>
          <KaribuDemoRequestForm eventSlug={event.slug} />
        </div>
      )}

      {/* The public recap — once results are published */}
      {recapHref && (
        <div className="mt-9">
          <Link
            href={recapHref}
            className={BTN_PRIMARY}
          >
            See the results →
          </Link>
        </div>
      )}

      {/* Q&A — only when this event has an open EventQuestionSession */}
      {openQuestionSession && (
        <EventQaBlock eventSlug={event.slug} session={openQuestionSession} />
      )}

      {/* Share */}
      <div className="mt-9 flex items-center gap-3 border-t border-sand pt-6">
        <span className="font-inter text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Share
        </span>
        <ShareLink href={twitterShareUrl} label="Share on X">
          <Twitter className="h-4 w-4" />
        </ShareLink>
        <ShareLink href={linkedInShareUrl} label="Share on LinkedIn">
          <Linkedin className="h-4 w-4" />
        </ShareLink>
        <ShareLink href={`/events/${event.slug}`} label="Event link" internal>
          <LinkIcon className="h-4 w-4" />
        </ShareLink>
      </div>
    </>
  );

  // The winners, straight under the description once published.
  const winnersPanel = results ? (
    <div className="mb-9">
      <KaribuWinnersSection results={results} />
    </div>
  ) : undefined;

  // Every submitted project, its own tab once published.
  const projectsPanel = projects && projects.length > 0 ? (
    <div className="mb-9">
      <KaribuProjectsSection projects={projects} />
    </div>
  ) : undefined;

  return (
    <>
      {/* Back link */}
      <div className={`${WRAP} pt-6`}>
        <Link href="/events" className="font-inter text-sm font-medium text-ink-muted hover:text-ink">
          ← All events
        </Link>
      </div>

      {/* Event: header + body share one grid so the main column flows
          continuously past the poster instead of stopping at its row
          height. The rail (poster + details card) spans both grid rows so
          it doesn't force the header row tall — see the comment above the
          rail below. */}
      <section
        // Rows are `auto 1fr` on purpose: the rail spans both rows, and a grid
        // shares a spanning item's height across auto rows, which pushed the
        // body down whenever the rail was taller than header plus body (a short
        // tab, say). With row two flexible, the slack lands there instead.
        className={`${WRAP} grid grid-cols-1 items-start gap-10 pb-12 pt-5 lg:grid-cols-[1fr_400px] lg:grid-rows-[auto_1fr]`}
        aria-label="Event"
      >
        {/* Header text — badges, title, lead description */}
        <Reveal className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className={BADGE_CLAY}>{event.city}</span>
            <span className={BADGE_SAND}>{TYPE_LABEL[event.type]}</span>
            {event.audiences?.includes("all-levels") && <span className={BADGE_SAND}>All levels</span>}
          </div>
          <h1 className={`mb-4 ${H1}`}>
            {event.title}
          </h1>
          <p className={LEAD}>
            {event.description}
          </p>
        </Reveal>

        {/*
          The poster used to be a full-width band under the title, at a
          fixed pixel height on a fluid-width box — so its ratio drifted
          1.43 -> 2.02 -> 3.24 across breakpoints and a 1100x1100 poster
          landed in a 1098x338 slot with 69% of it cut away. Organisers
          author these posters square, so the frame is square now and the
          whole poster is visible.

          It lives in a rail rather than full-bleed because a 1:1 poster
          at the 1100px content width would be a 1100px wall of image
          before you reach the date. The rail spans both grid rows (title
          row + body row) instead of sitting only in the header row, so its
          height never forces the header row tall and the body's About
          section can start right under the title/description. The details
          card sits directly under the poster in the same rail column, so
          poster and Register button still read as one continuous column —
          what you look at and what you act on. Source order gives
          text-then-poster-then-card-then-body when it collapses.
        */}
        <Reveal className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="w-full max-w-[420px] lg:max-w-none">
            <div className="frame-base frame-plate rounded-2xl border border-sand-2">
              {cover ? (
                <Image
                  src={cover}
                  alt={event.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 400px, (min-width: 480px) 420px, 100vw"
                  className="object-contain"
                />
              ) : (
                <EventCoverPlaceholder event={event} size="lg" />
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-sand bg-paper-card p-6">
            <div className="mb-5 flex flex-col gap-4">
              <SidebarRow label="When">
                {dt ? fmt(dt, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : event.date}
                {event.time && (
                  <>
                    <br />
                    {event.time}
                  </>
                )}
              </SidebarRow>
              <SidebarRow label="Where">
                {event.venue}
                <br />
                {event.city}
              </SidebarRow>
              {event.capacity && (
                <SidebarRow label="Seats">{event.capacity} total</SidebarRow>
              )}
              <SidebarRow label="Cost">Free</SidebarRow>
            </div>

            {isPast ? (
              <div className="rounded-full bg-paper-alt px-5 py-3 text-center font-inter text-sm font-semibold text-ink-muted">
                This event has ended
              </div>
            ) : soldOut ? (
              whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2.5 block rounded-full bg-panel-dark px-5 py-3.5 text-center font-inter text-[15px] font-semibold text-on-panel-dark transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
                >
                  Sold out — get notified
                </a>
              )
            ) : (
              registerUrl && (
                <a
                  href={registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mb-2.5 w-full ${BTN_PRIMARY}`}
                >
                  Register — free
                </a>
              )
            )}
            {!isPast && whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full border border-sand-2 px-5 py-3 text-center font-inter text-sm font-semibold text-ink transition-colors hover:border-ink"
              >
                Ask a question
              </a>
            )}
          </div>
        </Reveal>

        {/* Body: About onward, continuing straight below the header text.
            Once winners, projects and judges are published this column runs
            long, so it splits into tabs (About / Winners / Projects / Judges)
            — see EventBodyTabs. The judges tab appears only once its panel
            has loaded with someone in it; an ordinary event with none of
            these gets no tab bar. */}
        <Reveal className="min-w-0 lg:col-start-1 lg:row-start-2">
          <EventBodyTabs
            about={aboutPanel}
            winners={winnersPanel}
            projects={projectsPanel}
            judgesCohort={judgesCohort}
          />
        </Reveal>
      </section>

      {/* More events */}
      {relatedEvents.length > 0 && (
        <section className={`${WRAP} pb-14`} aria-label="More events">
          <Reveal>
            <div className="mb-4 border-t border-sand pt-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              More events
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedEvents.map((ev) => (
                <EventCard key={ev.slug} event={ev} variant="tile" />
              ))}
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}

/* ─────────────────────────── Photo strip ─────────────────────────── */

function PhotoStrip({ photos }: { photos: PhotoView[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const preview = photos.slice(0, 9);
  const hasMore = photos.length > preview.length;

  return (
    <div className="mt-9">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className={SUBHEAD}>
          Photos from this event
        </h2>
      </div>
      <ul className="grid grid-cols-3 gap-2 md:gap-3" role="list">
        {preview.map((photo, i) => {
          const lastWithMore = hasMore && i === preview.length - 1;
          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                aria-label={photo.caption ?? `Open photo ${i + 1}`}
                className="group relative block w-full overflow-hidden rounded-xl border border-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <Image
                    src={photo.thumbnailUrl ?? photo.url}
                    alt={photo.alt ?? photo.caption ?? "Meetup photo"}
                    fill
                    sizes="(max-width: 640px) 33vw, 200px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  {lastWithMore && (
                    <div className="absolute inset-0 flex items-center justify-center bg-scrim/60 font-inter text-[15px] font-semibold text-scrim-text backdrop-blur-sm">
                      +{photos.length - preview.length} more
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <PhotoLightbox
        photos={photos}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}

/* ─────────────────────────── bits ─────────────────────────── */

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 font-inter text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </div>
      <div className="font-inter text-[15px] text-ink">{children}</div>
    </div>
  );
}

function ShareLink({
  href,
  label,
  children,
  internal,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  internal?: boolean;
}) {
  const cls =
    "flex h-11 w-11 items-center justify-center rounded-full border border-sand-2 text-ink-soft transition-colors hover:border-ink hover:text-ink";
  if (internal) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>
      {children}
    </a>
  );
}
