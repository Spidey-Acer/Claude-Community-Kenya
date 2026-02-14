# PHASE 3: Content Pages & Features
## Claude Community Kenya — Next.js Website Build

**Role:** Page Developer
**Estimated Scope:** All customer-facing pages, content architecture, individual detail pages
**Dependency:** Phase 1 (Foundation) must be complete; Phase 2 (Terminal Components) can run in parallel

---

## Objective

Build all 14 pages/routes with full content, terminal styling, and interactive features. Pages should be visually stunning, fully responsive, and leverage all components from Phase 1 & 2.

---

## Pages to Build (Priority Order)

---

## 1. HOME PAGE (`/`)

### Hero Section
- Full viewport height
- Background: MatrixRain effect (subtle)
- Centered animated TerminalWindow with typing sequence:
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
- Use TypingAnimation for sequential reveal
- `[CLICK TO JOIN DISCORD]` is a clickable link
- Below terminal: Tagline: "East Africa's First Claude Developer Community | Backed by Anthropic"
- Two CTA buttons below: `> JOIN_DISCORD` (primary, green) and `> VIEW_EVENTS` (secondary, amber)

### Stats Bar (scroll-triggered)
- Horizontal bar with animated count-up numbers
- 4 stats in mini terminal cards:
  - `50+` Members
  - `2` Cities
  - `3` Events Hosted
  - `1` Ambassador Program (Founding Cohort)
- Use ScrollReveal + CountUp components
- Numbers count from 0 when scrolled into view

### Featured Events Section
- Header: `## Upcoming Events` styled as `$ ls events/ --upcoming`
- Display 2-3 upcoming events pulled from `/data/events.ts`
- Each card uses EventCard component (from Phase 3 components)
- CTA: "View All Events →" links to `/events`

### What We Do Section
- Header: `$ man claude-community-kenya`
- 4-column grid of pillar cards (TerminalWindow style):
  1. **Meetups** — Icon: Terminal. "Monthly in-person events across Kenya. Live demos, lightning talks, networking."
  2. **Workshops** — Icon: Code. "Hands-on Claude Code sessions. Multi-instance development, agentic patterns, real projects."
  3. **Career Talks** — Icon: GraduationCap. "University partnerships bringing AI education to the next generation of builders."
  4. **Online Community** — Icon: MessageSquare. "Discord server with 24/7 discussions, help desk, project collaboration, job board."
- Responsive: 4 cols desktop → 2 cols tablet → 1 col mobile
- Use ScrollReveal with stagger for entrance

### Community Showcase Preview
- Header: `$ ls projects/ --featured`
- Display 3 featured projects
- Each uses ProjectCard component
- CTA: "View All Projects →" links to `/projects`

### Join CTA Section
- Full-width terminal-styled section
- Header: `$ sudo join --community`
- Three pathway cards:
  1. **Discord** (PRIMARY — largest, most prominent, green glow)
  2. **Attend an Event** (secondary)
  3. **Follow on Social Media** (tertiary)
- Background: subtle matrix rain or green gradient overlay
- Responsive layout

### Partners Bar
- "Supported by" section
- Text-only mentions: Anthropic, iHiT Events Space, Swahilipot Hub Foundation, Technical University of Mombasa
- Minimal, elegant, single row
- Responsive: might stack on mobile

**File:** `/app/page.tsx`

---

## 2. ABOUT PAGE (`/about`)

### Hero Section
- Header: `$ cat README.md`
- Subheader: "The story of East Africa's first Claude developer community"

### Our Story Section
- Multi-paragraph narrative (not bullet points)
- Highlight: Kenya's first Claude Code meetup
- Real projects: Farm management system (26,000+ coffee plants)
- Tone: authentic, inspiring

### Our Mission Section
- TerminalWindow with:
  ```
  MISSION: To build East Africa's most vibrant, inclusive, and impactful
  AI developer community — one meetup, one project, one builder at a time.

  VISION: A Kenya where every developer has the skills, community, and
  opportunity to build world-class AI-powered products.

  VALUES:
    --build-in-public    We learn by shipping, not just studying
    --radical-inclusion   No gatekeeping. Every skill level welcome.
    --african-innovation  We solve African problems with African ingenuity
    --community-first     We grow together or not at all
  ```

### The Team Section
- Grid of terminal-styled team member cards
- 4 team members with photos/avatars, roles, bios, social links
- Members from `/data/team.ts`:
  1. Peter Kibet — Founder & Lead Organizer
  2. Edwin Lungatso — Co-Organizer (Nairobi)
  3. Dr. Fullgence Mwakondo — Academic Partner (Mombasa)
  4. Joshua Wekesa — Community Partner (Mombasa)
- CTA: "Want to join the team?" links to Discord

### Timeline / Milestones Section
- Vertical timeline styled as git log
- Shows key community milestones:
  - Jan 25, 2026: Kenya's First Claude Code Meetup
  - Jan 2026: Claude Community Ambassadors invitation
  - Feb 11, 2026: Official Ambassador program application
  - Feb 20, 2026: Nairobi Meetup #2 [UPCOMING]
  - Feb 28, 2026: First university event [UPCOMING]
- Use Timeline component
- Responsive: vertical on desktop, horizontal scroll on mobile

**File:** `/app/about/page.tsx`

---

## 3. EVENTS PAGE (`/events`)

### Header & Filters
- `$ ls events/ -la --sort=date`
- Filter tabs (horizontal, mobile-friendly):
  - `All` (default)
  - `Upcoming`
  - `Past`
  - `Nairobi`
  - `Mombasa`
- Active filter highlighted in green
- Filter state managed in component state (not URL for v1)

### Event Cards Grid
- Responsive grid: 3 cols desktop → 2 cols tablet → 1 col mobile
- Each EventCard component displays:
  - Status badge (UPCOMING/REGISTRATION OPEN/COMPLETED/SOLD OUT)
  - Event title (bold, large)
  - Date + Time
  - Location (City + Venue)
  - Brief description (2 lines max)
  - Tags: meetup, workshop, career-talk, hackathon
  - CTA button: "Register →" or "View Recap →"
  - Click → navigates to `/events/[slug]`

### Event Data (hardcoded in `/data/events.ts`)
**Upcoming:**
1. Nairobi Meetup #2 (Feb 20, 2026)
2. TU Mombasa Career Talk (Feb 28, 2026)

**Past:**
1. Kenya's First Claude Code Meetup (Jan 25, 2026)

**File:** `/app/events/page.tsx`

---

## 4. INDIVIDUAL EVENT PAGE (`/events/[slug]`)

Dynamic route for each event. Displays:
- Event header: status badge, title, date, time, venue
- Event image/hero (placeholder for now)
- Full description
- Full agenda timeline (use Timeline component)
- Speaker/host cards (if applicable)
- Location map (use static map image or embed - placeholder for v1)
- Registration CTA (if upcoming): big green button linking to registration URL
- Photo gallery (if past) - placeholder
- Share buttons: Copy link, Twitter, LinkedIn
- "Back to Events" navigation

**Files:** `/app/events/[slug]/page.tsx`

---

## 5. RESOURCES HUB (`/resources`)

### Header
- `$ man claude --resources`
- Subheader: "Everything you need to start building with Claude"

### Category Navigation Cards
- Grid of 4 large terminal-styled cards:
  1. **Getting Started** → `/resources/getting-started`
  2. **Claude Code** → `/resources/claude-code`
  3. **Advanced Workflows** → `/resources/workflows`
  4. **Curated Links** → `/resources/links`
- Each card: title, brief description, icon, clickable
- Hover: lift and glow effect

**File:** `/app/resources/page.tsx`

---

## 6. SUB-PAGE: Getting Started (`/resources/getting-started`)

Terminal-styled tutorial for beginners.

Content sections:
1. **What is Claude?** — Explanation of Claude AI
2. **Claude Products Overview**
   - Claude.ai (web/mobile)
   - Claude Code (CLI)
   - Claude API
   - Claude for Enterprise
3. **How to Get Started (5 Steps)**
4. **Pricing Overview** (keep updated)
5. Back navigation to `/resources`

**File:** `/app/resources/getting-started/page.tsx`

---

## 7. SUB-PAGE: Claude Code Resources (`/resources/claude-code`)

Definitive Claude Code guide for Kenyan developers.

Content sections:
1. **What is Claude Code?**
2. **Installation Guide** (code snippet)
3. **Essential Commands Quick Reference** (code block with commands)
4. **Setting Up CLAUDE.md** (example)
5. **Multi-Instance Development** (example with 3 terminals)
6. **Resources** (links to official docs)
7. Back navigation

**File:** `/app/resources/claude-code/page.tsx`

---

## 8. SUB-PAGE: Advanced Workflows (`/resources/workflows`)

For experienced developers.

Content sections:
1. **Agentic Development Patterns** (explanation)
2. **Plan Mode** (example usage)
3. **Git Worktree Strategy** (code example)
4. **Building Production Systems with Claude** (real example: Mulinga)
5. Back navigation

**File:** `/app/resources/workflows/page.tsx`

---

## 9. SUB-PAGE: Curated Links (`/resources/links`)

Comprehensive link directory as terminal tree structure.

Categories:
- Official Anthropic Resources
- Learning & Tutorials
- Community & Social
- Developer Tools & Integrations
- Kenya-Specific Tech Resources
- AI Safety & Ethics

Display as terminal file tree:
```
├── Claude.ai                    https://claude.ai
├── Anthropic API Docs           https://docs.anthropic.com
├── Claude Code Docs             https://docs.anthropic.com/...
└── ...
```

All links are clickable and styled in cyan.

**File:** `/app/resources/links/page.tsx`

---

## 10. PROJECTS PAGE (`/projects`)

### Header
- `$ ls projects/ -la`
- Subheader: "Built by the community, powered by Claude"

### Project Cards Grid
- Responsive grid
- Each ProjectCard displays:
  - Project name
  - Builder name + avatar
  - Description (2-3 lines)
  - Tech stack tags
  - Status badge (IN PRODUCTION/IN DEVELOPMENT/LIVE)
  - Link to demo/repo (if available)
  - "Built with Claude Code" badge

### Featured Projects (hardcoded in `/data/projects.ts`)
1. Mulinga Farm Management System (Peter Kibet)
2. Community Discord Bot (Coming Soon)
3. Claude Community Kenya Website (Peter Kibet)
4. Your Project Here (CTA to submit)

### Submit Project Section
- Simple CTA: "Share what you've built. Every project, big or small, inspires someone."
- Button: `> SUBMIT_PROJECT` linking to Discord #projects channel

**File:** `/app/projects/page.tsx`

---

## 11. JOIN PAGE (`/join`)

Conversion-focused page with all ways to get involved.

### Header
- `$ sudo join --community --force`
- Subheader: "Ready to build? Here's how to get involved."

### Tier 1: Join Online (Start Here)
- **Discord** (PRIMARY) — Big green card with glow
  - "Our home base. Daily discussions, help desk, project collaboration, job board."
  - Button: `> JOIN_DISCORD`
- **LinkedIn** — Follow for updates
- **Twitter/X** — Quick tips and news
- **Instagram** — Visual content
- **Facebook** — Announcements

### Tier 2: Attend an Event
- "The best way to experience the community is in person."
- Featured upcoming event card
- Button: `> VIEW_EVENTS` → `/events`
- "Subscribe to our event calendar" link to Luma

### Tier 3: Contribute
- **Speak at a Meetup** — "Have a Claude project to share? We'd love to feature you."
- **Help Organize** — "We're looking for co-organizers, especially in Mombasa."
- **Submit a Project** — "Built something with Claude? Get it featured."
- **Partner with Us** — "University, company, or venue? Let's collaborate."
- Contact: Discord or email

### Newsletter Signup (Optional for v1)
- Simple email input
- "Get event notifications and community updates. No spam, ever."
- Can submit to Google Form placeholder

**File:** `/app/join/page.tsx`

---

## 12. BLOG PAGE (`/blog`)

### Header
- `$ tail -f community.log`
- Subheader: "Updates, recaps, and thoughts from the community"

### Blog Post List
- Cards with: title, date, author, excerpt, reading time, tags
- Responsive grid
- Click → `/blog/[slug]`
- Sort by date (newest first)

### Hardcoded Blog Posts (in `/data/blog-posts.ts`)
1. **"How Kenya's First Claude Code Meetup Happened"** (Feb 1, 2026)
2. **"What is Claude Code? A Kenyan Developer's Guide"** (Feb 10, 2026)
3. **"We're Official: Joining the Claude Community Ambassadors Program"** (Feb 14, 2026)

**File:** `/app/blog/page.tsx`

---

## 13. INDIVIDUAL BLOG POST PAGE (`/blog/[slug]`)

Dynamic route for each blog post.

Display:
- Terminal-styled article layout
- Title, date, author, reading time
- Full article content (markdown-like formatting)
- Tags at bottom
- Share buttons: Twitter, LinkedIn, Copy link
- "← Back to Blog" navigation
- Related posts suggestions (next 2 posts)

**File:** `/app/blog/[slug]/page.tsx`

---

## 14. AMBASSADOR PROGRAM PAGE (`/ambassador`)

### Header
- `$ cat ambassador-program.md`
- Subheader: "Claude Community Ambassadors — Founding Cohort"

### Content
- What is the program?
- What it provides to ambassadors (sponsorship, resources, Slack, calls, credits, recognition)
- What ambassadors do (organize events, lead communities, advocate, provide feedback)
- Pride statement: "We're proud to be the first Ambassador community in East Africa."
- Link to Anthropic program info: community@anthropic.com
- Note about global program and applications

**File:** `/app/ambassador/page.tsx`

---

## 15. CODE OF CONDUCT PAGE (`/code-of-conduct`)

### Header
- `$ cat CODE_OF_CONDUCT.md`

### Content
Full Code of Conduct document in terminal-styled formatting:
- Our Pledge
- Expected Behavior
- Unacceptable Behavior
- Reporting (Discord DM, Email)
- Enforcement
- Scope
- Attribution (Contributor Covenant)

**File:** `/app/code-of-conduct/page.tsx`

---

## 16. FAQ PAGE (`/faq`)

### Header
- `$ claude --help`
- Subheader: "Frequently Asked Questions"

### FAQ Items (Collapsible Accordion)
- General section (5 FAQs)
- Events section (4 FAQs)
- Technical section (4 FAQs)
- Use Accordion component from Phase 1
- Each item expandable with smooth animation

Pull from `/data/faq.ts`

**File:** `/app/faq/page.tsx`

---

## 17. CUSTOM 404 PAGE (`/app/not-found.tsx`)

Terminal-styled 404 page:
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

Clickable navigation links in 404.

---

## Additional Sub-Components for Pages

### `/components/sections/EventCard.tsx`
Display individual event in grid (used on `/events` and `/`)

### `/components/sections/ProjectCard.tsx`
Display individual project in grid (used on `/projects`)

### `/components/sections/BlogPostCard.tsx`
Display individual blog post in list (used on `/blog`)

### `/components/sections/TeamMemberCard.tsx`
Display team member (used on `/about`)

### `/components/sections/HeroTerminal.tsx`
Typing terminal sequence for home hero (reusable)

### `/components/sections/StatsBar.tsx`
Animated stats section (used on home)

---

## SEO & Meta Tags

Every page includes:
```html
<title>{Page Title} | Claude Community Kenya</title>
<meta name="description" content="{page-specific description}" />
<meta property="og:title" content="{Page Title} | Claude Community Kenya" />
<meta property="og:description" content="{page-specific description}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://claudecommunitykenya.com{path}" />
<meta property="og:image" content="/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@ClaudeKenya" />
<link rel="canonical" href="https://claudecommunitykenya.com{path}" />
```

---

## Responsive Design

- **Desktop (1200px+):** Full layouts, 3-4 column grids
- **Tablet (768px-1199px):** 2 column grids, adjusted spacing
- **Mobile (< 768px):** 1 column stacks, hamburger menu, larger touch targets

All components must test responsively.

---

## File Structure Created

```
app/
├── page.tsx                           # Home
├── not-found.tsx                      # Custom 404
├── about/
│   └── page.tsx
├── events/
│   ├── page.tsx
│   └── [slug]/
│       └── page.tsx
├── resources/
│   ├── page.tsx
│   ├── getting-started/
│   │   └── page.tsx
│   ├── claude-code/
│   │   └── page.tsx
│   ├── workflows/
│   │   └── page.tsx
│   └── links/
│       └── page.tsx
├── projects/
│   └── page.tsx
├── join/
│   └── page.tsx
├── blog/
│   ├── page.tsx
│   └── [slug]/
│       └── page.tsx
├── ambassador/
│   └── page.tsx
├── code-of-conduct/
│   └── page.tsx
└── faq/
    └── page.tsx

components/sections/
├── EventCard.tsx
├── ProjectCard.tsx
├── BlogPostCard.tsx
├── TeamMemberCard.tsx
├── HeroTerminal.tsx
└── StatsBar.tsx
```

---

## Testing Checklist

- [ ] All pages load without errors
- [ ] Navigation works across all pages
- [ ] Responsive design on mobile, tablet, desktop
- [ ] All links are functional
- [ ] Dynamic routes ([slug]) work correctly
- [ ] SEO meta tags present on all pages
- [ ] Keyboard navigation works
- [ ] Images/icons load correctly
- [ ] Forms (if any) submit properly
- [ ] Lighthouse score 90+ on all pages

---

## Success Criteria

- All 14 pages + dynamic routes built and fully functional
- Terminal aesthetic consistent across all pages
- All content from original prompt included
- Responsive on all device sizes
- SEO-optimized
- Keyboard accessible
- Fast load times
