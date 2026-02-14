# Claude Community Kenya — Project Context

## Tech Stack
- **Framework:** Next.js (App Router) with TypeScript strict mode
- **Styling:** Tailwind CSS v4 (CSS-based config via `@theme` blocks) + CSS variables
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Fonts:** JetBrains Mono (headings, code, UI) + IBM Plex Sans (body text) via `next/font`

## Design System: "Terminal Noir"
All colors use CSS custom properties defined in `src/app/globals.css`:
- **Backgrounds:** `--bg-primary` (#0a0a0a), `--bg-secondary`, `--bg-card`, `--bg-elevated`
- **Green (primary):** `--green-primary` (#00ff41), `--green-dim`, `--green-muted`
- **Accent colors:** `--amber` (#ffb000), `--red` (#ff3333), `--cyan` (#00d4ff)
- **Text:** `--text-primary`, `--text-secondary`, `--text-dim`

Tailwind theme tokens are registered in the `@theme inline` block in globals.css (e.g., `bg-green-primary`, `text-amber`).

## Project Conventions
- Use `"use client"` only on components that require interactivity (state, effects, event handlers)
- Import paths use `@/` alias (maps to `./src/`)
- Component structure: `src/components/layout/` for shell, `src/components/ui/` for reusable UI
- Data files with TypeScript interfaces live in `src/data/`
- Utility functions in `src/lib/utils.ts`, site constants in `src/lib/constants.ts`
- All CSS uses Tailwind utility classes + CSS variables — avoid inline styles
- Accessibility: ARIA labels, keyboard navigation, semantic HTML, `prefers-reduced-motion`

## File Structure
```
src/
├── app/           # Next.js App Router pages
├── components/
│   ├── layout/    # Navbar, Footer, PageTransition, MobileMenu
│   └── ui/        # Button, Card, Badge, CountUp, Accordion, Timeline
├── data/          # TypeScript data files (events, blog, projects, team, faq, resources)
├── lib/           # Utilities and constants
└── styles/        # glitch.css (animations)
```

## Build Phases
- **Phase 1 (Foundation):** ✅ Project setup, design system, layout + UI components, data structures
- **Phase 2 (Terminal FX):** Terminal window, typing animation, matrix rain, command palette, glitch text, etc.
- **Phase 3 (Pages):** Home, About, Events, Resources, Projects, Blog, Join — 14 pages total
- **Phase 4 (Polish):** Real content, easter eggs, performance, accessibility, SEO, deployment
