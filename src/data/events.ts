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
  prizes?: string[];
  rules?: string[];
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
      "On January 24, 2026, history was made as Kenya hosted its very first Claude Code meetup. Over 30 developers from across Nairobi gathered at iHiT Events Space in Westlands for an afternoon of networking, interaction, and a live Claude Code demo.\n\nThe event was a community gathering where members talked, connected, and explored the possibilities of AI-assisted development. Peter Kibet showcased his Claude Code workflow with a live project demo — showing what developers can build with these tools.\n\nThis meetup marked the birth of Claude Community Kenya and set the foundation for what would become East Africa's most vibrant AI developer community.",
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
    venue: "Nairobi",
    city: "Nairobi",
    type: "meetup",
    status: "completed",
    description:
      "Our second Nairobi meetup! Deep dive into Claude Code workflows, multi-instance development, and community project updates.",
    fullDescription:
      "The second Claude Community Kenya meetup in Nairobi brought developers together for a deeper look at Claude Code workflows, multi-instance development, and agentic patterns.\n\nBuilding on the momentum from the first meetup, this session featured hands-on exploration and real-world project discussions from community members.",
    agenda: [
      "2:00 PM — Doors Open & Networking",
      "2:30 PM — Welcome & Community Updates",
      "3:00 PM — Workshop: Multi-Instance Claude Code Development",
      "4:00 PM — Community Project Showcases",
      "4:30 PM — Open Networking & Collaboration",
      "5:00 PM — Close",
    ],
    lumaUrl: "https://luma.com/sbsa789m",
    host: "Peter Kibet",
    highlights: [
      "Second CCK Nairobi meetup",
      "Deep dive into Claude Code workflows",
      "Community project showcases",
    ],
    photosUrl: "#",
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
  {
    slug: "claude-code-hackathon-nairobi-1",
    title: "Claude Code Hackathon — Nairobi",
    date: "2026-04-04",
    time: "8:00 AM – 6:00 PM EAT",
    venue: "TBA — Nairobi",
    city: "Nairobi",
    type: "hackathon",
    status: "upcoming",
    description:
      "East Africa's first Claude hackathon — build anything with Claude in one day, solo or as a team of up to three.",
    fullDescription:
      "Claude Community Kenya presents its first-ever hackathon — a full-day, in-person building sprint for developers across Nairobi. Whether you're coming solo or with a team of up to three, this is your chance to ship something real using Claude's API and Claude Code in a single day.\n\nThe build is open — no prescribed theme, no prescribed industry. If you can use Claude to solve a problem, tell a story, automate a workflow, or create something entirely new, it qualifies. Projects will be judged on real-world impact, technical execution, innovation, and how well teams demo their work.\n\nThe winner walks away with a Claude Code Max subscription. All registered participants receive CCK T-shirts and stickers. This isn't just a competition — it's a statement that Nairobi developers are building with the world's most capable AI, not just reading about it.",
    agenda: [
      "08:00 AM — Registration & Check-in",
      "08:30 AM — Opening Remarks + Rules Briefing",
      "09:00 AM — Claude API / Claude Code Quick-Start Orientation",
      "09:15 AM — Build Sprint Part 1 Begins",
      "02:00 PM — Lunch Break",
      "02:30 PM — Build Sprint Part 2",
      "04:30 PM — Project Submission Cutoff",
      "05:00 PM — Live Demos & Judging",
      "06:00 PM — Awards, Closing Remarks & Networking",
    ],
    host: "Peter Kibet",
    highlights: [
      "East Africa's first Claude hackathon",
      "Open build format — any domain, as long as Claude powers it",
      "Winner takes home a Claude Code Max subscription",
    ],
    prizes: [
      "🥇 1st Place — Claude Code Max subscription",
      "👕 All Participants — CCK T-shirt + stickers",
    ],
    rules: [
      "All projects must use the Claude API or Claude Code",
      "Solo participants or teams of up to 3 people",
      "Projects must be demoed live at the end of the day",
      "All intellectual property remains fully owned by the builder(s)",
      "CCK Code of Conduct applies — respectful behaviour, zero harassment",
    ],
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
