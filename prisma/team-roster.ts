/**
 * team-roster — the canonical CCK team list.
 *
 * Shared by `prisma/seed.ts` (full seed) and `scripts/karibu/sync-team.ts`
 * (team-only sync, safe to run against production). One list, two consumers,
 * so the two can never drift.
 *
 * Titles confirmed by Peter on 2026-09-19: Billy is a Claude Community
 * Ambassador (EMEA cohort, Cassie's roundup of 10 Sep 2026); Sam is a
 * volunteer. Taglines and the ventures named in bios are lifted from each
 * person's own public LinkedIn headline, on Peter's instruction, so nothing
 * here is invented. Event roles come from EVENTS.md.
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
    role: "Volunteer",
    tagline: "It offends me that most businesses in Africa are held together by WhatsApp threads and Excel prayers. I'm changing that.",
    location: "Nairobi, Kenya",
    bio: "Volunteer at Claude Community Kenya. Co-hosted Claude for Everyone, and ran hosting, check-in and the live build demo at Impact Lab: AI Mashinani.",
    linkedIn: "https://www.linkedin.com/in/samuelkyalo",
    avatar: "/images/team/sam-kyalo.jpg",
    order: 1,
    featured: false,
  },
  {
    slug: "billy-mwangi",
    name: "Billy Mwangi",
    role: "Claude Community Ambassador",
    tagline: "Founder, Hekima Labs · Co-founder, Fluent.ke · Full-stack engineer",
    location: "Nairobi, Kenya",
    bio: "Claude Community Ambassador for Nairobi, in the EMEA cohort, from September 2026. Full-stack engineer, founder of Hekima Labs and co-founder of Fluent.ke. Co-hosted Claude for Everyone, and ran the beneficiary wall, clock and capture at Impact Lab: AI Mashinani.",
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
