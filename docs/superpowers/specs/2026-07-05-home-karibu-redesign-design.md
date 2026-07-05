# Home Redesign — "Karibu" Warm-Light Identity

**Date:** 2026-07-05
**Branch:** `redesign/design-overhaul`
**Scope:** Home page (`/`) only. First page of a page-by-page site overhaul.
**Source design:** `index.dc.html` from the Claude.ai design project "Claude Community Kenya Revamp" (imported via DesignSync MCP).

## Goal

Replace the home page's Terminal Noir presentation with a warm, welcoming
"clay & paper" identity (the Anthropic light aesthetic), while preserving all
existing dynamic behaviour. This is the first step toward a single site-wide
identity; the Dev/Pro persona toggle is retired incrementally, not in one pass.

## Decisions (approved)

1. **Single identity, reached page-by-page.** The warm-light look becomes the
   site's identity. We do NOT maintain two skins per page (dual-skin degrades
   dev velocity, consistency, and the "cruising" experience during migration).
   The persona system (39 files) is left **dormant** — provider stays mounted,
   converted pages simply don't consume it — and is deleted in a final cleanup
   PR once every page is migrated.
2. **Keep all dynamic wiring.** Real DB events, live community stats, Karibu
   personalization, recommendations remain. The mockup's hardcoded content is
   the *layout*; real data fills it. No feature loss.
3. **Real data only — no inflation.** Member counts + active cities come from
   `siteSettings` (DB). We show what the DB backs (Nairobi + Mombasa today) —
   not the mockup's "~2,500 members / 3 cities incl. Kisumu".
4. **Real testimonials.** The mockup's fabricated "Brian Ochieng" quote is
   replaced with a carousel of 5 real community members (see below). Exact
   wording + name spellings require Peter's sign-off before merge.

## Design system (this palette is genuinely new)

The existing `persona-pro` theme is warm-**dark** (`#141413`). The new identity
is warm-**light**. New tokens are **additive** — no existing page references
them, so nothing else changes.

| Token | Value | Use |
|-------|-------|-----|
| `--color-paper` | `#F4EEE3` | page background |
| `--color-paper-card` | `#FBF7F0` | cards |
| `--color-paper-alt` | `#EFE7D8` | alt/trust bands |
| `--color-ink` | `#23201B` | primary text / dark sections |
| `--color-ink-soft` | `#5C5349` | body text |
| `--color-ink-muted` | `#6A6155` | meta text |
| `--color-clay` | `#C15F3C` | primary accent |
| `--color-clay-dark` | `#A84E2D` | hover |
| `--color-clay-light` | `#E6906F` | on-dark accent |
| `--color-sand` | `#E4DAC8` | borders |
| `--color-sand-2` | `#DDD3C2` | stronger borders |

**Fonts:** `Newsreader` (serif display) + `Inter` (body) via `next/font/google`
(self-hosted, no CDN). Exposed as `--font-newsreader` / `--font-inter`.

**Scoping:** the new palette lives on the converted page's own wrapper, which
paints a full-viewport `--color-paper` background over the dark `<body>`. The
root `<html class="dark persona-pro">` is untouched so every un-migrated page
keeps working.

## Components (new, isolated)

- `KaribuNav` — sticky nav, animated ✳ mark, flat links → real routes
  (`/#what`, `/events`, `/resources`, `/community`, `/about`), WhatsApp CTA,
  mobile hamburger.
- `Marquee` — scrolling clay band; stats sourced from real `communityStats`.
- `KaribuFooter` — dark footer, real links from `constants.ts`.
- `KaribuHome` — client component composing the 8 sections; receives the same
  props the current home fetches (events, stats, audience, recommendables).
- `KaribuTestimonials` — reskinned carousel with the 5 real members.

`ConditionalLayout` gains a route check: converted routes (`/`) render
`KaribuNav`/`KaribuFooter`; all others keep `Navbar`/`Footer`. Providers
(`SkinProvider`, `AudienceProvider`, `SessionProvider`) stay mounted for both.

## Section → data map

1. **Hero** — static headline/subcopy; badge = next real event (title +
   attendee count).
2. **Trust bar** — real member total, active cities, "100% free", "Anthropic-
   supported".
3. **What we do** — 4-pillar bento (static copy).
4. **Two tracks** — Software engineers / Builders (static; links to
   `/events`, `/join`).
5. **Upcoming events** — top 3 real `upcomingEvents`, real city/type/date.
6. **Community in action** — `KaribuTestimonials` (5 real members).
7. **How to join** — dark card, 3 steps, WhatsApp + Discord CTAs.
8. **Footer** — `KaribuFooter`.

Karibu personalization (`MadeForYou`) is preserved, restyled to the light
palette, placed after the trust bar.

## Testimonials (real — pending spelling/wording sign-off)

Drafted faithfully from Peter's dictation; **confirm before merge**:

1. **Billy Mwangi** — CCK sessions helped him scale & level up work at his
   company. *(confirm surname; clarify "scale ___ in his company")*
2. **Samuel** *(surname?)* — Claude transformed his client work.
3. **Peter Kibet** — founder.
4. **James Lloyd** — Claude eased his research work.
5. **Isaac Toili** *(spelling?)* — teacher from **Tuigoin** *(spelling?)*
   village; Claude helps with lesson plans, planning, classroom management.

## Motion

Framer Motion (existing dep): staggered reveal-on-scroll, marquee, image wipe.
All gated behind `useReducedMotion` / `prefers-reduced-motion`.

## Out of scope (deferred)

- Events, Learn, Community, About, Join pages (`*.dc.html` mockups exist).
- Final deletion of the persona system.
- Any change to admin/dashboard routes.

## Verification gate

`npm run build && npx tsc --noEmit` must pass clean before commit. Manual
smoke: home renders on paper bg, other pages still render Terminal Noir chrome,
no dark-bg bleed, mobile nav works, reduced-motion honoured.
