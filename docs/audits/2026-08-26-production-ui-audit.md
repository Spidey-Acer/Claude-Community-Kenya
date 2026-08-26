# Production UI Audit — everything outside /community + /showcase

**Date:** 2026-08-26
**Scope:** All public content pages, forms, auth flows, resource pages, shared chrome,
and the admin panel — everything the community UI audit
(`2026-08-26-community-ui-audit.md`, PR #118) did not cover.
**Method:** Three parallel review passes (public content pages; forms/auth/resources;
admin mobile), findings verified against source.
**Note on baselines:** the pass ran against `main`. Findings already fixed on
`claude/community-ui-fixes` (the sitewide `bg-[#F3E3D9]`/`text-[#4A4238]`/Tailwind-red
sweep across `src/components/karibu/`) are excluded below — merge that branch and they
disappear.

---

## Executive summary

1. **Admin panel was non-functional on mobile — root-caused and FIXED on
   `claude/admin-mobile-fixes`.** A permanent 256px sidebar with zero responsive
   breakpoints left ~119px of content at phone width, and every list page clipped its
   table inside `overflow-hidden`; on five pages the only detail link sat in the
   clipped last column, so an organiser could not open an application from a phone.
   The branch ships: a hamburger-drawer shell below `md`, horizontally scrollable
   tables everywhere, name-cell detail links, touch-visible row actions, and stacked
   stat/form grids. Login was already fine.
2. **Two pages are actively broken for visitors:** `/team/[slug]` renders near-white
   hard-coded text on the warm cream Karibu background (~1.1:1 — unreadable), is
   linked from nowhere, yet sits in the sitemap; `/newsletter/[slug]` is a full-black
   Noir page sandwiched inside warm Karibu chrome.
3. **Every page title is double-suffixed.** The root layout defines
   `title.template: "%s | Claude Community Kenya"` and nearly every page also bakes
   the suffix into its title string → "About | Claude Community Kenya | Claude
   Community Kenya" in tabs and search results, sitewide.
4. **`/resources/api-guide` teaches a fabricated model ID.** `claude-haiku-3-5` has
   never existed (that generation was `claude-3-5-haiku-*`); it appears in api-guide
   and production-guide as copy-pasteable code. The rest of the model lineup is a
   generation stale.
5. **The older Karibu forms miss the basics the new ones have.** KaribuSubmitIdea,
   KaribuSubmitProject, and KaribuDemoRequestForm render labels with no `htmlFor`/`id`
   at all; they plus KaribuSpeak have no `role="alert"` on errors and a
   silently-failing on-mount CSRF fetch that leaves the submit button disabled forever.
6. **The Noir remainder is now a defined set:** auth flows (5 pages, each duplicating
   its whole markup per skin), 7 resource sub-pages + blog posts (the warm listing →
   black detail flip), `/chat`, `/merch`, `/code-of-conduct`, plus the ChatWidget and
   KaribuBanner overlays that render dark on warm pages.
7. **A large dead-code inventory** from the Karibu conversion is ready to delete —
   including CLAUDE.md's stale claim that `TerminalApplication.tsx` is 1,356 lines
   (it's 412, already refactored, and `/join` no longer renders it at all).

---

## A. Admin mobile (diagnosed → fixed on `claude/admin-mobile-fixes`)

Root cause chain, for the record:

- `src/app/admin/layout.tsx` + `AdminSidebar.tsx`: `w-64 shrink-0 sticky` rail, no
  responsive prefix anywhere in either file → 119px of content at 375px, and `p-6`
  page padding left ~71px. `min-w-0` on main meant content was crushed and *clipped*,
  not scrollable.
- Every list page: card `overflow-hidden` directly wrapping a 5–7 column
  `<table className="w-full">` → columns clipped with no scroll. On
  applications/speakers/ideas/demos/volunteers the only detail link was a 16px chevron
  in the last (first-clipped) column.
- `AdminUserManager` row actions were `opacity-0 group-hover:opacity-100` — invisible
  on touch. Stat rows `grid-cols-4`, contact inbox hard `w-1/2` split view, event
  editor `grid-cols-2/3` field grids: none responsive. Impact Lab's ten-tab bar
  clipped.
- Genuinely fine and untouched: login, viewport meta, all `[id]` detail pages,
  dashboard grids, six impact-lab tables that already scrolled, the Noir theme itself.

All of the above is implemented on the branch (2 shell files + ~23 page/component
files, validated with tsc/build/tests, lint surface identical to main).

## B. Broken pages (high)

- **`/team/[slug]`** — dark "Pro" body under Karibu chrome: `text-[#faf9f5]` h1,
  `text-[#b0aea5]` bio etc. on `--paper` ≈ 1.1:1, unreadable in light mode
  (`src/app/team/[slug]/page.tsx:77-185`). Also orphaned (no page links to it —
  `KaribuTeam` cards link only to member socials) yet emitted by the sitemap.
  **Decide:** convert to Karibu and link it from `/team`, or stop emitting it.
- **`/newsletter/[slug]`** — `bg-bg-primary` (#0a0a0a) full-page Noir inside
  KaribuNav/KaribuFooter, ~22 hard-coded dark hexes, plus the dark `HeroEmailCapture`;
  the warm paper loading skeleton flashes into a black page
  (`src/app/newsletter/[slug]/page.tsx:245,97-296`).
- **`KaribuHome.tsx:722`** — `text-paper` inside the non-inverting `bg-panel-dark`
  "How to join" slab: in dark mode ≈ 1.05:1 (invisible). Exactly the footer-bug class
  the `--on-panel-dark` trio exists to prevent.
- **`KaribuAbout.tsx:182`, `KaribuEventDetail.tsx:275`** — `bg-ink … text-paper
  hover:bg-black` buttons: hover state in dark mode renders invisible text
  (`bg-black` never flips while `text-paper` goes dark).

## C. Sitewide metadata + content accuracy

- **Double title suffix (high, sitewide):** `layout.tsx:59-62` sets
  `title.template: "%s | Claude Community Kenya"`; nearly every page passes a string
  title already containing "| Claude Community Kenya". Fix once: strip the suffix from
  every page title and let the template append it (only `/chat` does this correctly
  today).
- **Missing canonicals:** `/` (has OG url, no canonical), `/chat`,
  `/code-of-conduct` (known gap, still open).
- **`claude-haiku-3-5` is fabricated** (`resources/api-guide` ~line 39,
  `production-guide` 262/351) — never a real model ID; 404s at the API. The whole
  lineup (opus-4-5/sonnet-4-5/haiku-3-5) is also a generation stale — refresh to the
  current tier while in there. ~2 hours including link fixes; worth shipping
  immediately regardless of any conversion work.
- **Verify two social URLs** in `src/data/resources.ts:220,227`
  (`twitter.com/ClaudeCommunityKE`, `linkedin.com/company/claude-community-kenya`) —
  they look pattern-guessed; everything else in the file checks out. `cursor.sh`
  now redirects to cursor.com (cosmetic).
- `/join`'s city list includes "Kisumu — Growing" while site facts elsewhere say
  Nairobi + Mombasa only.

## D. Forms (Karibu-converted, quality varies)

House standard = the fixed `/community/submit` + `KaribuVolunteer` (the model form).

- **KaribuSubmitIdea, KaribuSubmitProject, KaribuDemoRequestForm (high):** their
  shared `Field` helper renders `<label>` with **no `htmlFor`/id wiring at all** —
  every field announces unnamed. KaribuSpeak's variant does wire ids (via
  cloneElement) but misses the rest.
- **All four + newsletter:** on-mount CSRF fetch with silent `catch` +
  `disabled={!csrfToken}` → the primary CTA is bricked forever if the token fetch
  fails, with no message. (Newsletter subscribe is the homepage conversion CTA.)
- **No `role="alert"`** on global/field errors in Speak/SubmitIdea/SubmitProject/
  DemoRequest; SubmitIdea's "seeking roles" chips have no `aria-pressed` and its
  tag-remove buttons no accessible name; four radio groups use bare labels instead
  of fieldset/legend; newsletter's error renders in `text-clay` (accent) instead of
  `text-error`.
- `/contact` **does not exist**: `/api/contact` and the admin inbox are live, but
  nothing on the site can create a ContactMessage — dead capability or missing page.
- Quick-win batch for all of the above: ~1 day, no conversions required.

## E. Auth flows (Noir, user-facing)

/login, /signup, /forgot-password, /reset-password, /verify-email each render **two
complete hard-coded variants** switched on `useSkin()` — 100% markup duplication per
page, raw hexes, no tokens. KaribuNav links straight into them, so the warm→dark flip
is on the main nav path.

- `/signup` has **no metadata layout at all** — indexed, root-fallback title, no
  noindex (every other auth page has one).
- The Noir variant of every page lacks `role="alert"` on errors while the pro variant
  has it; `/verify-email`'s verifying→success transition is never announced.
- `/forgot-password`'s two variants disagree on account enumeration ("We sent a reset
  link" vs "If an account exists…") — the pro copy asserts a send the API refuses to
  confirm.
- `/login` enforces `minLength={8}` on the login password — can lock out legacy
  short-password users from even submitting.
- Estimate: one shared Karibu auth-card + 5 page rewrites ≈ 2–3 days (deletes the
  dual-skin branching); the missing `role="alert"`s + signup metadata are ~1 hour
  standalone if conversion waits.

## F. Resource pages + blog detail (Noir remainder)

- `/resources` and `/blog` listings are Karibu; **all 7 resource sub-pages and every
  blog post render Noir** — each card click on the warm hub flips the site to the
  green terminal. `/code-of-conduct` (linked from three warm forms) same.
- `/resources/links`: still no `alternates.canonical` (the known issue); long literal
  URLs with no `break-all`/overflow handling overflow a 360px viewport.
- Conversion estimate: ~3–4 days (needs a Karibu article/code-block component first,
  which also fixes the mobile overflow); content fixes ship separately (§C).

## G. Chrome + polish (medium/low)

- **ChatWidget + KaribuBanner** are mounted on every non-admin route but styled only
  in Noir vocab — a dark launcher/toast floating on warm paper pages.
- **PageTransition** wraps every page in a Framer fade with no `useReducedMotion`
  guard (the CSS kill-switch doesn't reach Framer's inline styles), SSRs content at
  opacity 0 for no-JS/bots, and double-animates on top of the (exemplary) Reveal
  system on Karibu routes.
- `KaribuHome.tsx:87` `toLocaleString()` without a locale in a client component —
  hydration mismatch risk; pin `"en-KE"`.
- `KaribuHome.tsx:440` `text-[#F5E4DB]` and `Marquee.tsx:25,30` hard-coded lights on
  `bg-clay` ≈ 2.9:1 in dark mode; `KaribuVolunteer.tsx:73` `text-amber-600` CharCount.
- KaribuNav dropdown trigger lacks `aria-haspopup`/`aria-expanded`; KaribuBanner
  auto-dismisses with pause only on pointer hover; `chat/page.tsx` decorative flame
  has `alt="Kenya"` instead of empty alt.
- `blog/[slug]` and `events/[slug]` data fetches have no `.catch` (transient DB error
  → 500 instead of degrading).
- Latent: `ensureVisitorId()` calls `cookies().set()` from the home RSC (only legal in
  actions/route handlers) — masked by the proxy setting the cookie first; also makes
  `/` dynamic so its `revalidate = 3600` is inert.
- StickyMobileCTA scrolls to `#hero-email`, which exists on none of the legacy routes
  it renders on.
- Verified good: MobileMenu and PhotoLightbox focus traps, FAQ accordion ARIA, skip
  link, skeletons, all internal links resolve, all external links carry `rel`.

## H. Dead code inventory (delete-ready, zero live importers verified)

- Pre-Karibu page twins: `events/[slug]/EventDetailContent.tsx` + `EventPhotoStrip`,
  `events/EventsContent.tsx`, `about/AboutClient.tsx`, `projects/ProjectsClient.tsx`,
  `faq/FaqPageContent.tsx` + `FaqClient.tsx` + `FloatingDiscordCTA.tsx`,
  `join/JoinSwitcher.tsx` + `ProJoinContent.tsx` + `LazyTerminalApplication` +
  `TerminalApplication` (+ its `terminal/application/*` submodules if unshared),
  `events/[slug]/DemoRequestForm.tsx` (Noir twin).
- The whole `sections/HomeContent.tsx` tree: MadeForYou, PersonalizedHero, HeroPro,
  StatsBarPro, SocialProofRail, TestimonialsCarousel, StatsBar, ProjectOfTheWeek,
  EventCard, ProjectCard, CommunityResourceCard (HeroTerminal survives only as a type
  source; HeroEmailCapture is live).
- `karibu/KaribuGallery.tsx` (superseded); `ui/MediaFrame`, `ui/Timeline`,
  `ui/Button`, `ui/Accordion` now reachable only via dead files.
- **CLAUDE.md updates needed:** TerminalApplication is 412 lines and unmounted (not
  1,356 / "needs refactoring"); `/ambassador` doesn't exist; 17-vs-24 Prisma model
  count discrepancy.

## Recommended roadmap

1. **Merge the two open fix branches** (`claude/community-ui-fixes`,
   `claude/admin-mobile-fixes`) — admin mobile and the community surface are done.
2. **Ship the small high-impact batch (~1 day):** title-template de-duplication,
   `/team/[slug]` decision, resource content fixes (`claude-haiku-3-5`, model
   refresh, links canonical + overflow), the four dark-mode color bugs in §B,
   forms quick-win batch (§D), signup metadata + auth `role="alert"`s.
3. **Dead-code deletion + CLAUDE.md refresh (~0.5 day).**
4. **Auth flows → Karibu (2–3 days).**
5. **Resource sub-pages + blog detail + newsletter detail → Karibu (3–4 days),**
   retiring the last legacyPrefixes and the Noir chrome for the public site.
6. **Sitewide wart, own decision:** re-layer the `.persona-pro h1-h3` rule so
   `font-newsreader` headings actually render Newsreader — the entire Karibu
   identity's serif currently silently renders Fraunces.
