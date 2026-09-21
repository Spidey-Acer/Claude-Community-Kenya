/**
 * band-copy: the one sentence the clay band above the nav carries.
 *
 * Pure: no Prisma, no React, no clock of its own (`now` is an argument so
 * the 14-day window is testable). The root layout gathers the live data and
 * calls `buildBandCopy`; `Marquee` only renders what comes back.
 *
 * Three states, in priority order:
 *   1. An event finished within the last 14 days: "<N> teams shipped" with a
 *      link to its results, or "<Event> is done" when no team count exists.
 *   2. An upcoming event: "Next: <Event>, <Weekday D Month>. Save your seat".
 *   3. Nothing live: the community line with the active cities, no link.
 *
 * Never attendance numbers. Sentence case. No em dashes. The trailing arrow
 * is a real "→" and belongs to the link text only, as a link affordance.
 */

import type { Event } from "@/lib/types";

/** What the band renders. `href` and `linkText` travel together. */
export interface BandCopy {
  /** The sentence up to (not including) the link. */
  text: string;
  href?: string;
  /** Link text, arrow included. */
  linkText?: string;
}

/** Live data the root layout hands in. Every field may be missing. */
export interface BandCopyInput {
  /** The most recently finished event, however long ago. */
  latestPastEvent: Pick<Event, "slug" | "title" | "date"> | null;
  /**
   * Teams that submitted a project at `latestPastEvent`, from the Impact Lab
   * final run. Null when the event has no cohort, no published results, or
   * zero submissions.
   */
  teamsSubmitted: number | null;
  nextEvent: Pick<Event, "slug" | "title" | "date"> | null;
  /** SiteSettings.citiesActive, already parsed. */
  citiesActive: string[];
  /** Injected for the tests; defaults to the real clock. */
  now?: Date;
}

/** How long a finished event stays the band's story. */
export const RECENT_EVENT_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_CITIES = ["Nairobi", "Mombasa", "Kisumu"];

const SMALL_NUMBERS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/**
 * Spells out 0 to 20 ("nineteen"); anything larger stays a numeral ("21").
 * Editorial house style: small numbers read as words in running prose.
 */
export function spellNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n);
  return n <= 20 ? SMALL_NUMBERS[n] : String(n);
}

/** "nineteen" at the start of a sentence becomes "Nineteen". */
function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * "YYYY-MM-DD" (the shape `mapPrismaEvent` hands out) as UTC midnight, so a
 * date-only string and the Prisma Date it came from agree. Null when the
 * string does not parse.
 */
function parseEventDay(date: string): Date | null {
  const day = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(day.getTime()) ? null : day;
}

/** "Saturday 4 October" for the "Next:" sentence. Falls back to the raw date. */
export function weekdayDayMonth(date: string): string {
  const day = parseEventDay(date);
  if (!day) return date;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(day);
}

/**
 * True when the event's day is within the last `RECENT_EVENT_WINDOW_DAYS`,
 * counted in whole days from the event's midnight so the window closes at a
 * day boundary rather than at some hour of the fifteenth day.
 */
export function isWithinRecentWindow(date: string, now: Date): boolean {
  const day = parseEventDay(date);
  if (!day) return false;
  const ageDays = Math.floor((now.getTime() - day.getTime()) / DAY_MS);
  return ageDays >= 0 && ageDays <= RECENT_EVENT_WINDOW_DAYS;
}

/** Build Day editions get their own wording; every other event is generic. */
export function isBuildDay(event: Pick<Event, "slug" | "title">): boolean {
  return event.slug.includes("build-day") || /build day/i.test(event.title);
}

function recentEventCopy(
  event: Pick<Event, "slug" | "title">,
  teamsSubmitted: number | null,
): BandCopy {
  const href = `/events/${event.slug}`;
  if (teamsSubmitted === null || teamsSubmitted <= 0) {
    return { text: `${event.title} is done. `, href, linkText: "See what was built →" };
  }
  const count = capitalise(spellNumber(teamsSubmitted));
  if (isBuildDay(event)) {
    return {
      text: `${count} teams shipped overnight on Fable 5.1 at ${event.title}. `,
      href,
      linkText: "See the winners →",
    };
  }
  return {
    text: `${event.title}: ${count} teams shipped. `,
    href,
    linkText: "See the results →",
  };
}

/** Every DB event has a slug, so the link is always its own page, never Luma. */
function nextEventCopy(event: Pick<Event, "slug" | "title" | "date">): BandCopy {
  return {
    text: `Next: ${event.title}, ${weekdayDayMonth(event.date)}. `,
    href: `/events/${event.slug}`,
    linkText: "Save your seat →",
  };
}

function communityCopy(citiesActive: string[]): BandCopy {
  const cities = citiesActive.length > 0 ? citiesActive : DEFAULT_CITIES;
  return { text: `Kenya's independent Claude builder community. ${cities.join(", ")}.` };
}

/** The band's sentence for the live data, by the priority in the file header. */
export function buildBandCopy(input: BandCopyInput): BandCopy {
  const now = input.now ?? new Date();
  const { latestPastEvent, nextEvent } = input;

  if (latestPastEvent && isWithinRecentWindow(latestPastEvent.date, now)) {
    return recentEventCopy(latestPastEvent, input.teamsSubmitted);
  }
  if (nextEvent) return nextEventCopy(nextEvent);
  return communityCopy(input.citiesActive);
}
