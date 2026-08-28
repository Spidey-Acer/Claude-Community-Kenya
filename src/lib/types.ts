/**
 * Domain types used across CCK pages and components.
 *
 * These mirror the shape of records the DB returns after mapping in lib/data.ts.
 * Component-facing types live here (decoupled from Prisma generated types) so
 * UI code never imports from `@/generated/prisma` and stays portable if the
 * persistence layer ever changes.
 */

export interface Event {
  id?: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  type: "meetup" | "workshop" | "career-talk" | "hackathon" | "conversations";
  status: "upcoming" | "registration-open" | "completed" | "sold-out";
  description: string;
  fullDescription?: string;
  agenda?: string[];
  registrationUrl?: string;
  lumaUrl?: string;
  host?: string;
  partnerOrg?: string;
  highlights?: string[];
  attendeeCount?: number;
  /** Manual seat cap. Pairs with attendeeCount to render "X / Y seats". */
  capacity?: number;
  posterUrl?: string;
  photosUrl?: string;
  recordingUrl?: string;
  slidesUrl?: string;
  prizes?: string[];
  rules?: string[];
  /** Audience tags used by the recommendation engine. */
  audiences?: string[];
  /** Intent tags used by the recommendation engine. */
  intents?: string[];
  featured?: boolean;
}
