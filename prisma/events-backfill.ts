/**
 * events-backfill — completed CCK events the live site is missing.
 *
 * The production DB stops at the 4 Apr record; these three events ran and are
 * documented in the Anthropic reimbursement invoices (CLAUDE-NBO-002/003/004)
 * and the CCK HQ events dossier (`C:\Projects\Claude-Community-Kenya\EVENTS.md`,
 * assembled 2026-07-21), but were never added to the website.
 *
 * Only events with a paper trail and Completed status are here. Deliberately
 * excluded, pending Peter's confirmation:
 *   - 4 Apr "Claude Code Hackathon" — DB says UPCOMING/venue-TBA, no completion
 *     record, a funding-constraint note in the logs. Unconfirmed whether it ran.
 *   - 25-26 Jul "Impact Lab / AI Mashinani" — real and upcoming, but its Luma
 *     page is not yet published, so there is no registration link to show.
 *
 * Fields left null (time-of-day, exact attendee counts for the workshops) are
 * genuinely unrecorded in the sources — not fabricated. Update from /admin/events
 * once the real figures are known.
 *
 * Consumed by scripts/karibu/sync-events.ts (dry-run by default).
 */

import { EventType, EventStatus } from "../src/generated/prisma/client"

export const EVENTS_BACKFILL = [
  {
    slug: "claude-for-everyone-workshop-apr",
    title: "Claude for Everyone — Non-Developer Workshop",
    date: new Date("2026-04-28T00:00:00+03:00"),
    time: "Afternoon (3 hours) EAT",
    venue: "Blockchain Centre",
    city: "Nairobi",
    type: EventType.WORKSHOP,
    status: EventStatus.COMPLETED,
    host: "Sam Kyalo & Billy Mwangi",
    description:
      "A hands-on session for non-developers — professionals grouped by field, each building a real Claude automation for a task from their own week.",
    fullDescription:
      "A three-hour workshop co-hosted by Sam Kyalo and Billy Mwangi, built for people who don't write code. Attendees sat at profession-grouped tables and each group built a working Claude automation against a real task from their own working week — turning \"AI is interesting\" into \"AI did my Tuesday.\"",
    highlights: [
      "Built for non-developers",
      "Profession-grouped, hands-on format",
      "Every group shipped a real Claude automation",
    ],
    featured: false,
  },
  {
    slug: "claude-code-workshop-developers",
    title: "Claude Code Workshop for Developers",
    date: new Date("2026-04-29T00:00:00+03:00"),
    time: "Afternoon EAT",
    venue: "Blockchain Centre",
    city: "Nairobi",
    type: EventType.WORKSHOP,
    status: EventStatus.COMPLETED,
    host: "Sam Kyalo & Billy Mwangi",
    description:
      "A hands-on developer workshop covering repo-level workflows, hooks, custom skills, and agent dispatch patterns.",
    fullDescription:
      "The developer counterpart to the non-dev session, co-hosted by Sam Kyalo and Billy Mwangi. A hands-on deep dive into production Claude Code: repo-level workflows, hooks, custom skills, and multi-agent dispatch patterns — the same techniques the CCK team ships with daily.",
    highlights: [
      "Repo-level Claude Code workflows",
      "Hooks, custom skills, and agent dispatch",
      "Hands-on, developer-focused",
    ],
    featured: false,
  },
  {
    slug: "kisumu-claude-developers-hackathon",
    title: "Kisumu — Claude for Developers Mini-Hackathon",
    date: new Date("2026-05-23T00:00:00+03:00"),
    time: "Full day EAT",
    venue: "Zone01",
    city: "Kisumu",
    type: EventType.HACKATHON,
    status: EventStatus.COMPLETED,
    host: "Peter Kibet",
    partnerOrg: "Zone01 Kisumu",
    description:
      "The community's first out-of-town event — around 50 developers in Kisumu took an idea from validation to a deployed multi-agent app in a one-hour buildathon.",
    fullDescription:
      "Claude Community Kenya's first event beyond Nairobi. Roughly 50 developers gathered at Zone01 in Kisumu for a live ideation-to-production demo followed by a one-hour buildathon — in which the room built and deployed a multi-agent Startup Idea Validator together, end to end.",
    highlights: [
      "~50 developers attended",
      "First out-of-town CCK event",
      "The room built and deployed a multi-agent Startup Idea Validator",
    ],
    attendeeCount: 50,
    featured: false,
  },
] as const
