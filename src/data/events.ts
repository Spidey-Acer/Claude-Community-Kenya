export interface Event {
  slug: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  type: "meetup" | "workshop" | "career-talk" | "hackathon";
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
  photosUrl?: string;
}

export const events: Event[] = [
  {
    slug: "kenyas-first-claude-code-meetup",
    title: "Kenya's First Claude Code Meetup",
    date: "2026-01-24",
    time: "2:00 PM - 5:00 PM EAT",
    venue: "iHiT Events Space, Westlands",
    city: "Nairobi",
    type: "meetup",
    status: "completed",
    description:
      "The one that started it all. 30 developers in a room, one CLI, and a lot of curiosity.",
    fullDescription:
      "On January 24, 2026, history was made as Kenya hosted its very first Claude Code meetup. Over 30 developers from across Nairobi gathered at iHiT Events Space in Westlands for an afternoon of networking, interaction, and a live Claude Code demo.\n\nThe event was a community gathering where members talked, connected, and explored the possibilities of AI-assisted development. Peter Kibet showcased his Claude Code workflow using the Mulinga Farm Management System as a demonstration of what developers can build with these tools.\n\nThis meetup marked the birth of Claude Community Kenya and set the foundation for what would become East Africa's most vibrant AI developer community.",
    agenda: [
      "2:00 PM — Doors Open & Registration",
      "2:30 PM — Welcome & Community Introduction",
      "3:00 PM — Claude Code Workflow Demo",
      "3:45 PM — Open Discussion & Q&A",
      "4:15 PM — Lightning Talks & Open Floor",
      "4:45 PM — Networking",
      "5:00 PM — Close",
    ],
    lumaUrl: "https://luma.com/sbsa789m",
    host: "Peter Kibet",
    highlights: [
      "30+ developers attended",
      "First-ever Claude Code demo in East Africa",
      "Community connections and collaborations formed",
    ],
    attendeeCount: 30,
    photosUrl: "#",
  },
  {
    slug: "nairobi-meetup-2-deep-dive",
    title: "Nairobi Meetup #2 — Deep Dive",
    date: "2026-02-20",
    time: "2:00 PM - 5:00 PM EAT",
    venue: "TBA",
    city: "Nairobi",
    type: "meetup",
    status: "registration-open",
    description:
      "Our second Nairobi meetup! Deep dive into Claude Code workflows, multi-instance development, and community project updates.",
    fullDescription:
      "Join us for the second Claude Community Kenya meetup in Nairobi! This time we're going deeper into Claude Code with hands-on workshops covering multi-instance development, agentic patterns, and real-world project building.\n\nWhether you attended our first meetup or are joining for the first time, this event is designed for developers at all levels. Bring your laptop, your ideas, and your curiosity.",
    agenda: [
      "2:00 PM — Doors Open & Networking",
      "2:30 PM — Welcome & Community Updates",
      "3:00 PM — Workshop: Multi-Instance Claude Code Development",
      "4:00 PM — Community Project Showcases",
      "4:30 PM — Open Networking & Collaboration",
      "5:00 PM — Close",
    ],
    registrationUrl: "https://luma.com/sbsa789m",
    lumaUrl: "https://luma.com/sbsa789m",
    host: "Peter Kibet & Edwin Lungatso",
  },
  {
    slug: "mombasa-ai-career-talk",
    title: "Mombasa AI & Career Talk",
    date: "2026-02-28",
    time: "10:00 AM - 1:00 PM EAT",
    venue: "Assembly Hall, Institute of Computing and Informatics",
    city: "Mombasa",
    type: "career-talk",
    status: "registration-open",
    description:
      "Our first university event! A career talk at Technical University of Mombasa exploring AI opportunities, Claude Code, and how students can start building with AI today.",
    fullDescription:
      "Claude Community Kenya is heading to Mombasa for our very first university event! In partnership with the Technical University of Mombasa and Swahilipot Hub Foundation, we're bringing an inspiring career talk on AI and development opportunities.\n\nThis event is designed specifically for university students and early-career developers. We'll cover what AI means for the future of software development in Kenya, how to get started with Claude and Claude Code, and the career opportunities emerging in the AI space.\n\nDr. Fullgence Mwakondo will co-host alongside community leaders, ensuring the content is relevant and accessible to students at all levels.",
    agenda: [
      "10:00 AM — Registration & Welcome",
      "10:30 AM — Keynote: AI & The Future of Software Development in Kenya",
      "11:15 AM — Demo: Getting Started with Claude Code",
      "12:00 PM — Panel: Career Opportunities in AI",
      "12:30 PM — Q&A & Open Discussion",
      "1:00 PM — Close & Networking",
    ],
    registrationUrl: "https://luma.com/vsf5re14",
    lumaUrl: "https://luma.com/vsf5re14",
    host: "Dr. Fullgence Mwakondo & Joshua Wekesa",
    partnerOrg: "Technical University of Mombasa, Swahilipot Hub Foundation",
  },
];

export function getUpcomingEvents(): Event[] {
  return events.filter(
    (e) => e.status === "upcoming" || e.status === "registration-open"
  );
}

export function getPastEvents(): Event[] {
  return events.filter((e) => e.status === "completed");
}

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug);
}
