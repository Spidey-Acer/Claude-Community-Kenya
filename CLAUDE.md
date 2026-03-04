# Claude Community Kenya — Project Context

## Overview
Community website for Claude Community Kenya (CCK) — East Africa's first Claude developer community. This is a **live, public** website. All content must be accurate, professional, and reflect well on the community.

**Domain:** https://www.claudekenya.org
**Status:** Production (deployed)

## Tech Stack
- **Framework:** Next.js 16 (App Router) with TypeScript strict mode
- **Styling:** Tailwind CSS v4 (CSS-based config via `@theme` blocks) + CSS variables
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Fonts:** JetBrains Mono (headings, code, UI) + IBM Plex Sans (body text) via `next/font`
- **Build:** Turbopack

## Design System: "Terminal Noir"
All colors use CSS custom properties defined in `src/app/globals.css`:
- **Backgrounds:** `--bg-primary` (#0a0a0a), `--bg-secondary`, `--bg-card`, `--bg-elevated`
- **Green (primary):** `--green-primary` (#00ff41), `--green-dim`, `--green-muted`
- **Accent colors:** `--amber` (#ffb000), `--red` (#ff3333), `--cyan` (#00d4ff)
- **Text:** `--text-primary`, `--text-secondary`, `--text-dim`

Tailwind theme tokens are registered in the `@theme inline` block in globals.css (e.g., `bg-green-primary`, `text-amber`).

## Critical Links (ALWAYS USE THESE)
- **Discord:** https://discord.gg/AVAyYCbJ
- **WhatsApp:** https://chat.whatsapp.com/Hpx42q1ADsrFNN3hHtZcQa
- **Nairobi Events (Luma):** https://luma.com/sbsa789m
- **Mombasa Events (Luma):** https://luma.com/vsf5re14
- **Global Claude Community Events:** https://luma.com/claudecommunity

## Project Conventions
- Use `"use client"` only on components that require interactivity (state, effects, event handlers)
- Import paths use `@/` alias (maps to `./src/`)
- Component structure: `src/components/layout/` for shell, `src/components/ui/` for reusable UI, `src/components/sections/` for page sections, `src/components/terminal/` for terminal-themed components
- Data files with TypeScript interfaces live in `src/data/`
- Utility functions in `src/lib/utils.ts`, site constants in `src/lib/constants.ts`
- All CSS uses Tailwind utility classes + CSS variables — avoid inline styles
- Accessibility: ARIA labels, keyboard navigation, semantic HTML, `prefers-reduced-motion`
- Do NOT fabricate URLs — only use real, publicly accessible links
- Do NOT include overly personal information about individuals
- Do NOT inflate community stats — keep numbers accurate

## File Structure
```
src/
├── app/                    # Next.js App Router pages (17 routes)
│   ├── page.tsx            # Home
│   ├── about/              # About page with timeline
│   ├── events/             # Events listing + [slug] detail pages
│   ├── blog/               # Blog listing + [slug] detail pages
│   ├── projects/           # Projects showcase
│   ├── resources/          # Resource hub with 5 sub-pages
│   │   ├── getting-started/
│   │   ├── claude-code/
│   │   ├── workflows/
│   │   ├── courses/        # Anthropic courses learning paths
│   │   └── links/          # Curated links directory
│   ├── join/               # Join page with terminal application form
│   ├── faq/                # FAQ with accordions
│   ├── ambassador/         # Ambassador program page
│   ├── code-of-conduct/
│   └── not-found.tsx       # 404 page
├── components/
│   ├── layout/             # Navbar, Footer, PageTransition, MobileMenu
│   ├── sections/           # HeroTerminal, StatsBar, EventCard, ProjectCard, etc.
│   ├── terminal/           # TerminalWindow, MatrixRain, CommandPalette, GlitchText, etc.
│   └── ui/                 # Button, Card, Badge, CountUp, Accordion, Timeline
├── data/                   # TypeScript data files
│   ├── events.ts           # 3 events (1 completed, 2 upcoming)
│   ├── blog-posts.ts       # 3 professional community blog posts
│   ├── projects.ts         # 4 projects (2 featured: website + discord bot)
│   ├── resources.ts        # 33 resources across 8 categories
│   ├── team.ts             # 4 team members
│   └── faq.ts              # 13 FAQs in 3 categories
├── lib/
│   ├── constants.ts        # Site config, nav links, social links, footer
│   └── utils.ts            # formatDate, cn, toSlug, truncate, etc.
└── styles/
    └── glitch.css          # Glitch text animations
```

## Key Facts (for content accuracy)
- First meetup: **January 24, 2026** (NOT January 25)
- Venue: iHiT Events Space, Westlands, Nairobi
- Attendees at first meetup: **30+** (NOT 50+)
- What happened: Community gathering, networking, Peter Kibet demoed his Claude Code workflow with a live project demo
- What did NOT happen: No "building a full-stack application from scratch", no Discord bot demo
- Events hosted so far: **2** (Nairobi #1 Jan 24, Nairobi #2 Feb 20)
- Cities: Nairobi + Mombasa (expanding)

## Build & Verification
```bash
npm run build          # Must pass with zero errors
npx tsc --noEmit       # Must pass with zero type errors
```

## Known Issues / TODO
- Team avatars reference `/images/team/*.jpg` — files may not exist yet
- CommandPalette FAQ links may point to wrong route (/about#id instead of /faq)
- TerminalApplication.tsx is 1,218 lines — could benefit from refactoring into sub-components
- No sitemap.xml or robots.txt generation configured
- Blog posts and events could have richer structured data (BlogPosting, Event schemas)

## Build Phases
- **Phase 1 (Foundation):** ✅ Project setup, design system, layout + UI components, data structures
- **Phase 2 (Terminal FX):** ✅ Terminal window, typing animation, matrix rain, command palette, glitch text
- **Phase 3 (Pages):** ✅ Home, About, Events, Resources, Projects, Blog, Join — 17 pages total
- **Phase 4 (Content):** ✅ Real content, accurate data, correct links, professional blog posts, comprehensive resources
- **Phase 5 (Polish):** 🔄 See REVAMP-PROMPT.md for full revamp plan — component polish, animations, SEO, accessibility, performance
