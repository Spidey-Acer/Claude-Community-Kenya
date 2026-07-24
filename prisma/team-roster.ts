/**
 * team-roster — the canonical CCK team list.
 *
 * Shared by `prisma/seed.ts` (full seed) and `scripts/karibu/sync-team.ts`
 * (team-only sync, safe to run against production). One list, two consumers,
 * so the two can never drift.
 *
 * Co-organiser bios are deliberately one neutral line each: these are real
 * people, and anything beyond "helps run CCK" would be invention. Peter
 * confirmed the roster and titles on 2026-07-20; co-organisers fill in their
 * own bio, tagline and links from /admin/team.
 *
 * Their other venture (Fluent) is a separate business and is intentionally not
 * referenced here — this page describes the community, not the company.
 */

export const TEAM_ROSTER = [
  {
    slug: "peter-kibet",
    name: "Peter Kibet",
    role: "Founder & Lead Organizer",
    tagline: "Founder, Spidey Labs",
    location: "Nairobi, Kenya",
    bio: "Founder and lead organizer of Claude Community Kenya. Organized Kenya's first Claude Code meetup and is passionate about bringing AI-powered development tools to every Kenyan developer.",
    longBio:
      "Peter (Spidey) founded Claude Community Kenya in 2026 to give Kenyan developers a real seat at the AI table. He organised the country's first Claude Code meetup, runs Spidey Labs (the studio behind MkulimaOS), and ships production software with Claude every day. He cares about practical AI — workflows that ship, not slides that don't.",
    twitter: "https://twitter.com/spideyinc",
    github: "https://github.com/Spidey-Acer",
    linkedIn: "https://linkedin.com/in/peter-kibet",
    website: "https://www.peterkibet.co.ke",
    avatar: "/images/peter-professional.webp",
    order: 0,
    featured: true,
  },
  {
    slug: "sam-kyalo",
    name: "Sam Kyalo",
    role: "Co-organizer",
    bio: "Co-organizer at Claude Community Kenya.",
    linkedIn: "https://www.linkedin.com/in/samuelkyalo",
    avatar: "/images/team/sam-kyalo.jpg",
    order: 1,
    featured: false,
  },
  {
    slug: "billy-mwangi",
    name: "Billy Mwangi",
    role: "Co-organizer",
    bio: "Co-organizer at Claude Community Kenya.",
    linkedIn: "https://www.linkedin.com/in/billy-mwangi-5b6b5926a",
    avatar: "/images/team/billy-mwangi.jpg",
    order: 2,
    featured: false,
  },
  {
    // Photo added; Peter is filling in the remaining details (tagline, links)
    // from the admin panel.
    slug: "edwin-lungatso",
    name: "Edwin Lungatso",
    role: "Co-organizer",
    bio: "Co-organizer at Claude Community Kenya.",
    avatar: "/images/team/edwin-lungatso.jpg",
    order: 3,
    featured: false,
  },
] as const
