# Full Site Audit Report — Claude Community Kenya

**Date:** March 3, 2026
**Auditor:** Claude (Opus 4.6)
**Scope:** All 17 pages + shared layout + data layer + CSS + configuration
**Branch:** `claude/audit-homepage-wFsk2`

---

## Executive Summary

The site has strong foundations — clean Terminal Noir aesthetic, good component architecture, proper TypeScript typing, and decent SEO basics. However, the audit uncovered **120+ issues** across all pages, with several systemic problems that affect every single page.

### Top 5 Systemic Issues (Affect Every Page)

1. **`--text-dim` (#666666) fails WCAG AA contrast** — used on hundreds of text elements site-wide
2. **`<a>` wrapping `<button>` anti-pattern** — appears on multiple pages
3. **Missing OG image + 12 favicon 404s** — every social share and bookmark is broken
4. **Stale/hardcoded data** — events marked as upcoming after they've passed
5. **No form backend** — the join form saves to localStorage only, submissions go nowhere

---

## Issue Inventory by Page

### Homepage (`/`)
| # | Severity | Issue |
|---|----------|-------|
| 1 | Critical | Stale hero date: "Next event: Feb 20, 2026" (already passed) |
| 2 | Critical | StatsBar shows 1 event hosted (should be 2) |
| 3 | Critical | `<a>` wrapping `<button>` — invalid HTML |
| 4 | Critical | `--text-dim` fails WCAG AA contrast |
| 5 | Medium | Hero uses `100vh` not `100dvh` (mobile browser chrome issue) |
| 6 | Medium | "What We Do" grid cramped at `lg` breakpoint |
| 7 | Medium | Featured projects: 2 items in 3-column grid |
| 8 | Medium | MatrixRain JS animation runs on mobile (invisible but consuming CPU) |
| 9 | Medium | Missing OG image (`/og-image.png` 404) |
| 10 | Medium | Missing 12 favicon PNGs (all 404) |
| 11 | Medium | MobileMenu has no focus trap |
| 12 | Medium | No skip mechanism for typing animation |
| 13 | Medium | StatsBar: disconnected screen reader announcement |
| 14 | Medium | Partners section inconsistent with constants.ts |
| 15 | Low | Partners not clickable (despite URLs in constants) |
| 16 | Low | Code-style button labels (JOIN_DISCORD) unintuitive for non-devs |
| 17 | Low | Duplicate JOIN in mobile menu |

### About (`/about`)
| # | Severity | Issue |
|---|----------|-------|
| 18 | Critical | Timeline entries "Nairobi Meetup #2" and "First University Event" still marked [UPCOMING] |
| 19 | Critical | Team section: 1 member in a 4-column grid (75% empty) |
| 20 | Medium | Team avatar data exists but component never renders it |
| 21 | Medium | `<h4>` used in Timeline without parent `<h3>` (broken heading hierarchy) |
| 22 | Medium | `<a>` wrapping `<button>` for Discord CTA |
| 23 | Medium | Mission grid has no tablet (`md`) breakpoint |
| 24 | Medium | Timeline uses array index as React key |
| 25 | Low | Unused imports: `Link`, `GlitchText` |
| 26 | Low | Timeline data hardcoded in page instead of data file |
| 27 | Low | No CTA linking to Events page from timeline |

### Events (`/events` + `/events/[slug]`)
| # | Severity | Issue |
|---|----------|-------|
| 28 | Critical | Mombasa AI & Career Talk (Feb 28) still shows "Registration Open" — event passed 3 days ago |
| 29 | Critical | Event statuses are hardcoded, never computed from dates |
| 30 | Critical | JSON-LD `eventStatus` ternary returns same value on both branches |
| 31 | Critical | Color contrast failures in EventCard |
| 32 | Medium | Nairobi Meetup #2 venue shows "Nairobi — Nairobi" |
| 33 | Medium | Hackathon has no `registrationUrl` (dead-end for upcoming event) |
| 34 | Medium | Events listing is entirely client-rendered (bad for SEO) |
| 35 | Medium | Filter state not reflected in URL |
| 36 | Medium | No `aria-live` region for filtered results |
| 37 | Medium | No `<time>` elements wrapping dates |
| 38 | Medium | No image support for events |
| 39 | Medium | No `endDate` in JSON-LD |
| 40 | Low | `photosUrl: "#"` is a dead link on completed events |
| 41 | Low | Emoji in prizes array |
| 42 | Low | Unnecessary `"use client"` on EventCard |

### Blog (`/blog` + `/blog/[slug]`)
| # | Severity | Issue |
|---|----------|-------|
| 43 | Critical | `renderInlineMarkdown()` produces arrays without proper React keys |
| 44 | Critical | Color contrast on blog surfaces |
| 45 | Medium | Custom fragile Markdown parser (doesn't handle images, blockquotes, tables, etc.) |
| 46 | Medium | "Related Posts" is just "all other posts" — no intelligence |
| 47 | Medium | All posts share same generic author "Claude Community Kenya" |
| 48 | Medium | Content stored as TypeScript template literals (fragile) |
| 49 | Medium | Missing Twitter card meta tags |
| 50 | Medium | No clipboard error handling in CopyLinkButton |
| 51 | Medium | Excessive padding on mobile inside TerminalWindow |
| 52 | Medium | No image support in blog system |
| 53 | Low | Hardcoded reading time (utility exists but unused) |
| 54 | Low | Only 3 blog posts |
| 55 | Low | No RSS feed |
| 56 | Low | No pagination |

### Projects (`/projects`)
| # | Severity | Issue |
|---|----------|-------|
| 57 | Critical | Discord bot repo URL may not exist |
| 58 | Critical | Color contrast on project cards |
| 59 | Critical | ProjectCard is a plain `<div>` — no semantic role (`<article>`) |
| 60 | Medium | Only 2 real projects + 1 placeholder (page feels empty) |
| 61 | Medium | Duplicate "submit project" CTAs |
| 62 | Medium | Status variant mapping reuses event badge semantics |
| 63 | Medium | Discord bot description implies working features (still in dev) |
| 64 | Medium | No project images/thumbnails |
| 65 | Low | Brittle `isPlaceholder` check via magic string |

### Resources (Hub + 7 sub-pages)
| # | Severity | Issue |
|---|----------|-------|
| 66 | Critical | Color contrast on all 7 pages |
| 67 | Critical | URLs overflow on mobile in links page |
| 68 | Medium | Massive DRY violation — 7 pages repeat identical patterns |
| 69 | Medium | Missing canonical URLs on 5 of 7 sub-pages |
| 70 | Medium | Missing BreadcrumbSchema on 5 of 7 sub-pages |
| 71 | Medium | Code blocks use `<p>` tags instead of `<pre><code>` |
| 72 | Medium | Broken "Case Study" anchor in production guide |
| 73 | Medium | Courses defined in both page and resources.ts (DRY violation) |
| 74 | Medium | `.replace(" ", "-")` only replaces first space in anchor IDs |
| 75 | Medium | Stale Claude model reference in courses |
| 76 | Medium | Social links may be fabricated (unverified) |
| 77 | Low | Hover-only content inaccessible to keyboard/touch users |
| 78 | Low | Resource descriptions never displayed |

### Join (`/join`)
| # | Severity | Issue |
|---|----------|-------|
| 79 | Critical | Events count shows 1 (should be 2) |
| 80 | Critical | TerminalApplication is 1,218 lines — needs decomposition |
| 81 | Critical | Mobile option buttons duplicate entire submission logic |
| 82 | Medium | Form data only saved to localStorage — no backend submission |
| 83 | Medium | Mobile buttons bypass validation |
| 84 | Medium | Input type always "text" even for email step |
| 85 | Medium | Validation errors not announced via `aria-live="assertive"` |
| 86 | Medium | No "back" or "edit" capability in form |
| 87 | Medium | Module-level mutable counter (`lineIdCounter`) |
| 88 | Low | Inline style for caret color |

### FAQ (`/faq`)
| # | Severity | Issue |
|---|----------|-------|
| 89 | Medium | Color contrast on item count text |
| 90 | Medium | Accordion missing `aria-labelledby` on region |
| 91 | Medium | Accordion missing keyboard navigation (Home/End/Arrow keys) |
| 92 | Medium | Claude Code pricing info may be outdated |
| 93 | Low | No deep-link anchors on individual FAQ items |
| 94 | Low | No FAQ about WhatsApp group |

### Ambassador (`/ambassador`)
| # | Severity | Issue |
|---|----------|-------|
| 95 | Medium | No clear CTA for how to actually become an ambassador |
| 96 | Low | Missing `alternates.canonical` |
| 97 | Low | All content hardcoded (not in data file) |

### Code of Conduct (`/code-of-conduct`)
| # | Severity | Issue |
|---|----------|-------|
| 98 | Medium | Safety-critical text uses failing contrast color |
| 99 | Medium | No specifics about physical event incidents |
| 100 | Low | No "last updated" date |
| 101 | Low | Entire page in single TerminalWindow (very long on mobile) |

### 404 (`/not-found`)
| # | Severity | Issue |
|---|----------|-------|
| 102 | Medium | No `robots: "noindex"` directive |
| 103 | Low | Only 3 navigation suggestions (site has 17 routes) |

### Shared Layout (Navbar, Footer, MobileMenu, PageTransition, CommandPalette, LoadingBar)
| # | Severity | Issue |
|---|----------|-------|
| 104 | Critical | MobileMenu: no focus trap |
| 105 | Critical | MobileMenu: no focus management on open/close |
| 106 | Critical | Synthetic KeyboardEvent dispatch for CommandPalette |
| 107 | Critical | Deprecated `navigator.platform` |
| 108 | Medium | PageTransition never re-animates after initial mount |
| 109 | Medium | Footer external links use `<Link>` (should be `<a>`) |
| 110 | Medium | Active link detection uses exact match only (sub-pages not highlighted) |
| 111 | Medium | Duplicate Join in nav |
| 112 | Medium | Footer `"use client"` for trivial easter egg |
| 113 | Medium | LoadingBar progress is completely fake |
| 114 | Medium | `cn()` doesn't merge conflicting Tailwind classes |
| 115 | Medium | z-index layering undocumented and chaotic |
| 116 | Medium | Multiple components independently listen for keyboard events |
| 117 | Medium | CommandPalette FAQ/resource links may point to wrong routes |
| 118 | Medium | JSON-LD logo references non-existent `/logo.svg` |
| 119 | Medium | Skip-nav target `#main-content` missing `tabindex="-1"` |
| 120 | Low | EasterEggs/ConsoleWelcome inflate client bundle |
| 121 | Low | Footer emoji lacks proper aria |
| 122 | Low | Footer exit easter egg causes layout shift |

### Global CSS / Configuration
| # | Severity | Issue |
|---|----------|-------|
| 123 | Medium | Two full-screen compositing layers (scanline + noise) on every page |
| 124 | Medium | Sitemap references routes that may not exist (api-guide, production-guide not in CLAUDE.md) |
| 125 | Low | `TerminalWindow "use client"` unnecessary (no client APIs used) |
| 126 | Low | `BreadcrumbSchema "use client"` unnecessary |

---

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | 24 |
| Medium | 63 |
| Low | 39 |
| **Total** | **126** |

---

## Recommended Fix Priority

### Phase 0: Immediate (Credibility & Compliance)
1. Fix stale event status: Mombasa event should be "completed"
2. Fix stale hero date, stats count (2 events, not 1)
3. Update About timeline — remove [UPCOMING] from past events
4. Bump `--text-dim` from #666666 to #8a8a8a (WCAG AA)
5. Fix `<a>` wrapping `<button>` pattern site-wide
6. Generate OG image + favicon PNGs (or strip references)

### Phase 1: Accessibility
7. Implement focus trap in MobileMenu
8. Add `tabindex="-1"` to `#main-content`
9. Fix heading hierarchy across pages
10. Add `aria-hidden` to decorative elements (dots, box-drawing, etc.)
11. Fix form input types and error announcements in TerminalApplication
12. Use semantic HTML (`<article>`, `<ol>`, `<time>`)

### Phase 2: Architecture
13. Replace synthetic event dispatch with CommandPalette context
14. Fix Footer external links (use `<a>` not `<Link>`)
15. Fix active link detection (use `startsWith`)
16. Install `tailwind-merge` for proper `cn()`
17. Extract shared ResourceLayout component
18. Decompose TerminalApplication (1,218 lines → 5-6 files)
19. Dynamic import EasterEggs

### Phase 3: Content & SEO
20. Add canonical URLs to all pages
21. Add BreadcrumbSchema to all pages
22. Fix broken anchors in CommandPalette
23. Add Twitter card meta to all pages
24. Replace custom Markdown parser with `react-markdown`
25. Add `robots: "noindex"` to 404 page
26. Fix JSON-LD issues (logo, eventStatus, endDate)

### Phase 4: New Features (Supabase)
27. Supabase integration (see plan below)
28. Speaker application system
29. Project/idea submission system
30. Connect join form to actual backend
