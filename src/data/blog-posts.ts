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
    slug: "getting-started-with-claude-code",
    title: "Getting Started with Claude Code: A Developer's Guide",
    date: "2026-02-10",
    author: "Claude Community Kenya",
    tags: ["claude-code", "tutorial", "getting-started"],
    excerpt:
      "A practical, hands-on guide to installing Claude Code, setting up your first project, and understanding the workflows that make AI-assisted development so powerful.",
    content: `Claude Code is changing how developers build software. Instead of switching between your editor and a chat window, you work directly in your terminal — describing what you want to build and watching Claude implement it across your codebase in real time.

This guide walks you through everything you need to get started.

## What is Claude Code?

Claude Code is Anthropic's agentic coding tool that lives in your terminal. It can read your entire project, understand your architecture, create and edit files, run commands, and help you build features end-to-end — all through natural language.

It is not a code completion tool or a chatbot with a code window. Claude Code operates as a full development partner that understands your project context and can take multi-step actions across your codebase.

## Prerequisites

Before you begin, you will need:

- **Node.js 18+** installed on your machine
- A **Claude Pro, Team, or API** account (Claude Code requires authentication)
- A terminal you are comfortable working in (bash, zsh, PowerShell, etc.)

## Installation

Install Claude Code globally via npm:

\`\`\`bash
npm install -g @anthropic-ai/claude-code
\`\`\`

Once installed, navigate to any project directory and run:

\`\`\`bash
claude
\`\`\`

You will be prompted to authenticate on your first run. Follow the instructions to connect your Anthropic account.

## Your First Session

Once authenticated, Claude Code drops you into an interactive session. You can now give Claude tasks in plain English:

\`\`\`
> Create a REST API endpoint for user registration with email validation
\`\`\`

Claude will read your project structure, understand what frameworks and patterns you are using, and implement the feature accordingly. It creates files, modifies existing ones, and can even run your tests to verify everything works.

## Key Concepts

### The CLAUDE.md File

One of the most powerful features is the \`CLAUDE.md\` file. Place this in your project root to give Claude persistent context about your project:

- Your tech stack and conventions
- File structure and naming patterns
- Testing preferences
- Any project-specific rules

Think of it as onboarding documentation for your AI pair programmer. The better your CLAUDE.md, the better Claude Code performs.

### Plan Mode

For complex features that touch multiple files, use plan mode:

\`\`\`
> /plan Add a complete authentication system with JWT tokens and refresh token rotation
\`\`\`

Claude will first outline its approach, show you which files it plans to create or modify, and wait for your approval before making changes. This is invaluable for architectural decisions.

### Multi-File Awareness

Unlike code completion tools that only see the current file, Claude Code has full project awareness. It can:

- Read and understand your entire codebase
- Follow import chains and understand dependencies
- Maintain consistency across files when making changes
- Run terminal commands to test and verify its work

## Essential Commands

Inside a Claude Code session, these commands will serve you well:

- \`/help\` — View all available commands
- \`/plan\` — Enter plan mode for complex tasks
- \`/clear\` — Clear conversation history
- \`/cost\` — Check your token usage for the session

## Tips for Effective Use

**Be specific with context.** Instead of "fix the bug," try "the login form submits but the API returns a 401 — check the authentication middleware and token validation logic."

**Use iterative development.** Start with a basic implementation, test it, then ask Claude to enhance it. This mirrors how experienced developers work and produces better results.

**Review everything.** Claude Code is remarkably capable, but you are the architect. Always review the changes, understand the approach, and verify the implementation meets your requirements.

**Leverage your CLAUDE.md.** The more context you provide about your project conventions, the more consistent and high-quality the output will be.

## Next Steps

The best way to learn Claude Code is to use it. Pick a feature you have been putting off, open your terminal, and let Claude help you build it.

If you want to learn alongside other developers, join the Claude Community Kenya Discord. We have dedicated channels for Claude Code tips, project showcases, and troubleshooting.

Welcome to the future of development.`,
    readingTime: 6,
  },
  {
    slug: "what-is-claude-community-kenya",
    title: "What is Claude Community Kenya?",
    date: "2026-02-01",
    author: "Claude Community Kenya",
    tags: ["community", "introduction", "kenya"],
    excerpt:
      "An introduction to Claude Community Kenya — who we are, what we do, and why we are building East Africa's first Claude developer community.",
    content: `On January 24, 2026, over 30 developers gathered at iHiT Events Space in Westlands, Nairobi for a simple reason: to explore what it means to build software with Claude. That afternoon marked the birth of Claude Community Kenya.

## Who We Are

Claude Community Kenya (CCK) is a developer community focused on building with Claude and Anthropic's tools. We bring together software developers, students, and tech professionals across Kenya who are interested in AI-assisted development.

We are based in Nairobi with a growing presence in Mombasa, and we are part of the global network of Claude developer communities.

## What We Do

### In-Person Meetups

Our core activity is regular meetups where developers come together to learn, share, and build. These are not lecture-style events — they are hands-on sessions where people demo their work, share workflows, and help each other level up.

Our first meetup featured a Claude Code workflow demo and open community interaction. Future meetups will include workshops, project showcases, and collaborative building sessions.

### University Partnerships

We believe the next generation of Kenyan developers should have access to the best AI tools from day one. We are partnering with universities — starting with the Technical University of Mombasa — to bring AI development workshops and career talks directly to students.

### Online Community

Between meetups, our Discord server is where the community stays connected. Members share projects, ask for help, discuss the latest Claude features, and collaborate on community initiatives.

### Knowledge Sharing

Through blog posts, resource guides, and our website, we create learning materials tailored for the Kenyan and East African developer context. From getting started guides to advanced workflow tutorials, we are building a knowledge base that helps developers at every level.

## Why Claude?

Claude, built by Anthropic, represents a new approach to AI — one focused on safety, helpfulness, and honesty. For developers, Claude Code is a particularly exciting tool because it works directly in your development environment, understanding your entire codebase and helping you build features, fix bugs, and ship faster.

We chose to build our community around Claude because we believe it is the most developer-friendly AI tool available, and because Anthropic's values around safety and responsibility align with how we think about technology.

## Why Kenya?

Kenya has one of the most dynamic tech ecosystems in Africa. From M-Pesa revolutionizing mobile payments to a thriving startup scene in Nairobi, Kenyan developers have consistently shown they can build world-class products.

AI-assisted development is the next frontier, and we want to make sure Kenyan developers are not just consumers of AI tools but leaders in how these tools are used. By building a strong local community, we create the support network that helps developers go from curious to capable to shipping.

## How to Get Involved

There are several ways to join the community:

- **Join our Discord** — This is the quickest way to connect with other members, ask questions, and stay updated on events.
- **Attend a meetup** — Check our events page for upcoming gatherings in Nairobi and Mombasa.
- **Share your work** — Built something with Claude? We want to hear about it. Community projects get featured on our website.
- **Contribute** — Help us create learning resources, organize events, or improve our open-source projects.

## What is Next

We are just getting started. In the coming months, expect:

- Monthly meetups in Nairobi
- Our first university event in Mombasa
- More learning resources and tutorials
- Community project showcases
- Hackathons and collaborative building events

Claude Community Kenya exists because we believe that when developers come together, learn together, and build together, incredible things happen. We are building that space for Kenya and East Africa.

Come build with us.`,
    readingTime: 5,
  },
  {
    slug: "ai-developer-communities-shaping-kenyas-tech-scene",
    title: "How AI Developer Communities Are Shaping Kenya's Tech Scene",
    date: "2026-02-14",
    author: "Claude Community Kenya",
    tags: ["ai", "kenya", "developer-community", "tech-ecosystem"],
    excerpt:
      "AI is transforming software development worldwide. In Kenya, developer communities are playing a critical role in making sure local developers are not left behind.",
    content: `The global software industry is undergoing its most significant shift in decades. AI-assisted development tools are changing not just how code gets written, but who can write it and how fast they can ship. For Kenya's tech ecosystem — already one of Africa's most dynamic — this shift presents both an enormous opportunity and an urgent challenge.

## The AI Development Revolution

In the past two years, AI coding tools have evolved from autocomplete suggestions to full development partners. Tools like Claude Code can understand entire codebases, implement features across multiple files, run tests, and iterate on feedback — all from natural language instructions.

This is not incremental improvement. It is a fundamental change in developer productivity. Tasks that previously took days can now be completed in hours. Solo developers can build and maintain systems that would have required small teams.

## Why This Matters for Kenya

Kenya's tech ecosystem has several characteristics that make AI-assisted development particularly impactful:

### A Young, Growing Developer Population

Kenya has one of the youngest populations in the world, and interest in software development is surging. University computer science programs are oversubscribed, and coding bootcamps are expanding rapidly. AI tools can dramatically accelerate the learning curve for these new developers.

### A Strong Freelance and Startup Culture

Many Kenyan developers work as freelancers or in small startup teams. When a single developer can produce the output of a team, it changes the economics of building software products. This is especially significant in a market where venture capital is scarce and bootstrapping is the norm.

### Real Problems to Solve

From agriculture to financial services to healthcare, Kenya has no shortage of problems that software can address. AI-assisted development makes it faster and cheaper to build solutions for these challenges, which means more problems get solved.

## The Role of Developer Communities

Technology alone does not drive adoption. Communities do. This is a pattern we have seen repeatedly in Kenya's tech history:

- M-Pesa succeeded partly because of the community of agents and merchants who spread the technology
- Kenya's open data movement was driven by a community of civic technologists
- Nairobi's startup ecosystem grew through shared spaces, meetups, and peer networks

AI development tools follow the same pattern. Having access to Claude Code is not the same as knowing how to use it effectively. Communities provide:

### Practical Knowledge Transfer

The gap between reading documentation and being productive with a new tool is often bridged by watching someone else use it. At our first Claude Code meetup in Nairobi, developers who were skeptical about AI coding tools left as practitioners — because they saw real workflows in action.

### Context-Specific Learning

Global tutorials and documentation are valuable, but they rarely address the specific challenges Kenyan developers face. A community can create learning materials that account for local internet speeds, preferred tech stacks, and the types of problems developers here are solving.

### Accountability and Motivation

Learning new tools in isolation is hard. A community creates natural accountability — when you know you will demo your project at the next meetup, you actually build it.

### Professional Networks

In Kenya's tech scene, who you know often matters as much as what you know. Developer communities create the networks that lead to collaborations, job opportunities, and partnerships.

## Building for the Long Term

The communities that will have the most impact are those that focus on practical outcomes rather than hype. For AI developer communities in Kenya, this means:

**Hands-on, not theoretical.** Meetups should involve actual coding, real demos, and practical workshops — not just slide decks about the future of AI.

**Inclusive by design.** The benefits of AI tools should reach developers at all levels — from university students to senior engineers, from Nairobi to Mombasa and beyond.

**Project-oriented.** The ultimate measure of a developer community is what its members ship. Community projects, hackathons, and showcases keep the focus on building real things.

**Connected globally, rooted locally.** Being part of global networks provides resources and recognition, but the real value is in solving local problems and strengthening the local ecosystem.

## Looking Ahead

We are still in the early days of AI-assisted development. The tools will continue to improve, and new use cases will emerge that we cannot predict today. What we can predict is that developers who build skills in this space now — and communities that support them — will have a significant advantage.

Kenya has always punched above its weight in technology. From being the birthplace of mobile money to producing world-class software engineers, this is a country that knows how to adopt and adapt technology. AI-assisted development is the next chapter of that story.

The communities being built today — in coworking spaces in Nairobi, university halls in Mombasa, and Discord servers connecting developers across the country — are laying the foundation for that next chapter.

The question is not whether Kenyan developers will adopt AI tools. The question is whether they will be among the leaders in defining how these tools are used. We are betting yes.`,
    readingTime: 7,
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
