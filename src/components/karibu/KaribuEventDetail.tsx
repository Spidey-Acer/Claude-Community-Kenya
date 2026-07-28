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
import { SOCIAL_LINKS } from "@/lib/constants";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { KaribuDemoRequestForm } from "@/components/karibu/KaribuDemoRequestForm";
import { eventCover } from "@/components/karibu/photos";
import { EventCoverPlaceholder } from "@/components/karibu/EventCoverPlaceholder";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

const TYPE_LABEL: Record<Event["type"], string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  "career-talk": "Career talk",
  hackathon: "Hackathon",
};

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
}

function parseDate(d: string): Date | null {
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
const fmt = (dt: Date, opts: Intl.DateTimeFormatOptions) => dt.toLocaleString("en-US", opts);

export function KaribuEventDetail({
  event,
  descriptionParagraphs,
  agendaEntries,
  approvedDemos,
  relatedEvents,
  photos,
  twitterShareUrl,
  linkedInShareUrl,
}: KaribuEventDetailProps) {
  const dt = parseDate(event.date);
  const registerUrl = event.registrationUrl || event.lumaUrl;
  const soldOut = event.status === "sold-out";
  const isPast = event.status === "completed";
  const cover = eventCover(event.posterUrl);

  return (
    <>
      {/* Back link */}
      <div className={`${WRAP} pt-6`}>
        <Link href="/events" className="font-inter text-sm font-medium text-ink-muted hover:text-ink">
          ← All events
        </Link>
      </div>

      {/* Header */}
      <section className={`${WRAP} pb-8 pt-5`} aria-label="Event header">
        <Reveal>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="clay">{event.city}</Badge>
            <Badge tone="sand">{TYPE_LABEL[event.type]}</Badge>
            {event.audiences?.includes("all-levels") && <Badge tone="sand">All levels</Badge>}
          </div>
          <h1 className="mb-4 max-w-[760px] font-newsreader text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
            {event.title}
          </h1>
          <p className="mb-6 max-w-[640px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            {event.description}
          </p>
          <div className="relative h-[240px] overflow-hidden rounded-[14px] border border-sand-2 sm:h-[340px]">
            {cover ? (
              <Image
                src={cover}
                alt={event.title}
                fill
                priority
                sizes="(max-width: 1180px) 100vw, 1100px"
                className="object-cover"
              />
            ) : (
              <EventCoverPlaceholder />
            )}
          </div>
        </Reveal>
      </section>

      {/* Body: main + sidebar */}
      <section
        className={`${WRAP} grid grid-cols-1 items-start gap-10 pb-12 lg:grid-cols-[1fr_340px]`}
        aria-label="Event details"
      >
        <Reveal className="min-w-0">
          {/* About */}
          <h2 className="mb-3 font-newsreader text-[24px] font-medium text-ink">
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
              <h2 className="mb-3 font-newsreader text-[24px] font-medium text-ink">
                The day, roughly
              </h2>
              <div className="mb-7 flex flex-col gap-2.5">
                {agendaEntries.map((a) => (
                  <div key={a.hash} className="flex gap-3 font-inter text-[15px] text-[#4A4238]">
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
              <h2 className="mb-3 font-newsreader text-[24px] font-medium text-ink">Highlights</h2>
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
              <h2 className="mb-3 font-newsreader text-[24px] font-medium text-ink">Who it&apos;s for</h2>
              <p className="mb-7 font-inter text-[15.5px] leading-[1.65] text-ink-soft">
                Anyone curious — students, founders, and developers. If you can
                open a laptop, you can take part. Bring a charger.
              </p>
            </>
          )}

          {/* Photos */}
          {photos.length > 0 && <PhotoStrip photos={photos} eventSlug={event.slug} />}

          {/* Scheduled demos */}
          {approvedDemos.length > 0 && (
            <div className="mt-9">
              <h2 className="mb-4 font-newsreader text-[24px] font-medium text-ink">Scheduled demos</h2>
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

          {/* Demo request form — upcoming events only */}
          {!isPast && (
            <div className="mt-9">
              <h2 className="mb-2 font-newsreader text-[24px] font-medium text-ink">
                Request a demo slot
              </h2>
              <p className="mb-5 font-inter text-[15px] leading-[1.6] text-ink-soft">
                Have something to show? Request a slot to demo your project to the
                room.
              </p>
              <KaribuDemoRequestForm eventSlug={event.slug} />
            </div>
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
        </Reveal>

        {/* Sidebar */}
        <Reveal className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
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
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2.5 block rounded-full bg-ink px-5 py-3.5 text-center font-inter text-[15px] font-semibold text-paper transition-colors hover:bg-black"
              >
                Sold out — get notified
              </a>
            ) : (
              registerUrl && (
                <a
                  href={registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2.5 block rounded-full bg-clay px-5 py-3.5 text-center font-inter text-[15px] font-semibold text-paper-card transition-colors hover:bg-clay-dark"
                >
                  Register — free
                </a>
              )
            )}
            {!isPast && (
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full border border-sand-2 px-5 py-3 text-center font-inter text-sm font-semibold text-ink transition-colors hover:border-ink"
              >
                Ask a question
              </a>
            )}
          </div>
        </Reveal>
      </section>

      {/* More events */}
      {relatedEvents.length > 0 && (
        <section className={`${WRAP} pb-14`} aria-label="More events">
          <Reveal>
            <div className="mb-4 border-t border-sand pt-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              More events
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedEvents.map((ev) => {
                const edt = parseDate(ev.date);
                return (
                  <Link
                    key={ev.slug}
                    href={`/events/${ev.slug}`}
                    className="flex items-center gap-[18px] rounded-xl border border-sand bg-paper-card p-[18px] transition-colors hover:border-clay"
                  >
                    <div className="border-r border-sand pr-4 text-center">
                      <div className="font-inter text-[11px] font-semibold uppercase text-clay">
                        {edt ? fmt(edt, { month: "short" }) : ""}
                      </div>
                      <div className="font-newsreader text-[30px] leading-none text-ink">
                        {edt ? fmt(edt, { day: "2-digit" }) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="font-inter text-xs text-ink-muted">
                        {ev.city} · {TYPE_LABEL[ev.type]}
                      </div>
                      <div className="font-newsreader text-[19px] text-ink">{ev.title}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}

/* ─────────────────────────── Photo strip ─────────────────────────── */

function PhotoStrip({ photos, eventSlug }: { photos: PhotoView[]; eventSlug: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const preview = photos.slice(0, 9);
  const hasMore = photos.length > preview.length;

  return (
    <div className="mt-9">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-newsreader text-[24px] font-medium text-ink">
          Photos from this event
        </h2>
        <Link
          href={`/gallery?event=${encodeURIComponent(eventSlug)}`}
          className="shrink-0 font-inter text-[13px] font-semibold text-clay hover:underline"
        >
          See all →
        </Link>
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

function Badge({ children, tone }: { children: React.ReactNode; tone: "clay" | "sand" }) {
  const cls = tone === "clay" ? "bg-[#F3E3D9] text-clay" : "bg-paper-alt text-ink-muted";
  return (
    <span className={`rounded-full px-2.5 py-1 font-inter text-[11.5px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

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
