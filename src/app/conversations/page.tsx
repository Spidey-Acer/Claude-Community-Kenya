import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { getConversationsEvents } from "@/lib/conversations/queries";
import { SITE_CONFIG } from "@/lib/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Conversations | Claude Community Kenya",
  description:
    "Claude Conversations — Kenyans decide, together, what Claude Community Kenya builds next. Contribute a problem statement or see what the room picked.",
  alternates: { canonical: `${SITE_CONFIG.url}/conversations` },
  openGraph: {
    title: "Claude Conversations | Claude Community Kenya",
    description:
      "Kenyans decide, together, what Claude Community Kenya builds next.",
    url: `${SITE_CONFIG.url}/conversations`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

function parseDate(d: string): Date | null {
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
const fmt = (dt: Date, opts: Intl.DateTimeFormatOptions) => dt.toLocaleString("en-US", opts);

export default async function ConversationsIndexPage() {
  const events = await getConversationsEvents().catch(() => []);

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Conversations" }]} />

      <section className={`${WRAP} pb-6 pt-16`} aria-label="Conversations header">
        <Reveal>
          <div className="mb-4 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay">
            Claude Conversations
          </div>
          <h1 className="mb-[18px] font-newsreader text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
            What Kenya decides, together.
          </h1>
          <p className="mb-4 max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Every Claude Conversations event picks a real problem for the
            community to build next. In the room or not, anyone in Kenya can
            contribute &mdash; the room votes, but the whole country reads what
            it decided.
          </p>
        </Reveal>
      </section>

      {events.length === 0 ? (
        <section className={`${WRAP} py-16`}>
          <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
            <p className="font-newsreader text-[24px] text-ink">
              No Conversations events yet &mdash; check back soon.
            </p>
          </div>
        </section>
      ) : (
        <section className={`${WRAP} pb-16 pt-2`} aria-label="Conversations events">
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
            {events.length === 1 && (
              <p className="mt-6 font-inter text-[13.5px] text-ink-muted">
                Just the one so far &mdash; more Conversations events land here
                as they&apos;re scheduled.
              </p>
            )}
          </Reveal>
        </section>
      )}
    </>
  );
}

function EventCard({
  event,
}: {
  event: Awaited<ReturnType<typeof getConversationsEvents>>[number];
}) {
  const dt = parseDate(event.date);
  const dateLine = dt
    ? fmt(dt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : event.date;

  const status = event.result
    ? { label: `Decided — ${event.result.winner.title}`, tone: "clay" as const }
    : event.isLiveToday
      ? { label: "Live today", tone: "clay" as const }
      : { label: "Upcoming", tone: "sand" as const };

  return (
    <Link
      href={`/conversations/${event.slug}`}
      className="flex flex-col rounded-2xl border border-sand bg-paper-card p-6 transition-colors hover:border-clay"
    >
      <span
        className={`mb-3 self-start rounded-full px-2.5 py-1 font-inter text-[11.5px] font-semibold ${
          status.tone === "clay" ? "bg-clay/10 text-clay" : "bg-paper-alt text-ink-muted"
        }`}
      >
        {status.label}
      </span>
      <div className="mb-1.5 font-inter text-[13px] text-ink-muted">
        {dateLine} · {event.venue}, {event.city}
      </div>
      <h2 className="font-newsreader text-[22px] leading-[1.15] text-ink">{event.title}</h2>
    </Link>
  );
}
