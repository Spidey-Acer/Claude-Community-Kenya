export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  tags: string[];
  excerpt: string;
  content: string;
  readingTime: number;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "how-kenyas-first-claude-code-meetup-happened",
    title: "How Kenya's First Claude Code Meetup Happened",
    date: "2026-02-01",
    author: "Peter Kibet",
    tags: ["meetup", "community", "nairobi"],
    excerpt:
      "The story of how 50+ developers gathered in Nairobi for East Africa's first-ever Claude Code meetup — and what happened next.",
    content: `It started with a simple idea: what if Kenyan developers could experience Claude Code together, in person?

On January 25, 2026, that idea became reality. Over 50 developers from across Nairobi packed into iHiT Events Space in Westlands for what would become a historic afternoon — Kenya's very first Claude Code meetup.

## The Setup

We didn't know what to expect. Would people show up? Would they care about Claude Code? We booked the venue, set up the projector, and hoped for the best.

By 2:00 PM, the room was full. Developers of all backgrounds — from university students to senior engineers, from solo freelancers to startup CTOs — all curious about this new way of building software.

## The Demo That Changed Everything

The centerpiece of the event was a live demo: building a full-stack application from scratch using Claude Code. No slides, no theory — just a terminal, Claude Code, and a real project taking shape in real-time.

The audience watched as a complete Next.js application materialized through natural language conversations with Claude. Features were added, bugs were fixed, and the codebase grew — all through the terminal.

The energy in the room was electric. Developers who had been skeptical walked away as believers.

## Mulinga: A Real-World Showcase

We also showcased Mulinga, a farm management system built entirely with Claude Code. This wasn't a toy project — it manages over 26,000 coffee plants across multiple farms in Kenya, tracking growth cycles, harvest yields, and worker assignments.

Seeing a production system built with Claude Code — solving a real African problem — inspired the room. This wasn't just about technology; it was about possibility.

## What Happened Next

By the end of the meetup, three things had happened:

1. **A Discord community was born** — we launched the Claude Community Kenya Discord server, and members started joining before the event even ended.

2. **Collaborations sparked** — developers exchanged contacts, formed project teams, and started planning what they'd build together.

3. **A movement began** — Claude Community Kenya wasn't just an event anymore. It was a community with momentum, ambition, and a shared vision for AI development in East Africa.

## Looking Forward

That first meetup taught us something important: Kenyan developers are hungry for AI tools that actually help them build. Claude Code isn't just another AI product — it's a paradigm shift in how software gets made.

We're now planning monthly meetups in Nairobi, expanding to Mombasa, and building partnerships with universities across Kenya. The first meetup was just the beginning.

If you missed it, don't worry. The next one is coming soon. Join our Discord to stay in the loop.

---

*Kenya's developer community is ready for AI. We're just getting started.*`,
    readingTime: 5,
  },
  {
    slug: "what-is-claude-code-kenyan-developers-guide",
    title: "What is Claude Code? A Kenyan Developer's Guide",
    date: "2026-02-10",
    author: "Peter Kibet",
    tags: ["claude-code", "tutorial", "guide"],
    excerpt:
      "A practical guide to Claude Code for Kenyan developers — what it is, how to install it, and why it's changing how we build software.",
    content: `If you've been hearing about Claude Code but aren't sure what it is or how to get started, this guide is for you.

## What is Claude Code?

Claude Code is Anthropic's official command-line tool that lets you build software with Claude AI directly in your terminal. Think of it as having a senior developer pair-programming with you — one who can read your entire codebase, understand your architecture, and help you build features, fix bugs, and refactor code.

Unlike chat-based AI tools where you copy-paste code snippets, Claude Code works directly in your project. It reads your files, understands your conventions, and makes changes right where they need to happen.

## Why Kenyan Developers Should Care

Here's the thing: Claude Code isn't just a productivity tool. It's a force multiplier. For solo developers and small teams — which describes most of Kenya's tech ecosystem — it means you can build at the speed and quality of a much larger team.

We've seen this firsthand. The Mulinga farm management system, which manages 26,000+ coffee plants, was built by a single developer using Claude Code. That's the kind of leverage we're talking about.

## Getting Started

### Step 1: Get Claude Access
Visit [claude.ai](https://claude.ai) and create an account. You'll need a Pro or Team plan to use Claude Code.

### Step 2: Install Claude Code
Open your terminal and run:

\`\`\`bash
npm install -g @anthropic-ai/claude-code
\`\`\`

### Step 3: Authenticate
Run \`claude\` in your terminal and follow the authentication prompts.

### Step 4: Start Building
Navigate to your project directory and run \`claude\`. That's it — you're pair-programming with Claude.

## Essential Commands

Here are the commands every developer should know:

- \`claude\` — Start an interactive session
- \`claude "build a login page"\` — Give Claude a direct task
- \`claude --plan\` — Use plan mode for complex tasks
- \`/help\` — See all available commands inside a session

## Tips for Getting the Most Out of Claude Code

1. **Set up a CLAUDE.md file** — This tells Claude about your project conventions, tech stack, and preferences. It's like onboarding a new team member.

2. **Use plan mode for big features** — For anything that touches multiple files, start with \`--plan\` to let Claude think through the approach first.

3. **Be specific with your prompts** — Instead of "make it better," try "refactor the authentication middleware to use JWT tokens with refresh token rotation."

4. **Trust but verify** — Claude is incredibly capable, but always review the changes it makes. You're the architect; Claude is the builder.

## Join the Community

The best way to level up your Claude Code skills is to learn alongside other developers. Join Claude Community Kenya on Discord — we have channels dedicated to Claude Code tips, project showcases, and help desk support.

See you in the terminal.`,
    readingTime: 5,
  },
  {
    slug: "joining-claude-community-ambassadors-program",
    title: "We're Official: Joining the Claude Community Ambassadors Program",
    date: "2026-02-14",
    author: "Peter Kibet",
    tags: ["ambassador", "anthropic", "announcement"],
    excerpt:
      "Claude Community Kenya is now part of the official Claude Community Ambassadors program — the first in East Africa. Here's what this means for our community.",
    content: `Today, we're thrilled to share some exciting news: Claude Community Kenya has been accepted into the official Claude Community Ambassadors program by Anthropic.

## What This Means

The Claude Community Ambassadors program is Anthropic's way of supporting and empowering community leaders around the world who are building vibrant developer communities around Claude. Being part of this program means:

- **Official Recognition** — We're now an officially recognized Claude community, backed by Anthropic.
- **Event Sponsorship** — Support for our meetups, workshops, and events across Kenya.
- **API Credits** — Credits for community projects and demonstrations.
- **Direct Access** — A direct line to the Anthropic team through the Ambassador Slack channel.
- **Global Network** — Connection with other Claude community leaders worldwide.
- **Early Access** — First look at new features and products.

## First in East Africa

We're proud to be the first Claude Community Ambassadors in East Africa. This isn't just about Kenya — it's about proving that world-class AI developer communities can thrive anywhere, including right here in East Africa.

When we hosted Kenya's first Claude Code meetup in January, we showed that the appetite for AI development tools is massive here. The Ambassador program gives us the resources and backing to turn that appetite into a movement.

## What's Next

With Ambassador status comes bigger plans:

1. **Monthly Meetups** — Regular events in both Nairobi and Mombasa.
2. **University Partnerships** — Starting with the Technical University of Mombasa, bringing AI education directly to students.
3. **Hackathons** — Community hackathons where developers build real solutions for real problems.
4. **Online Content** — Tutorials, guides, and resources specifically for Kenyan and East African developers.
5. **Project Incubation** — Supporting community members in building and shipping AI-powered products.

## How You Can Be Part of This

The Ambassador program is about community, and community is about people. Here's how you can get involved:

- **Join our Discord** — Our home base for daily discussions, help, and collaboration.
- **Attend a meetup** — Our next event is on February 20 in Nairobi.
- **Share your projects** — Built something with Claude? We want to feature it.
- **Spread the word** — Tell a friend, share on social media, invite your study group.

## A Message to Kenyan Developers

To every developer in Kenya who has ever wondered whether AI tools are "for us" — yes, they are. Claude Code doesn't care where you're based. It cares about what you're building.

We're here to make sure every Kenyan developer has the skills, community, and opportunity to build world-class AI-powered products. The Ambassador program is a big step in that direction.

Let's build something amazing together.

---

*Asante sana to Anthropic for believing in what we're building. This is just the beginning.*`,
    readingTime: 5,
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getSortedBlogPosts(): BlogPost[] {
  return [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
