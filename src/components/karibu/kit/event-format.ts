/**
 * Event labels and date helpers shared by the kit's EventCard and the Events
 * door. One copy, instead of one per file as before.
 */

import type { Event } from "@/lib/types";

export const TYPE_LABEL: Record<Event["type"], string> = {
  meetup: "Meetup",
  workshop: "Workshop",
  "career-talk": "Career talk",
  hackathon: "Hackathon",
  conversations: "Conversations",
};

export const TYPE_PLURAL: Record<Event["type"], string> = {
  meetup: "Meetups",
  workshop: "Workshops",
  "career-talk": "Career talks",
  hackathon: "Hackathons",
  conversations: "Conversations",
};

/** Parses a `YYYY-MM-DD` event date; null when it is not a real date. */
export function parseEventDate(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `toLocaleString` with the en-US locale used across the site. */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString("en-US", options);
}
