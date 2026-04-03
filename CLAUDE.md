# Claude Community Kenya
East Africa's first Claude developer community. Live at **claudekenya.org**.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16, App Router, TypeScript strict |
| Styling | Tailwind CSS v4 (`@theme` blocks) + CSS variables |
| Motion | Framer Motion |
| Database | PostgreSQL via Prisma 7 (17 models) |
| Auth | NextAuth v5 (credentials) |
| Storage | Supabase Storage (uploads, avatars) |
| Rate Limiting | Upstash Redis |
| Email | Resend |
| Icons | Lucide React |
| Fonts | JetBrains Mono (headings/code) + IBM Plex Sans (body) via `next/font` |
| Deploy | Vercel |

## Design System: Terminal Noir

Colors defined as CSS custom properties in `src/app/globals.css`, registered as Tailwind theme tokens in the `@theme inline` block.

- **Backgrounds:** `--bg-primary` (#0a0a0a), `--bg-secondary`, `--bg-card`, `--bg-elevated`
- **Green (primary):** `--green-primary` (#00ff41), `--green-dim`, `--green-muted`
- **Accents:** `--amber` (#ffb000), `--red` (#ff3333), `--cyan` (#00d4ff)
- **Text:** `--text-primary`, `--text-secondary`, `--text-dim`

**Persona system** switches between Dev mode (terminal aesthetic) and Pro mode (glassmorphism + Anthropic brand). Toggle lives in the navbar. Context in `src/components/persona/`.

## Architecture

```
src/
├── app/                          # 25+ public pages, 15 admin pages, 42 API routes
│   ├── page.tsx                  # Home (HeroTerminal + StatsBar + content sections)
│   ├── about/                    # About with timeline
│   ├── events/                   # Listing + [slug] detail + demo request forms
│   ├── blog/                     # Listing + [slug] detail (DB-backed)
│   ├── projects/                 # Project showcase
│   ├── community/                # Community Hub: MCP/Prompt/Workflow/Tool submissions
│   │   ├── [slug]/               # Detail page with comments + upvotes
│   │   └── submit/               # Submission form
│   ├── resources/                # Resource hub with 7 sub-pages
│   │   ├── getting-started/      # Beginner guide
│   │   ├── claude-code/          # Claude Code tutorial
│   │   ├── workflows/            # Workflow patterns
│   │   ├── courses/              # Anthropic courses learning paths
│   │   ├── api-guide/            # API usage guide
│   │   ├── production-guide/     # Production best practices
│   │   └── links/                # Curated links directory
│   ├── join/                     # Terminal-themed application form
│   ├── speak/                    # Speaker application
│   ├── volunteer/                # Volunteer application
│   ├── submit-idea/              # Idea submission
│   ├── submit-project/           # Project submission
│   ├── faq/                      # FAQ with accordions + floating Discord CTA
│   ├── ambassador/               # Ambassador program
│   ├── code-of-conduct/
│   ├── admin/                    # Full CRUD admin panel (auth-protected)
│   │   ├── applications/         # Join applications management
│   │   ├── blog/                 # Blog CRUD (new, edit, list)
│   │   ├── community/            # Community submissions moderation
│   │   ├── contact/              # Contact messages
│   │   ├── demos/                # Demo requests
│   │   ├── events/               # Event CRUD (new, edit, list)
│   │   ├── ideas/                # Idea submissions
│   │   ├── speakers/             # Speaker applications
│   │   ├── volunteers/           # Volunteer applications
│   │   ├── settings/             # Site settings, stats, user management
│   │   └── login/                # Admin login
│   ├── api/                      # 42 API routes (admin + public)
│   ├── robots.ts                 # SEO: robots.txt generation
│   ├── sitemap.ts                # SEO: sitemap.xml generation
│   ├── opengraph-image.tsx       # Dynamic OG image
│   └── not-found.tsx             # 404
│
├── components/
│   ├── layout/                   # Navbar, Footer, MobileMenu, PageTransition, ConditionalLayout
│   ├── sections/                 # HeroTerminal, HeroPro, StatsBar, StatsBarPro, EventCard,
│   │                             # ProjectCard, BlogPostCard, TeamMemberCard, TestimonialsCarousel,
│   │                             # CommunityResourceCard, HomeContent
│   ├── terminal/                 # TerminalWindow, MatrixRain, CommandPalette, GlitchText,
│   │                             # TypingAnimation, CRTGlow, ScrollReveal, LoadingBar,
│   │                             # TerminalApplication (1356 lines — needs refactor)
│   ├── persona/                  # PersonaToggle, PersonaHeading, PersonaText, PersonaSelectorModal,
│   │                             # ParticleCanvas, ProWrappers
│   ├── community/                # CommentForm, CommentList, CopyButton, UpvoteButton
│   ├── admin/                    # AdminHeader, AdminSidebar, StatusBadge, ReviewForm, etc.
│   ├── schema/                   # BreadcrumbSchema (structured data)
│   └── ui/                       # Button, Card, Badge, CountUp, Accordion, Timeline, MediaFrame
│
├── data/                         # Static TypeScript data (events, blog, projects, resources, team, faq, persona-content)
├── lib/                          # Utilities: prisma, constants, utils, csrf, rate-limit, rbac,
│                                 # audit-log, email, supabase, data-access, input-sanitization
└── styles/
    ├── glitch.css                # Glitch text animations
    └── terminal-effects.css      # Terminal CRT/scanline effects
```

## Database (17 Prisma models)

User, Event, BlogPost, Project, JoinApplication, SpeakerApplication, VolunteerApplication, DemoRequest, IdeaSubmission, ContactMessage, NewsletterSubscriber, CommunitySubmission, CommunityComment, CommunityUpvote, SiteSettings, TeamMember, AuditLog

## Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # prisma generate + next build — must pass clean
npx tsc --noEmit         # Type check — must pass clean
npm run db:migrate       # Prisma migrations
npm run db:studio        # Prisma Studio GUI
npm run db:seed          # Seed database
```

## Conventions

- `"use client"` only when needed (state, effects, event handlers)
- Import paths use `@/` alias → `./src/`
- Conventional commits: `type(scope): description`
- All CSS via Tailwind utilities + CSS variables — no inline styles
- Accessibility: ARIA labels, keyboard nav, semantic HTML, `prefers-reduced-motion`
- Verify with `npm run build && npx tsc --noEmit` before committing

## Content Rules

- Do NOT fabricate URLs — only real, publicly accessible links
- Do NOT inflate stats — keep numbers accurate
- Do NOT include personal information about individuals

## Critical Links

| Purpose | URL |
|---------|-----|
| Website | https://www.claudekenya.org |
| Discord | https://discord.gg/CkD9QWjsHm |
| WhatsApp | https://chat.whatsapp.com/Hpx42q1ADsrFNN3hHtZcQa |
| Nairobi Events (Luma) | https://luma.com/sbsa789m |
| Mombasa Events (Luma) | https://luma.com/vsf5re14 |
| Global Claude Community | https://luma.com/claudecommunity |

## Key Facts

- First meetup: **January 24, 2026** — iHiT Events Space, Westlands, Nairobi
- Attendees at first meetup: **30+**
- First meetup: Community gathering + networking, Peter Kibet demoed Claude Code workflow
- Events hosted: **2** (Nairobi #1 Jan 24, Nairobi #2 Feb 20)
- Cities: Nairobi + Mombasa (expanding)

## Known Issues

- `TerminalApplication.tsx` is 1,356 lines — needs refactoring into sub-components
- Team avatars reference `/images/team/*.jpg` — files may not exist
- CommandPalette FAQ links may point to wrong routes
