export interface FAQ {
  id: string;
  category: "general" | "events" | "technical";
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  // General
  {
    id: "gen-1",
    category: "general",
    question: "What is Claude Community Kenya?",
    answer:
      "East Africa's first official Claude developer community, backed by Anthropic through the Claude Community Ambassadors program. We organize meetups, workshops, and career talks focused on building with Claude AI across Kenya.",
  },
  {
    id: "gen-2",
    category: "general",
    question: "Who can join the community?",
    answer:
      "Everyone! Whether you're a seasoned developer, a university student, a designer, a founder, or just curious about AI — you're welcome. No skill-level requirements.",
  },
  {
    id: "gen-3",
    category: "general",
    question: "Is it free to join?",
    answer:
      "Yes, completely free. Joining our Discord, attending meetups, and accessing our resources costs nothing.",
  },
  {
    id: "gen-4",
    category: "general",
    question: "What cities do you operate in?",
    answer:
      "We're active in Nairobi and Mombasa, with plans to expand to more Kenyan cities. Our Discord server is open to anyone worldwide.",
  },
  {
    id: "gen-5",
    category: "general",
    question: "How is this related to Anthropic?",
    answer:
      "Claude Community Kenya is part of Anthropic's official Claude Community Ambassadors program. We're recognized by Anthropic as the official Claude developer community for Kenya.",
  },
  {
    id: "gen-6",
    category: "general",
    question: "How do I get started?",
    answer:
      "Join our Discord server — that's our home base for daily discussions, help, and announcements. From there, RSVP for upcoming events and connect with other members. Visit our Join page for all the links.",
  },
  // Events
  {
    id: "evt-7",
    category: "events",
    question: "How often do you host events?",
    answer:
      "At least one event per month, alternating between Nairobi and Mombasa. Events include meetups, hands-on workshops, career talks at universities, and hackathons.",
  },
  {
    id: "evt-8",
    category: "events",
    question: "How do I register for events?",
    answer:
      "We use Luma for event registration. Check our Events page for upcoming events — each listing has a registration link. Most events are free, but space may be limited.",
  },
  {
    id: "evt-9",
    category: "events",
    question: "Can I attend events remotely?",
    answer:
      "Currently our events are in-person only. We share recaps, slides, and key takeaways on our blog and Discord after each event. Hybrid options are being explored.",
  },
  {
    id: "evt-10",
    category: "events",
    question: "Can I host or speak at an event?",
    answer:
      "Absolutely! We're always looking for speakers, workshop leaders, and co-organizers. Reach out on Discord or email us.",
  },
  // Technical
  {
    id: "tech-11",
    category: "technical",
    question: "What is Claude?",
    answer:
      "Claude is an AI assistant built by Anthropic, designed to be helpful, harmless, and honest. It excels at coding, analysis, writing, math, and thoughtful conversation. Use it through claude.ai, the API, or Claude Code.",
  },
  {
    id: "tech-12",
    category: "technical",
    question: "What is Claude Code?",
    answer:
      "Anthropic's official CLI tool that lets you build software with Claude directly in your terminal. It can read your entire codebase, understand your architecture, and help you build features, fix bugs, and refactor — all through natural language.",
  },
  {
    id: "tech-13",
    category: "technical",
    question: "Does Claude Code cost money?",
    answer:
      "Claude Code requires a Claude Pro ($20/month) or Team plan. The Pro plan includes generous usage limits suitable for most developers.",
  },
];

export function getFaqsByCategory(category: FAQ["category"]): FAQ[] {
  return faqs.filter((f) => f.category === category);
}
