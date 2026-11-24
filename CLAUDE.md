# Claude Community Kenya
Kenya's independent, volunteer-run Claude developer community. Live at **claudekenya.org**.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16, App Router, TypeScript strict |
| Styling | Tailwind CSS v4 (`@theme` blocks) + CSS variables |
| Motion | Framer Motion |
| Database | PostgreSQL via Prisma 7 (24 models) |
| Auth | NextAuth v5 (credentials) |
| Storage | Supabase Storage (uploads, avatars) |
| Rate Limiting | Upstash Redis |
| Email | Resend |
| Icons | Lucide React |
| Fonts | Fraunces (display) + Inter (body) on the public site; Newsreader (serif) and JetBrains Mono / IBM Plex Sans also loaded — all via `next/font` |
| Deploy | Vercel |

## Design systems — two, and they are scoped

The public site and the staff surfaces do not share a look. Getting this
backwards is the most common way to write code that looks wrong in review.

### Karibu (warm light) — the public site

Every public page. Components live in `src/components/karibu/`. Tokens are CSS
custom properties in `src/app/globals.css`, registered in the `@theme inline`
block as Tailwind utilities (`bg-paper`, `text-ink`, `border-sand`, …).

- **Surfaces:** `--paper` (#F4EEE3), `--paper-card` (#FBF7F0), `--paper-alt`
- **Text:** `--ink` (#23201B), `--ink-soft`, `--ink-muted`, `--ink-faint`
- **Accent:** `--clay` (#A84E2D), `--clay-dark`, `--clay-light`
- **Lines:** `--sand` (#E4DAC8), `--sand-2`

**Adaptive dark mode** re-defines the paper/ink/clay/sand tokens (system
preference, overridable by an explicit `data-theme` on `<html>`). Anything that
must stay dark in *both* themes uses the non-inverting `--panel-dark` /
`--on-panel-dark` / `--on-panel-dark-muted` trio instead of `--ink` — the
footer and the feature cards do. Reaching for `bg-ink` to build a dark panel is
the bug that made the footer 1.59:1.

### Terminal Noir (dark) — admin and Impact Lab only

`/admin/*`, `/dashboard/*`, `/judge`, `/timer`. Not used on any public
marketing page.

- **Backgrounds:** `--bg-primary` (#0a0a0a), `--bg-secondary`, `--bg-card`, `--bg-elevated`
- **Green (primary):** `--green-primary` (#00ff41), `--green-dim`, `--green-muted`
- **Accents:** `--amber` (#ffb000), `--red` (#ff3333), `--cyan` (#00d4ff)
- **Text:** `--text-primary`, `--text-secondary`, `--text-dim`

`<html>` carries `persona-pro` globally (`layout.tsx`), which sets
`h1/h2/h3` to `--font-display` (Fraunces). That rule outranks the
`font-newsreader` utility, so Newsreader on a heading is a no-op — a known
wart, see Known Issues.

## Architecture

Public site: 23 routes (the revamp map). Staff surfaces (admin, dashboard, judge,
timer) and the API sit beside them.

```
src/
├── app/
│   ├── page.tsx                  # Home (KaribuHome)
│   ├── season/[slug]/            # Season hub; /season redirects to the current season
│   ├── events/                   # Listing + [slug] detail
│   ├── resources/                # Learn door: getting-started, claude-code, api-guide,
│   │                             #   production-guide, workflows, courses, guides/[slug] (DB)
│   ├── blog/                     # Listing + [slug] detail (DB-backed)
│   ├── showcase/                 # One surface for every submission type; [slug], submit
│   ├── reports/                  # Reports index; /impact-lab/[cohort], /impact-lab/results/[slug],
│   │                             #   /conversations/[slug] hang off it
│   ├── about/  join/  get-involved/  faq/  code-of-conduct/
│   ├── account/  login/  signup/ # Auth pages (unlisted from nav)
│   ├── admin/  dashboard/        # Terminal Noir staff surfaces
│   ├── judge/  timer/            # Build Day displays (Terminal Noir, no site chrome)
│   ├── api/                      # Admin + public API routes
│   ├── sitemap.ts  robots.ts  opengraph-image.tsx  not-found.tsx
│
├── components/
│   ├── karibu/                   # Every public page's components (nav, footer, motion/Reveal, GuideBlock, ...)
│   ├── layout/                   # ConditionalLayout (chrome switch), legacy Navbar/Footer
│   ├── sections/                 # Shared cards (ProjectCard, BlogPostCard, TeamMemberCard, ...)
│   ├── community/  admin/  schema/  ui/
│
├── data/                         # Static TypeScript data (events, blog, resources, faq)
└── lib/                          # prisma, constants, redirects, data-access, csrf, rate-limit, rbac, email, ...
```

Cut paths are permanent redirects, defined in `src/lib/redirects.ts` and wired in
`next.config.ts`. A redirect is added only when its destination page exists.

Tests: `src/**/__tests__/**/*.test.ts` (vitest; `.tsx` tests are not collected).

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
| WhatsApp | https://chat.whatsapp.com/HSNkqvKklyZBvI3zcpEMhX |
| Nairobi Events (Luma) | https://luma.com/sbsa789m |
| Mombasa Events (Luma) | https://luma.com/vsf5re14 |
| Global Claude Community | https://luma.com/claudecommunity |

## Key Facts

- First meetup: **January 24, 2026** — iHiT Events Space, Westlands, Nairobi
- Attendees at first meetup: **30+**
- First meetup: Community gathering + networking, Peter Kibet demoed Claude Code workflow
- Events hosted: growing count across Nairobi, Mombasa and Kisumu — the live
  figure comes from `SiteSettings.eventsHeld` in the DB, not this file
- Cities: Nairobi, Mombasa and Kisumu (each has hosted at least one event; the footer list is the source of truth)

## Known Issues

- Team avatars reference `/images/team/*.jpg` — files may not exist
- **Dead font utility:** `.persona-pro h1,h2,h3` (specificity 0,1,1) beats the
  `font-newsreader` utility (0,1,0), so ~66 heading usages of `font-newsreader`
  render Fraunces. The ~28 non-heading usages *do* apply — do not blanket-delete
  the class. Either drop `persona-pro` from Karibu routes or re-layer the rule.
- **Five font families load globally** in `layout.tsx` while the public site
  paints mainly Fraunces + Inter. Newsreader alone pulls 5 weights plus italics.
- **Metadata gaps:** 11 public pages export no `metadata` and fall back to the
  root title; `/code-of-conduct` and `/resources/links` have no
  `alternates.canonical` so they self-report as the homepage.
- **Prisma client goes stale after a GitHub Desktop pull** (no postinstall
  hook), producing dozens of phantom "property does not exist on PrismaClient"
  type errors. `npx prisma generate` fixes it — do not chase them as real.
