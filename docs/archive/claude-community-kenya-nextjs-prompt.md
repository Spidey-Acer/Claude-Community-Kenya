# Project: Claude Community Kenya — Official Website (Next.js)

## Overview

Build a complete, production-ready, multi-page website for **Claude Community Kenya** — East Africa's first and official Claude developer community, part of the Anthropic Claude Community Ambassadors program (founding cohort, February 2026).

This is not a template site. This is the digital headquarters for a real, active developer community backed by Anthropic. It needs to:
- Impress Anthropic partners who will review it
- Attract Kenyan developers and students to join
- Serve as the central hub linking all community platforms
- Showcase real events, real projects, real impact
- Function as a resource library for Claude users across East Africa

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS v3 + custom CSS for terminal effects
- **Animations:** Framer Motion for page transitions and scroll animations
- **Typography:** Google Fonts — JetBrains Mono (monospace/headings/UI), IBM Plex Sans (body text)
- **Icons:** Lucide React
- **Deployment target:** Vercel (optimize for it)
- **No database needed for v1** — all content is static/hardcoded (we'll add a CMS later)
- **No authentication needed for v1**

## Design Direction: "Terminal Noir" — Premium Hacker Aesthetic

This is the core identity. Every page should feel like you've accessed something exclusive — a private developer terminal with real information.

### Color System (CSS Variables / Tailwind Config)
```
--bg-primary: #0a0a0a        (deep black)
--bg-secondary: #111111       (slightly lighter black)
--bg-card: #161616            (card backgrounds)
--bg-elevated: #1a1a1a        (hover states, elevated surfaces)
--border: #222222             (subtle borders)
--border-hover: #333333       (active borders)
--green-primary: #00ff41      (terminal green — primary accent)
--green-dim: #00ff4133        (green glow/shadow)
--green-muted: #00cc33        (less intense green for body text)
--amber: #ffb000              (secondary accent — warnings, highlights)
--amber-dim: #ffb00033        (amber glow)
--red: #ff3333                (error states, important badges)
--cyan: #00d4ff               (links, info states)
--text-primary: #e0e0e0       (main text)
--text-secondary: #888888     (muted text)
--text-dim: #555555           (very subtle text)
--white: #ffffff              (high emphasis)
```

### Typography Scale
```
Display (hero headings): JetBrains Mono, 3.5-5rem, font-weight: 700
H1: JetBrains Mono, 2.5-3rem, font-weight: 700
H2: JetBrains Mono, 2rem, font-weight: 600
H3: JetBrains Mono, 1.5rem, font-weight: 600
H4: JetBrains Mono, 1.125rem, font-weight: 500
Body: IBM Plex Sans, 1rem, font-weight: 400
Small/Caption: IBM Plex Sans, 0.875rem
Code/Terminal: JetBrains Mono, 0.875-1rem, font-weight: 400
```

### Global Visual Effects (Reusable Components)
1. **Scanline overlay** — Subtle CSS scanlines across the entire page background (very low opacity, 0.03-0.05)
2. **Terminal window component** — Reusable card with macOS-style dots (● ● ●), title bar, monospace content
3. **Typing cursor** — Blinking block cursor (`▊`) animation, reusable
4. **Glitch effect** — CSS glitch on hover for headings (use `clip-path` animation)
5. **Matrix rain** — Subtle falling characters in background of hero sections only (canvas-based, performant, respect `prefers-reduced-motion`)
6. **CRT glow** — Subtle green phosphor glow on key elements (CSS `box-shadow` with green-dim)
7. **Command prompt prefix** — `$` or `>` before interactive elements
8. **Loading bar** — Page progress indicator styled as a terminal loading bar at top of viewport
9. **Noise/grain texture** — Very subtle CSS noise overlay for depth
10. **Scroll-triggered reveals** — Elements fade/slide in on scroll using Framer Motion with stagger

### Interactive Patterns
- **Navigation:** Desktop = horizontal terminal-style bar with commands. Mobile = slide-down terminal panel
- **Buttons:** Primary = green border + green text, hover fills green with black text. Secondary = amber variant. All prefixed with `>` symbol
- **Links:** Cyan colored, underline on hover with typing cursor effect
- **Cards:** Terminal window style with title bar, subtle border, hover lifts with green glow
- **Page transitions:** Framer Motion — fade + slight slide, feels like switching terminal tabs
- **Hover states:** Elements feel like terminal line selection (subtle background highlight)
- **Focus states:** Green outline (accessibility)

---

## Site Architecture

```
/                           → Home
/about                      → About the community + team
/events                     → All events (upcoming + archive)
/events/[slug]              → Individual event detail page
/resources                  → Learning hub & resource library
/resources/getting-started  → Getting started with Claude guide
/resources/claude-code      → Claude Code specific resources
/resources/workflows        → Advanced workflows & patterns
/resources/links            → Curated links directory
/projects                   → Community project showcase
/join                       → Join the community (all platforms)
/blog                       → Community blog / updates
/blog/[slug]                → Individual blog post
/ambassador                 → About the Ambassador program
/code-of-conduct            → Community guidelines
/faq                        → Frequently asked questions
```

---

## Page-by-Page Specification

---

### PAGE: Home (`/`)

The homepage is the gateway. It should immediately communicate: what this is, why it matters, and how to join.

#### Hero Section
- Full viewport height
- Matrix rain background (subtle, canvas-based)
- Large animated terminal window center-screen that types out sequentially:
```
┌──────────────────────────────────────────────┐
│ claude-community-kenya@nairobi:~$            │
├──────────────────────────────────────────────┤
│                                              │
│  $ whoami                                    │
│  > Claude Community Kenya 🇰🇪               │
│                                              │
│  $ cat mission.txt                           │
│  > Building East Africa's most vibrant       │
│    AI developer community                    │
│                                              │
│  $ status --check                            │
│  > 🟢 ACTIVE                                │
│  > Cities: Nairobi, Mombasa                  │
│  > Members: 50+                              │
│  > Next event: Feb 20, 2026                  │
│                                              │
│  $ join --now                                │
│  > [CLICK TO JOIN DISCORD] ▊                 │
│                                              │
└──────────────────────────────────────────────┘
```
- The `[CLICK TO JOIN DISCORD]` is an actual clickable link
- Below terminal: tagline "East Africa's First Claude Developer Community | Backed by Anthropic"
- Two CTA buttons: `> JOIN_DISCORD` (primary, green) and `> VIEW_EVENTS` (secondary, amber)

#### Stats Bar (scroll-triggered)
- Horizontal bar with animated count-up numbers:
  - `50+` Members
  - `2` Cities
  - `3` Events Hosted
  - `1` Ambassador Program (Founding Cohort)
- Each stat in a mini terminal card
- Numbers count up from 0 on scroll into view

#### Featured Events Section
- Header: `## Upcoming Events` styled as `$ ls events/ --upcoming`
- Show 2-3 upcoming event cards (pull from events data)
- Each card = terminal window with event name, date, location, status badge
- "View All Events →" link to `/events`

#### What We Do Section
- Header: `$ man claude-community-kenya`
- Four pillar cards in a grid:
  1. **Meetups** — icon: Terminal. "Monthly in-person events across Kenya. Live demos, lightning talks, networking."
  2. **Workshops** — icon: Code. "Hands-on Claude Code sessions. Multi-instance development, agentic patterns, real projects."
  3. **Career Talks** — icon: GraduationCap. "University partnerships bringing AI education to the next generation of builders."
  4. **Online Community** — icon: MessageSquare. "Discord server with 24/7 discussions, help desk, project collaboration, job board."

#### Community Showcase Preview
- Header: `$ ls projects/ --featured`
- Show 3 featured project cards
- "View All Projects →" link to `/projects`

#### Join CTA Section
- Full-width section with terminal styling
- Header: `$ sudo join --community`
- Three pathways:
  1. Discord (PRIMARY — largest card)
  2. Attend an Event
  3. Follow on Social Media
- Background: subtle matrix rain or green gradient

#### Partners Bar
- "Supported by" section
- Text-only mentions: Anthropic (Claude Community Ambassadors Program), iHiT Events Space, Swahilipot Hub Foundation, Technical University of Mombasa
- Minimal, elegant, single row

---

### PAGE: About (`/about`)

#### Hero
- Header: `$ cat README.md`
- Subheader: "The story of East Africa's first Claude developer community"

#### Our Story Section
Content (write as engaging narrative paragraphs, not bullet points):
```
Claude Community Kenya was born in January 2026 when a group of Kenyan developers
decided that Africa shouldn't just consume AI — we should build with it.

What started as a single meetup at iHiT Events Space in Nairobi — Kenya's first-ever
Claude Code event — has grown into a movement spanning two cities, backed by Anthropic
through their founding Claude Community Ambassadors program.

We're not just another tech meetup. We're builders who believe that the best way to learn
AI is to ship real projects. From farm management systems serving 26,000+ coffee plants
to production APIs powering local businesses, our community proves that world-class
AI development happens right here in Kenya.

Whether you're a senior engineer at a top tech company, a computer science student at
university, or someone curious about what AI can do — you have a place here.
```

#### Our Mission
- Terminal-styled card with:
```
MISSION: To build East Africa's most vibrant, inclusive, and impactful AI developer
community — one meetup, one project, one builder at a time.

VISION: A Kenya where every developer has the skills, community, and opportunity to
build world-class AI-powered products.

VALUES:
  --build-in-public    We learn by shipping, not just studying
  --radical-inclusion   No gatekeeping. Every skill level welcome.
  --african-innovation  We solve African problems with African ingenuity
  --community-first     We grow together or not at all
```

#### The Team
- Grid of team member cards (terminal-styled):
  1. **Peter Kibet** — Founder & Lead Organizer
     - Role: Claude Community Ambassador (Kenya)
     - Bio: Senior Software Engineer at NexaForge. Builds production AI systems for agriculture (26,000+ coffee plants managed by Claude-built systems). BSIT graduate whose capstone project was "too complex" until Claude Code made it real.
     - Links: LinkedIn, GitHub, Twitter
  2. **Edwin Lungatso** — Co-Organizer (Nairobi)
     - Role: Community volunteer
     - Bio: [Placeholder — update when confirmed]
  3. **Dr. Fullgence Mwakondo** — Academic Partner (Mombasa)
     - Role: Host, Technical University of Mombasa
     - Bio: Institute of Computing and Informatics, TU Mombasa
  4. **Joshua Wekesa** — Community Partner (Mombasa)
     - Role: Swahilipot Hub Foundation liaison
- "Want to join the team?" CTA linking to a contact form or Discord

#### Timeline / Milestones
- Vertical timeline component styled as git log:
```
commit a1b2c3d  Jan 25, 2026
  feat: Kenya's First Claude Code Meetup — iHiT Events Space, Nairobi
  Attendees from Microsoft, Safaricom, Equity Bank, and more.

commit d4e5f6g  Jan 2026
  feat: Claude Community Ambassadors invitation from Anthropic
  Founding cohort member — first in East Africa.

commit h7i8j9k  Feb 11, 2026
  feat: Official Ambassador program application submitted

commit l0m1n2o  Feb 20, 2026
  feat: Nairobi Meetup #2 [UPCOMING]

commit p3q4r5s  Feb 28, 2026
  feat: First university event — Career Talk at TU Mombasa [UPCOMING]
```

---

### PAGE: Events (`/events`)

#### Header
- `$ ls events/ -la --sort=date`
- Filter tabs: `All` | `Upcoming` | `Past` | `Nairobi` | `Mombasa`

#### Event Cards Grid
Each event card (terminal window style):
- Status badge: `UPCOMING` (green), `REGISTRATION OPEN` (amber), `COMPLETED` (dim), `SOLD OUT` (red)
- Event name (bold, large)
- Date + Time
- Location (City + Venue)
- Brief description (2 lines)
- Tags: e.g., `meetup`, `workshop`, `career-talk`, `hackathon`
- CTA: "Register →" or "View Recap →"
- Click → goes to `/events/[slug]`

#### Event Data (Hardcode these):

**Upcoming:**
```
{
  slug: "nairobi-meetup-feb-2026",
  title: "Nairobi Meetup #2",
  date: "February 20, 2026",
  time: "2:00 PM - 5:00 PM EAT",
  venue: "TBA",
  city: "Nairobi",
  type: "meetup",
  status: "upcoming",
  description: "Our second Nairobi meetup! Join us for live Claude Code demos, lightning talks from community members, and networking with Kenya's AI builder community.",
  agenda: [
    "2:00 PM — Doors Open & Networking",
    "2:30 PM — Welcome & Community Updates",
    "2:45 PM — Featured Demo: Multi-Instance Claude Code Development",
    "3:30 PM — Lightning Talks (Community Members)",
    "4:15 PM — Open Hacking / Q&A",
    "4:45 PM — Wrap-up & Next Steps",
    "5:00 PM — Close"
  ],
  registrationUrl: "#",
  lumaUrl: "#"
}

{
  slug: "tu-mombasa-career-talk-feb-2026",
  title: "Career Talk: Building with AI",
  date: "February 28, 2026",
  time: "10:00 AM - 1:00 PM EAT",
  venue: "Assembly Hall, Institute of Computing and Informatics",
  city: "Mombasa",
  type: "career-talk",
  status: "registration-open",
  description: "A career-focused session at Technical University of Mombasa exploring how AI tools like Claude are transforming software development careers. Hosted by the Institute of Computing and Informatics.",
  agenda: [
    "10:00 AM — Registration & Welcome",
    "10:15 AM — Keynote: The AI-Powered Developer Career Path",
    "10:45 AM — Live Demo: Building a Production App with Claude Code",
    "11:30 AM — Panel: AI in the Kenyan Tech Industry",
    "12:15 PM — Q&A with Students",
    "12:45 PM — Networking & Community Sign-ups",
    "1:00 PM — Close"
  ],
  host: "Dr. Fullgence Mwakondo",
  partnerOrg: "Swahilipot Hub Foundation",
  registrationUrl: "#",
  lumaUrl: "#"
}
```

**Past:**
```
{
  slug: "first-claude-code-meetup-jan-2026",
  title: "Kenya's First Claude Code Meetup",
  date: "January 25, 2026",
  time: "2:00 PM - 5:00 PM EAT",
  venue: "iHiT Events Space",
  city: "Nairobi",
  type: "meetup",
  status: "completed",
  description: "The one that started it all. Kenya's first-ever Claude Code meetup brought together engineers from Microsoft, Safaricom, Equity Bank, and more to explore building with Claude.",
  highlights: [
    "Attendees from major tech companies and startups",
    "Live demo of multi-instance Claude Code development",
    "Real production system showcase: Mulinga Farm Management",
    "Community Discord launch"
  ],
  attendeeCount: 30,
  photosUrl: "#"
}
```

#### Individual Event Page (`/events/[slug]`)
- Full event detail with terminal styling
- Event header with status badge, title, date, time, venue
- Google Maps embed or static map showing venue location
- Full agenda timeline
- Speaker/host cards
- Registration CTA (if upcoming)
- Photo gallery (if past, placeholder for now)
- "Back to Events" navigation
- Share buttons (copy link, share to Twitter, LinkedIn)

---

### PAGE: Resources (`/resources`)

This is the KNOWLEDGE HUB. This page alone should make the site worth bookmarking.

#### Header
- `$ man claude --resources`
- "Everything you need to start building with Claude"

#### Resource Categories (sub-navigation cards):

1. **Getting Started** → `/resources/getting-started`
2. **Claude Code** → `/resources/claude-code`
3. **Advanced Workflows** → `/resources/workflows`
4. **Curated Links** → `/resources/links`

---

### SUB-PAGE: Getting Started (`/resources/getting-started`)

Terminal-styled tutorial page for complete beginners.

Content sections:

**What is Claude?**
```
Claude is an AI assistant made by Anthropic. Think of it as a highly capable
coding partner, writing assistant, and problem-solving tool that understands
context and can help you build real software.

Unlike basic chatbots, Claude can:
- Write, debug, and explain production-quality code
- Understand entire codebases and make complex changes
- Work alongside you in your terminal (Claude Code)
- Help you think through architecture and design decisions
```

**Claude Products Overview:**
- **Claude.ai** — Web/mobile chat interface. Free tier available. Best for: conversations, writing, analysis, quick coding help.
  - URL: https://claude.ai
- **Claude Code** — Command-line coding agent. Works in your terminal. Best for: building real projects, editing codebases, running commands.
  - URL: https://docs.anthropic.com/en/docs/claude-code
- **Claude API** — Build Claude into your own apps. Best for: developers integrating AI into products.
  - URL: https://docs.anthropic.com/en/api
- **Claude for Enterprise** — Team features, admin controls. Best for: companies adopting Claude organization-wide.

**How to Get Started (Step by Step):**
1. Create a free account at claude.ai
2. Explore the free tier — ask Claude to help you with a coding problem
3. If you want Claude Code: Install it via `npm install -g @anthropic-ai/claude-code`
4. Join our Discord to ask questions and see what others are building
5. Attend a meetup to see live demos

**Pricing Overview (keep updated):**
- Free tier: Limited messages per day
- Pro ($20/month): More messages, priority access, Claude Code included
- Team ($25/user/month): Collaboration features
- Enterprise: Custom pricing
- Note: "Check https://claude.ai/pricing for the latest pricing"

---

### SUB-PAGE: Claude Code Resources (`/resources/claude-code`)

The definitive Claude Code resource page for Kenyan developers.

**What is Claude Code?**
```
Claude Code is Anthropic's command-line tool that turns Claude into an
agentic coding assistant that works directly in your terminal. It can
read your codebase, write code, run commands, and iterate on complex
projects — all from the command line.
```

**Installation Guide:**
```bash
# Requirements: Node.js 18+
# Install globally
npm install -g @anthropic-ai/claude-code

# Navigate to your project
cd your-project

# Start Claude Code
claude

# That's it. Start talking to Claude about your codebase.
```

**Essential Commands Quick Reference:**
```
claude                    # Start interactive session
claude "fix the login bug"  # One-shot command
claude --resume            # Resume last session
/init                     # Initialize CLAUDE.md for your project
/compact                  # Compress conversation context
/cost                     # Check token usage
/doctor                   # Troubleshoot issues
/memory                   # View/edit project memory
```

**Setting Up CLAUDE.md (Project Context):**
```
Every project should have a CLAUDE.md file in the root directory.
This tells Claude about your project's structure, conventions,
and preferences. Think of it as onboarding documentation for your
AI coding partner.

Example CLAUDE.md:
---
# Project: My Kenya App
## Tech Stack
- Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL
## Conventions
- Use functional components with hooks
- API routes in /app/api
- All database queries through Prisma
- Environment variables in .env.local
## Current Focus
- Building user authentication flow
- Setting up M-Pesa payment integration
---
```

**Multi-Instance Development:**
```
Run multiple Claude Code instances simultaneously for parallel development:

Terminal 1: claude "build the API endpoints for user auth"
Terminal 2: claude "create the frontend login form"
Terminal 3: claude "write tests for the auth flow"

Pro tip: Use VS Code's split terminal or tmux to manage multiple instances.
Peter (our founder) runs 4 instances simultaneously on production systems.
```

**Resources:**
- Official Claude Code docs: https://docs.anthropic.com/en/docs/claude-code
- Claude Code GitHub: https://github.com/anthropics/claude-code
- Anthropic Cookbook: https://github.com/anthropics/anthropic-cookbook

---

### SUB-PAGE: Advanced Workflows (`/resources/workflows`)

For experienced developers who want to level up.

**Agentic Development Patterns:**
```
Agentic coding means giving Claude autonomous capability to plan,
execute, and iterate on complex tasks. Instead of asking Claude to
write one function, you describe an outcome and let it figure out
the steps.

Example: "Refactor the entire authentication module to use JWT tokens
instead of sessions. Update all routes, middleware, and tests."

Claude will:
1. Analyze the current codebase
2. Create a plan
3. Execute changes across multiple files
4. Run tests to verify
5. Fix any issues it finds
```

**Plan Mode:**
```
Use /plan to have Claude think through a task before executing:

You: /plan Migrate our database from MySQL to PostgreSQL

Claude will outline:
- Schema differences to address
- Query syntax changes needed
- Migration script steps
- Data transfer approach
- Testing strategy

Review the plan, then approve execution.
```

**Git Worktree Strategy for Parallel Development:**
```bash
# Create worktrees for parallel Claude instances
git worktree add ../project-feature-auth feature/auth
git worktree add ../project-feature-payments feature/payments

# Run Claude in each worktree simultaneously
cd ../project-feature-auth && claude
cd ../project-feature-payments && claude

# Each instance works on a separate branch without conflicts
```

**Building Production Systems with Claude:**
```
Real example from our community:

Peter built the Mulinga Coffee Farm Management System — managing
26,000+ coffee plants and poultry operations — using Claude Code.

What started as a "too complex" university capstone in 2023 became
a production system in 2025 because Claude Code enabled:
- Multi-instance parallel development
- Complex agricultural algorithms
- Real-time monitoring dashboards
- Mobile-responsive management interface

The system now runs in production on a real farm in Kenya.
```

---

### SUB-PAGE: Curated Links (`/resources/links`)

A comprehensive, categorized link directory. This is the "awesome-list" for Claude users in Kenya.

Style as a terminal directory listing.

**Official Anthropic Resources:**
```
├── Claude.ai                    https://claude.ai
├── Anthropic API Docs           https://docs.anthropic.com
├── Claude Code Docs             https://docs.anthropic.com/en/docs/claude-code
├── Anthropic Cookbook            https://github.com/anthropics/anthropic-cookbook
├── Claude Code GitHub           https://github.com/anthropics/claude-code
├── Anthropic Blog               https://www.anthropic.com/blog
├── Anthropic Research           https://www.anthropic.com/research
├── Claude Pricing               https://claude.ai/pricing
├── Anthropic Status Page        https://status.anthropic.com
├── System Prompts (Public)      https://docs.anthropic.com/en/docs/about-claude/models
└── Claude Model Card            https://www.anthropic.com/claude
```

**Learning & Tutorials:**
```
├── Prompt Engineering Guide     https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering
├── Claude Code Getting Started  https://docs.anthropic.com/en/docs/claude-code/getting-started
├── Tool Use / Function Calling  https://docs.anthropic.com/en/docs/build-with-claude/tool-use
├── Vision (Image Analysis)      https://docs.anthropic.com/en/docs/build-with-claude/vision
├── Claude for Google Sheets     https://docs.anthropic.com/en/docs/about-claude/models
├── MCP (Model Context Protocol) https://modelcontextprotocol.io
└── MCP Servers Directory        https://github.com/modelcontextprotocol/servers
```

**Community & Social:**
```
├── Claude Community Kenya Discord   [Discord invite link]
├── Claude Community Kenya LinkedIn  [LinkedIn page link]
├── Claude Community Kenya X         [Twitter link]
├── Anthropic Discord (Official)     https://discord.gg/anthropic
├── r/ClaudeAI (Reddit)             https://reddit.com/r/ClaudeAI
├── Claude Community Events (Luma)   https://lu.ma/claude
└── Anthropic YouTube                https://youtube.com/@anthropic-ai
```

**Developer Tools & Integrations:**
```
├── Claude for VS Code           (Search VS Code extensions)
├── Claude for JetBrains         (Search JetBrains marketplace)
├── Cursor (Claude-powered IDE)  https://cursor.com
├── Cline (VS Code Extension)    https://github.com/cline/cline
├── Aider (Terminal AI Coding)   https://aider.chat
├── Continue.dev                 https://continue.dev
└── Anthropic SDK (Python)       pip install anthropic
    Anthropic SDK (TypeScript)   npm install @anthropic-ai/sdk
```

**Kenya-Specific Tech Resources:**
```
├── Kenya Developer Community    (local tech communities)
├── Swahilipot Hub Foundation   https://swahilipothub.co.ke
├── iHub Nairobi                https://ihub.co.ke
├── M-Pesa API (Daraja)         https://developer.safaricom.co.ke
├── Kenya Open Data              https://opendata.go.ke
└── KICTB (ICT Authority)       https://icta.go.ke
```

**AI Safety & Ethics (Anthropic's Mission):**
```
├── Anthropic's Core Views       https://www.anthropic.com/core-views
├── Claude's Constitution        https://www.anthropic.com/research/claudes-character
├── AI Safety Research           https://www.anthropic.com/research
├── Responsible Scaling Policy   https://www.anthropic.com/responsible-scaling-policy
└── Anthropic Careers            https://www.anthropic.com/careers
```

---

### PAGE: Projects (`/projects`)

#### Header
- `$ ls projects/ -la`
- "Built by the community, powered by Claude"

#### Project Cards Grid
Each project = terminal window card with:
- Project name
- Builder name + photo/avatar
- Description (2-3 lines)
- Tech stack tags
- Link to demo/repo (if available)
- "Built with Claude Code" badge

#### Hardcoded Projects:

1. **Mulinga Farm Management System**
   - Builder: Peter Kibet
   - Description: AI-powered production system managing 26,000+ coffee plants and poultry operations. Tracks plant health, harvest cycles, feed schedules, and financial reporting.
   - Stack: `Next.js` `TypeScript` `PostgreSQL` `Claude Code`
   - Status: `IN PRODUCTION`

2. **Community Discord Bot** (Coming Soon)
   - Builder: Claude Community Kenya
   - Description: A custom Discord bot for the community — event reminders, Claude tips, welcome automation.
   - Stack: `Node.js` `Discord.js` `Claude API`
   - Status: `IN DEVELOPMENT`

3. **Claude Community Kenya Website**
   - Builder: Peter Kibet
   - Description: This website! Built entirely with Claude Code using Next.js and the Terminal Noir design system.
   - Stack: `Next.js` `Tailwind CSS` `Framer Motion` `Claude Code`
   - Status: `LIVE`

4. **Your Project Here**
   - Builder: You?
   - Description: Built something with Claude? We want to showcase it. Submit your project at our next meetup or via Discord.
   - CTA: `> SUBMIT_PROJECT` button linking to Discord #projects channel

#### Submit a Project Section
- Simple terminal-styled form or Discord link
- "Share what you've built. Every project, big or small, inspires someone."

---

### PAGE: Join (`/join`)

The conversion page. Every path to joining the community.

#### Header
- `$ sudo join --community --force`
- "Ready to build? Here's how to get involved."

#### Three Tiers of Involvement:

**Tier 1: Join Online (Start Here)**
- Discord (PRIMARY) — Big card, green glow, most prominent
  - "Our home base. Daily discussions, help desk, project collaboration, job board."
  - Invite link button: `> JOIN_DISCORD`
- LinkedIn — Follow for professional updates and event announcements
- Twitter/X — Quick tips, event updates, tech news
- Instagram — Visual content, event photos, reels
- Facebook — Event announcements, community updates

**Tier 2: Attend an Event**
- "The best way to experience the community is in person."
- Featured upcoming event card
- Link to `/events`
- Luma calendar link: "Subscribe to our event calendar"

**Tier 3: Contribute**
- Speak at a meetup — "Have a Claude project or workflow to share? We'd love to feature you."
- Help organize — "We're looking for co-organizers, especially in Mombasa and other cities."
- Submit a project — "Built something with Claude? Get it featured on our showcase."
- Partner with us — "University, company, or venue? Let's collaborate."
- Contact: Discord DM to Peter or email

#### Newsletter Signup (Optional for v1)
- Simple email input
- "Get event notifications and community updates. No spam, ever."
- (Can be a placeholder that collects to a Google Form for now)

---

### PAGE: Blog (`/blog`)

#### Header
- `$ tail -f community.log`
- "Updates, recaps, and thoughts from the community"

#### Blog Post List
- Cards with: title, date, author, excerpt, reading time, tags
- Click → `/blog/[slug]`

#### Hardcoded Posts:

1. **"How Kenya's First Claude Code Meetup Happened"**
   - Date: February 1, 2026
   - Author: Peter Kibet
   - Tags: `meetup`, `nairobi`, `launch`
   - Content: The story of the January 25 meetup — planning, co-organizer no-shows, pivot to solo execution, attendees from major companies, key learnings, and what comes next. Write 800-1000 words that tell the authentic founding story.

2. **"What is Claude Code? A Kenyan Developer's Guide"**
   - Date: February 10, 2026
   - Author: Peter Kibet
   - Tags: `tutorial`, `claude-code`, `getting-started`
   - Content: Beginner-friendly introduction to Claude Code from a Kenyan developer perspective. Why it matters for the local tech scene. 600-800 words.

3. **"We're Official: Joining the Claude Community Ambassadors Program"**
   - Date: February 14, 2026
   - Author: Peter Kibet
   - Tags: `announcement`, `anthropic`, `ambassador`
   - Content: Announcement of being selected for Anthropic's founding Ambassador cohort. What it means for the community — official backing, resources, global network. 500-700 words.

#### Individual Blog Post Page (`/blog/[slug]`)
- Terminal-styled article layout
- Title, date, author, reading time
- Full content with proper typography
- Tags at bottom
- "Share this post" — Twitter, LinkedIn, copy link
- "← Back to Blog" navigation
- Related posts suggestion

---

### PAGE: Ambassador Program (`/ambassador`)

#### Header
- `$ cat ambassador-program.md`
- "Claude Community Ambassadors — Founding Cohort"

#### Content:
- Explain that Claude Community Kenya is part of Anthropic's official Claude Community Ambassadors program
- What the program provides:
  - Event sponsorship and resources
  - Custom content for events
  - Private Slack with Anthropic employees and global ambassadors
  - Weekly calls with Anthropic team
  - $100/month in Claude API credits
  - Recognition as an official Ambassador
  - Eligibility for product feedback (Builders Council)
  - Invitations to official Anthropic events
- What ambassadors do:
  - Organize at least 1 Claude Community event every 3 months
  - Lead local Claude Community spaces
  - Advocate for Claude in developer communities
  - Provide product feedback
- "We're proud to be the first Ambassador community in East Africa."
- Link to Anthropic's program page (if public): community@anthropic.com
- Note: "Interested in becoming an Ambassador? The program is global and actively prioritizes geographic diversity. Contact us for guidance on applying."

---

### PAGE: Code of Conduct (`/code-of-conduct`)

#### Header
- `$ cat CODE_OF_CONDUCT.md`

#### Content (write as complete document):

```markdown
# Claude Community Kenya — Code of Conduct

## Our Pledge

Claude Community Kenya is committed to providing a welcoming, safe, and
inclusive environment for everyone, regardless of age, body size, disability,
ethnicity, gender identity, level of experience, nationality, personal
appearance, race, religion, or sexual identity and orientation.

## Expected Behavior

- Be respectful and considerate in all interactions
- Welcome newcomers and help them feel included
- Share knowledge freely and constructively
- Give credit where credit is due
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community

## Unacceptable Behavior

- Harassment, intimidation, or discrimination of any kind
- Trolling, insulting/derogatory comments, or personal attacks
- Publishing others' private information without consent
- Spam, excessive self-promotion, or off-topic content
- Sharing API keys, credentials, or sensitive information
- Any conduct that would be inappropriate in a professional setting

## Reporting

If you experience or witness unacceptable behavior:
- Discord: DM an @Organizer
- Email: [community email]
- All reports are confidential

## Enforcement

Community organizers will take appropriate action in response to
violations, including warnings, temporary bans, or permanent removal
from community spaces and events.

## Scope

This code of conduct applies to all Claude Community Kenya spaces,
including Discord, events, social media, and any other community forums.

## Attribution

This Code of Conduct is adapted from the Contributor Covenant
(https://www.contributor-covenant.org).
```

---

### PAGE: FAQ (`/faq`)

#### Header
- `$ claude --help`
- "Frequently Asked Questions"

#### FAQ Items (collapsible, terminal-styled):

**General:**
1. What is Claude Community Kenya?
   → East Africa's first and official Claude developer community, part of Anthropic's Claude Community Ambassadors program. We host events, workshops, and build together.

2. Is it free to join?
   → Yes! The community is completely free. Events are free. Discord is free. Just show up and start building.

3. Do I need to be a professional developer?
   → Not at all. We welcome everyone from complete beginners to senior engineers. Students, hobbyists, and curious minds are all welcome.

4. What cities do you operate in?
   → Currently Nairobi and Mombasa, with plans to expand to other Kenyan cities.

5. How is this related to Anthropic?
   → We're an independent community officially supported by Anthropic through their Claude Community Ambassadors program. We receive event sponsorship, resources, and direct collaboration with Anthropic's team.

**Events:**
6. How often do you host events?
   → At least monthly. We aim for 1-2 events per month across Nairobi and Mombasa.

7. Where can I find upcoming events?
   → Check our Events page, Discord #announcements channel, or follow us on social media.

8. Can I speak at an event?
   → Yes! We love community speakers. Reach out on Discord or talk to an organizer at any event.

9. Can my company/university host an event?
   → Absolutely. We're always looking for venue partners. Contact us via Discord or email.

**Technical:**
10. What is Claude Code?
    → Claude Code is Anthropic's command-line AI coding assistant. It works in your terminal and can read, write, and edit code in your projects. See our Resources page for a full guide.

11. Is Claude Code free?
    → Claude Code requires a Claude Pro subscription ($20/month) or API access. The chat interface at claude.ai has a free tier.

12. What programming languages does Claude support?
    → Claude works with virtually all programming languages — Python, JavaScript/TypeScript, Java, Rust, Go, C++, Ruby, PHP, and many more.

13. Can I use Claude for my university projects?
    → Yes, but be transparent about AI assistance per your institution's academic integrity policies. We encourage using Claude as a learning tool, not a shortcut.

---

### Global Components

#### Navigation (present on all pages)
Desktop:
```
[logo] Claude Community Kenya    Home  Events  Resources  Projects  Blog  About  Join
```
- Logo: Stylized terminal prompt or ASCII art "CCK"
- Active page highlighted with green underline
- "Join" button styled as primary CTA: `> JOIN`

Mobile:
- Hamburger icon (three horizontal lines, terminal-green)
- Opens full-screen terminal-styled overlay menu
- Each link styled as a command: `> HOME`, `> EVENTS`, etc.

#### Footer (present on all pages)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Claude Community Kenya                                 │
│  East Africa's First Claude Developer Community         │
│                                                         │
│  Quick Links          Community        Resources        │
│  > Home               > Discord        > Getting Started│
│  > Events             > LinkedIn       > Claude Code    │
│  > Projects           > Twitter/X      > Workflows      │
│  > Blog               > Instagram      > Links          │
│  > About              > Facebook       > FAQ            │
│                                                         │
│  Contact                                                │
│  > claudecommunitykenya@gmail.com                       │
│  > Discord (fastest response)                           │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  © 2026 Claude Community Kenya                          │
│  Built with ❤️ and Claude Code                          │
│  Part of the Claude Community Ambassadors Program       │
│                                                         │
│  $ exit                                                 │
│  > Thanks for visiting. Go build something amazing. 🇰🇪 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### SEO & Meta (every page)
```html
<title>{Page Title} | Claude Community Kenya</title>
<meta name="description" content="{page-specific description}" />
<meta property="og:title" content="{Page Title} | Claude Community Kenya" />
<meta property="og:description" content="{page-specific description}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://claudecommunitykenya.com{path}" />
<meta property="og:image" content="/og-image.png" /> <!-- Create a branded OG image -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@ClaudeKenya" />
<link rel="canonical" href="https://claudecommunitykenya.com{path}" />
```

---

## Easter Eggs (Implement These!)

1. **Konami Code** (↑↑↓↓←→←→BA) — Triggers a full-screen matrix rain animation with a hidden message: "You found the secret. Real builders dig deeper. 🇰🇪"

2. **Command Palette** (`Ctrl+K` or `/` anywhere) — Opens a spotlight search that lets you navigate to any page or section. Styled as a terminal input.

3. **Console Welcome** — When opening DevTools, `console.log` displays:
```
╔═══════════════════════════════════════════════╗
║                                               ║
║   🇰🇪 Claude Community Kenya                  ║
║   Welcome, fellow developer!                  ║
║                                               ║
║   Like what you see? This site was built      ║
║   entirely with Claude Code.                  ║
║                                               ║
║   Join us: discord.gg/[invite]                ║
║   Contribute: github.com/[repo]              ║
║                                               ║
╚═══════════════════════════════════════════════╝
```

4. **404 Page** — Custom 404 styled as:
```
$ cd /requested-page
bash: /requested-page: No such file or directory

ERROR 404: Page not found.

Looks like this route doesn't exist.
Maybe try one of these:

> HOME
> EVENTS
> RESOURCES

Or report this bug on Discord.
```

5. **`$ exit` Footer Easter Egg** — Hovering over `$ exit` in the footer shows: "You can check out any time you like, but you can never leave. 🎸" (subtle Eagles reference for the devs who get it)

6. **Loading State** — Between page transitions, show a brief terminal loading animation:
```
Loading /events... [████████████░░░░░░░░] 60%
```

---

## Accessibility Requirements

- All interactive elements keyboard navigable
- Proper ARIA labels on all custom components
- `prefers-reduced-motion` respected — disable matrix rain, typing animations, glitch effects
- Color contrast meets WCAG AA (the green-on-black needs careful testing)
- Skip navigation link
- Semantic HTML throughout
- Alt text for any images (when added later)
- Focus indicators visible (green outline)

## Performance Requirements

- Target 90+ Lighthouse score on all pages
- Lazy load below-fold content
- Optimize fonts (subset JetBrains Mono and IBM Plex Sans)
- Use Next.js Image component when images are added
- Static generation (SSG) for all pages — no server-side rendering needed
- Minimize JavaScript bundle — use CSS for animations where possible

## File Structure

```
claude-community-kenya/
├── app/
│   ├── layout.tsx                  # Root layout with nav, footer, fonts
│   ├── page.tsx                    # Home page
│   ├── about/
│   │   └── page.tsx
│   ├── events/
│   │   ├── page.tsx                # Events listing
│   │   └── [slug]/
│   │       └── page.tsx            # Individual event
│   ├── resources/
│   │   ├── page.tsx                # Resources hub
│   │   ├── getting-started/
│   │   │   └── page.tsx
│   │   ├── claude-code/
│   │   │   └── page.tsx
│   │   ├── workflows/
│   │   │   └── page.tsx
│   │   └── links/
│   │       └── page.tsx
│   ├── projects/
│   │   └── page.tsx
│   ├── join/
│   │   └── page.tsx
│   ├── blog/
│   │   ├── page.tsx                # Blog listing
│   │   └── [slug]/
│   │       └── page.tsx            # Individual post
│   ├── ambassador/
│   │   └── page.tsx
│   ├── code-of-conduct/
│   │   └── page.tsx
│   ├── faq/
│   │   └── page.tsx
│   └── not-found.tsx               # Custom 404
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── MobileMenu.tsx
│   │   └── PageTransition.tsx
│   ├── terminal/
│   │   ├── TerminalWindow.tsx      # Reusable terminal card
│   │   ├── TypingAnimation.tsx     # Typing effect component
│   │   ├── MatrixRain.tsx          # Background effect
│   │   ├── CommandPalette.tsx      # Ctrl+K search
│   │   ├── GlitchText.tsx         # Glitch hover effect
│   │   └── LoadingBar.tsx         # Page load progress
│   ├── ui/
│   │   ├── Button.tsx             # Terminal-styled buttons
│   │   ├── Card.tsx               # Base card component
│   │   ├── Badge.tsx              # Status badges
│   │   ├── CountUp.tsx            # Animated number counter
│   │   ├── Accordion.tsx          # FAQ collapsible
│   │   └── Timeline.tsx           # Git-log timeline
│   └── sections/
│       ├── HeroTerminal.tsx       # Home hero
│       ├── StatsBar.tsx           # Animated stats
│       ├── EventCard.tsx          # Event display card
│       ├── ProjectCard.tsx        # Project showcase card
│       ├── BlogPostCard.tsx       # Blog listing card
│       └── JoinCTA.tsx            # Join community CTA
├── data/
│   ├── events.ts                  # All event data
│   ├── projects.ts                # All project data
│   ├── blog-posts.ts             # All blog post content
│   ├── resources.ts              # Resource links data
│   ├── faq.ts                    # FAQ data
│   └── team.ts                   # Team member data
├── lib/
│   ├── constants.ts              # Site-wide constants, URLs, etc.
│   └── utils.ts                  # Utility functions
├── styles/
│   ├── globals.css               # Global styles + CSS variables + terminal effects
│   ├── scanlines.css             # Scanline overlay
│   └── glitch.css                # Glitch animation keyframes
├── public/
│   ├── og-image.png              # OpenGraph image (create branded one)
│   ├── favicon.ico
│   └── fonts/                    # Self-hosted fonts (optional, can use Google Fonts)
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── CLAUDE.md                     # Project context for Claude Code
```

## CLAUDE.md for This Project

Create this file at the project root so Claude Code understands the project:

```markdown
# Claude Community Kenya Website

## Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- Google Fonts: JetBrains Mono, IBM Plex Sans
- Lucide React for icons
- Deployed on Vercel

## Design System
- "Terminal Noir" aesthetic — hacker/terminal theme
- Color tokens defined in globals.css and tailwind.config.ts
- All components use terminal window styling
- Animations respect prefers-reduced-motion

## Conventions
- Use TypeScript strict mode
- Functional components with hooks
- Co-locate component styles with Tailwind classes
- Data files in /data directory (static content, no CMS yet)
- All pages use static generation (SSG)

## Content
- Event data in /data/events.ts
- Blog posts in /data/blog-posts.ts
- All content is hardcoded for v1

## Important
- Terminal effects (matrix rain, typing) must be performant
- Accessibility is non-negotiable — WCAG AA minimum
- Mobile-first responsive design
- Every page needs proper SEO meta tags
```

---

## Summary of Deliverables

When this prompt is complete, the project should have:
- 14 fully designed and functional pages/routes
- Reusable terminal-themed component library
- Full responsive design (mobile-first)
- Page transitions and scroll animations
- Easter eggs (Konami, command palette, console message, 404)
- Comprehensive SEO
- Accessible and performant
- Production-ready for Vercel deployment
- All real community content (events, projects, blog posts, resources)
- Complete resource library with all Claude/Anthropic links
