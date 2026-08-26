# Community UI Audit — /community + /showcase

**Date:** 2026-08-26
**Scope:** The two public community surfaces and everything they compose:
`/community` (hub listing, `[slug]` detail, `submit`), `/showcase` (feed, `[slug]` detail, `submit`),
`src/components/community/*`, `src/components/karibu/showcase/*`, plus the nav/layout,
sitemap, and metadata that expose them.
**Method:** Three parallel review passes — design-system compliance, accessibility, and
UX/SEO/correctness — with every high-severity finding re-verified against the source.
**Baseline:** `npx tsc --noEmit` passes clean on this branch (post-PR #117 merge).

---

## Executive summary

The `/showcase` surface shipped in PR #117 is in good shape structurally — clean metadata,
`notFound()` handling, pending states, and some genuinely exemplary components
(ReactionRow, EmojiPicker, GifPicker, BuiltWithPanel, the loading skeleton). The problems
cluster in four places:

1. **The /community surface is stuck mid-migration.** The listing is Karibu, but the
   detail page, submit form, and all four shared comment/upvote components still render
   the admin-only Terminal Noir theme on public routes — and two of those Noir components
   are composed straight into the otherwise-Karibu `/showcase/[slug]` page.
2. **`/showcase` is an orphan.** No nav, footer, or on-site link reaches it, and showcase
   posts are also reachable at `/community/<slug>` as duplicate pages with a competing
   canonical.
3. **Dark mode breaks where hard-coded hexes replaced tokens.** A copy-pasted
   `text-[#4A4238]` chip and a repeated `bg-[#F3E3D9]` badge pattern render at roughly
   1.5–2.6:1 contrast in dark mode; the composer's success message is effectively
   invisible there.
4. **Forms are inaccessible at the label level.** Neither submit form associates labels
   with inputs, so screen readers announce every field unnamed; errors and async states
   (upload progress, comment success, copy) are never announced.

Also notable: showcase upvotes are displayed and drive two of the four sort orders, but
**no write path exists** — every post shows "↑ 0" and the Popular sort is degenerate.

Finding counts: **14 high**, **21 medium**, **17 low**. Recommended fix order is at the end.

---

## P0 — High severity

### 1. Terminal Noir on public /community routes (wrong design system)

`src/components/layout/ConditionalLayout.tsx:58` lists `"/community/"` (trailing slash) as
a legacy prefix but not `/community` itself, so the listing is Karibu while everything one
click deeper is Noir. CLAUDE.md is explicit: Terminal Noir is for `/admin`, `/dashboard`,
`/judge`, `/timer` only.

- `src/app/community/[slug]/page.tsx:61` — `bg-bg-primary` (#0a0a0a) page background on a
  public route. A visitor clicks a warm paper card and lands on a black terminal page with
  a different navbar.
- `src/app/community/[slug]/CommunitySubmissionDetail.tsx` — dual-skinned Noir/persona-pro
  throughout: Noir accent tokens (`text-cyan`, `text-green-primary`, `text-amber` — lines
  27–32, 62, 85, 168), `TerminalWindow` chrome (226–237, 259–266), ~15 hard-coded
  persona-pro hexes (`text-[#faf9f5]`, `text-[#9a9890]`, `bg-[#252524]`,
  `bg-[#d97757]`, `bg-[#0f0f0e]`, …), Noir text/border tokens (`text-text-primary`,
  `border-border-default`), and inline `style={FRAUNCES}` font objects (15–18, 53, 112)
  in violation of the no-inline-styles convention.
- `src/app/community/submit/page.tsx` — entirely Noir: `bg-bg-primary` (96, 118), green
  accents on every input and CTA (98–99, 179, 192, 205, 217, 226, 239, 269, 295, 305, 316),
  Noir `text-red` errors (136, 145, 254, 343), `bg-bg-card`/`text-text-*` surfaces
  throughout. Linked directly from the Karibu listing's "Share something" CTA
  (`KaribuCommunity.tsx:78`), so the theme switch is one click deep.
- `src/components/community/UpvoteButton.tsx:56-63`, `CopyButton.tsx:9`,
  `CommentList.tsx:26-47`, `CommentForm.tsx:53-103` — all four shared components are
  Noir-only (green-primary accents, `bg-bg-card` #161616 surfaces, `font-mono`, Noir red).

**Fix:** convert `/community/[slug]` and `/community/submit` to Karibu (the
`ShowcaseDetail`/`ShowcaseComposer` patterns are the template), restyle the four shared
components with Karibu tokens, then remove `"/community/"` from `legacyPrefixes`.

### 2. Noir comment components inside the Karibu showcase detail page

`src/components/karibu/showcase/ShowcaseDetail.tsx:11-12,154-163` imports and renders
`CommentForm` and `CommentList` from `src/components/community/`. On `/showcase/[slug]`
the comments section renders as near-black terminal cards (#161616), neon-green author
names (#00ff41), monospace type, and a green-focus input in the middle of the warm-light
layout — in **both** themes, since Noir tokens never invert. One Karibu restyle of the two
shared components fixes `/showcase` immediately and `/community` after its conversion.

### 3. /showcase is unreachable from the site (orphan surface)

`src/lib/constants.ts` NAV_LINKS (20–51) and FOOTER_SECTIONS (69–110) contain no
`/showcase` entry; neither `KaribuNav` nor `KaribuFooter` nor any page links it. Outside
its own directory it appears only in `sitemap.ts` and an admin page. Users can reach it
only by URL; internal-link equity is zero. **Fix:** add it to the Community nav dropdown
and footer (and cross-link `/community` ↔ `/showcase`).

### 4. Showcase posts are duplicate content at /community/&lt;slug&gt;

`src/lib/data.ts:688-696` — `getCommunitySubmissionBySlug` checks only
`status !== "APPROVED"` and does **not** exclude `type === "SHOWCASE"` (the list query
carefully does, `data.ts:657-667`, as does the inverse guard in
`src/lib/showcase/queries.ts:184`). So `/community/<showcase-slug>` renders the showcase
post through the Noir detail page — with a raw "SHOWCASE" badge and an empty color class
(`CommunitySubmissionDetail.tsx:97`) — and `generateMetadata`
(`community/[slug]/page.tsx:33-35`) emits `canonical: /community/<slug>`, competing with
the real `/showcase/<slug>` canonical. **Fix:** return `null` from
`getCommunitySubmissionBySlug` when `row.type === "SHOWCASE"`.

### 5. Dark-mode contrast breakages from hard-coded hexes in Karibu components

The adaptive dark mode re-defines tokens only; these literals don't flip:

- `src/components/karibu/KaribuCommunity.tsx:102` and
  `src/components/karibu/showcase/ShowcaseFeed.tsx:98` — inactive chip
  `bg-paper-card text-[#4A4238]`: in dark mode `--paper-card` becomes #221d17 while the
  text stays #4A4238 → ~1.5:1, unreadable. (The sort chips beside them correctly use
  `text-ink-muted` — same widget, two colors, one broken.)
- Fixed-cream chip pattern `bg-[#F3E3D9] text-clay` in four places —
  `KaribuCommunity.tsx:168`, `ShowcaseFeed.tsx:174` (+ `hover:bg-[#EAD3C4]`),
  `ShowcaseCard.tsx:69`, `NeedsChips.tsx:34`: background never flips while `text-clay`
  lightens to #d2704a → ~2.6:1 on the cream chip, below AA at badge sizes, and the chip
  clashes on dark cards. The theme-safe pattern already exists in the same codebase:
  `border-clay bg-clay/10 text-clay` (`ShowcaseComposer.tsx:461`, `ReactionRow.tsx:82`) —
  unify on it.
- `src/components/karibu/showcase/ShowcaseComposer.tsx:144` — success message
  `text-green-700` (#15803d) on dark `paper-card` ≈ 1.9:1 — effectively invisible;
  `:498` `text-red-700` on translucent red over dark ≈ 2.5:1; `:149,604` `text-red-600`
  ≈ 3.4:1 at 12px. `MediaUploader.tsx:223-224` same `text-red-600` issue. Karibu defines
  no status tokens — add error/success tokens with dark-mode values and use them in both
  forms (community submit currently uses Noir `text-red`/`green-primary` for the same
  jobs).
- `src/components/karibu/showcase/MediaUploader.tsx:203,239` — remove/cancel overlay uses
  `bg-ink/70 text-paper` over a photograph: the documented footer-bug anti-pattern. In
  dark mode ink flips light and paper flips dark while the photo doesn't change. Use the
  fixed `--scrim`/`--scrim-text` pair globals.css provides for exactly this.

### 6. Form labels never associated with inputs (screen readers announce unnamed fields)

- `src/app/community/submit/page.tsx:328-349` — the `Field` wrapper renders a bare
  `<label>` with no `htmlFor`, and no input has an `id`/`aria-label`. Affects all nine
  fields (171, 185, 198, 212, 221, 233, 262, 289, 299). Clicking a label doesn't focus
  the field.
- `src/components/karibu/showcase/ShowcaseComposer.tsx:591-601` — same pattern in the
  composer's `Field` helper; affects Title, Short description, Full description
  (345–352), Project/Repository URL, the three tag inputs, and Tokens per run. Only
  `KaribuSelect` is properly labelled.
- `src/app/community/submit/page.tsx:254-256` — tag-remove buttons are icon-only with no
  `aria-label` (the composer's `TagInputField` does it right:
  `aria-label={`Remove ${item}`}`, `ShowcaseComposer.tsx:560`).
- `src/app/community/submit/page.tsx:143-167` — the Resource Type picker is an exclusive
  choice exposed with no `role="radiogroup"`/`aria-pressed`; selection is conveyed by
  color only, and its `<label>` labels nothing.
- `src/components/karibu/showcase/ShowcaseComposer.tsx:389-401` — cover-image pick
  buttons have an empty accessible name when the image `alt` is empty (typical for
  uploads) and selected state is border-color only.

### 7. Showcase upvotes: rendered and ranked on, but impossible to cast

`ShowcaseCard.tsx:79-82` displays `post.upvoteCount`; "Popular" sorts by it
(`queries.ts:151`) and "Hot" weights `upvoteCount + 1` (`ranking.ts:24`). But no upvote
control exists anywhere on the showcase surface and there is no
`/api/showcase/*/upvote` route (only `react`). Every post shows a dead "↑ 0", and
Popular degenerates to arbitrary order. Related: `lastActivityAt` — the basis of Hot
decay and the sitemap's `lastModified` — is written only at post creation
(`src/app/api/showcase/route.ts:210`); neither reactions nor comments update it, so
"activity-decayed" ranking is currently just time-decayed recency. **Decide:** either add
an upvote affordance (or map reactions onto `upvoteCount`), or drop the count from cards
and base Popular/Hot on reactions — and bump `lastActivityAt` on reactions/comments.

---

## P1 — Medium severity

### Widget semantics and keyboard support

- **ReportButton** (`karibu/showcase/ReportButton.tsx:57-91`): declares
  `aria-haspopup="menu"` + `role="menu"/"menuitem"` but implements none of the menu
  keyboard pattern — no arrow keys, no focus move on open, no Escape, no outside-click
  close, no focus restore; after submit, the focused node unmounts and the "done" message
  isn't announced (51–53). Either implement the APG menu pattern or drop the menu roles
  for a plain disclosure (EmojiPicker in the same directory is the good example to copy).
- **MediaGallery** (`karibu/showcase/MediaGallery.tsx:60-90`): thumbnails claim
  `role="tablist"/"tab"` with no tabpanel, no `aria-controls`, no arrow-key nav — SRs
  announce a widget whose keyboard model doesn't exist. Also the mp4 renders
  `muted loop autoPlay` with **no `controls`** (35–46) — a looping video users can't
  pause (WCAG 2.2.2). Use `aria-pressed` buttons and add `controls` (reduced-motion
  autoplay gating is already correct).
- **ShowcaseFeed sort row** (`ShowcaseFeed.tsx:83-105`): same tablist misuse for what are
  navigation buttons; `aria-pressed` (as KaribuCommunity uses) is correct.
- **NeedsChips** (`NeedsChips.tsx:22-40`): `role="listitem"` on `<Link>` overrides the
  link role — links stop being announced/discoverable as links. Use real `<ul><li>` and
  add `aria-current` for the active chip.
- **KaribuSelect** (`karibu/KaribuSelect.tsx:159-164`): `aria-activedescendant` sits on
  the listbox while DOM focus stays on the trigger — the active option is never announced
  while arrowing. Move it to the trigger (or focus the listbox).
- **EmojiPicker** (`EmojiPicker.tsx:71-73,118-122`): closing (select or Escape) unmounts
  the focused node without restoring focus to the trigger; cell focus style is a 10%
  tint behind `focus:outline-none`.

### Async feedback never announced (and sometimes wrong)

- **CommentForm** (`components/community/CommentForm.tsx`): placeholder-only fields
  (76–96), error div with no `role="alert"` (69–73), success replaces the form silently
  (51–65) — and the success copy always says "pending approval" even though
  `src/lib/showcase/comment-status.ts` auto-approves verified members, whose live comment
  then doesn't appear until a manual reload (no `router.refresh()`).
- **MediaUploader** (`MediaUploader.tsx:210-244`): progress, "Processing…", and errors
  are visual-only — no `role="status"`/`aria-live`; client-side rejections use
  `window.alert` (80, 88, 93). The remove control is also `opacity-0` until hover
  (213) — invisible on touch devices, and ~20px when visible.
- **GifPicker** (`GifPicker.tsx:110-155`): unlabelled search input; loading/empty/error
  transitions have no live region; GIF thumbnails animate with no
  `prefers-reduced-motion` gating or pause (the one motion gap in an otherwise compliant
  motion setup).
- **UpvoteButton** (`UpvoteButton.tsx`): `aria-label` replaces the name so the count is
  hidden from SRs; voting disables the button (removing it from focus order) with no
  announcement; failures are swallowed silently (45–46); and the `voted` state is read
  from `localStorage` in a `useState` initializer (15–18) — a server/client hydration
  mismatch for returning voters. Move to `useEffect`.
- **CopyButton** (`CopyButton.tsx:5-15`): no "Copied" feedback for anyone, visual or
  announced, and the clipboard promise result is unchecked.
- **ReactionRow** (`ReactionRow.tsx:69-90`): signed-out state uses `disabled` +
  `title` only — unfocusable and undiscoverable for keyboard/SR/touch users. Prefer
  `aria-disabled` with a visible "Sign in to react" hint. (Otherwise the best-built
  component in the set.)
- **Both submit forms**: top-level and field errors lack `role="alert"`/
  `aria-describedby` (`community/submit/page.tsx:135-139`,
  `ShowcaseComposer.tsx:497-502,603-605`); field error state is border-color-only.

### Loading, error, and resilience gaps

- **No `loading.tsx` under /showcase** (nor `/community/[slug]` or `/community/submit`)
  while `/community` has a full skeleton. Worst on `/showcase/[slug]`, which reads
  session cookies (`ShowcaseDetail.tsx:40`) and is therefore dynamic on every hit —
  slow render, zero feedback.
- **DB failure renders as "empty":** `community/page.tsx:35`, `showcase/page.tsx:36`,
  and `showcase/[slug]/page.tsx:44` all `.catch(() => empty)` — an outage shows
  "Nothing here yet — be the first" instead of an error state.
- **CSRF bootstrap failure bricks the composer silently:**
  `ShowcaseComposer.tsx:230-234` — if `/api/csrf-token` fails, the submit button stays
  disabled forever with no message (CommentForm's fetch-at-submit pattern surfaces
  failures and is the better model).
- **No pagination on either feed:** both pages fetch the default `limit: 20`
  (`data.ts:655`, `queries.ts:87`) and render a total-count chip ("42 posts") while
  capping at 20 cards with no way to reach the rest — the server-side pagination is
  implemented and unused.
- **Unvalidated params on /community:** `community/page.tsx:31` casts
  `sort`/`type` without validation (contrast `isShowcaseSort` on `/showcase`);
  `?type=GARBAGE` throws inside Prisma and the catch renders the misleading empty state.
- **`/community/[slug]/opengraph-image.tsx:33-35` returns `null`** for a missing slug —
  a 500 on that image URL instead of a valid fallback response.

### Hydration and dates

- `CommentList.tsx:7-20` — `timeAgo` runs `Date.now()` on server then client
  ("5m ago" vs "6m ago" text mismatch), no `suppressHydrationWarning`.
- `CommunitySubmissionDetail.tsx:147-152` — `toLocaleDateString("en-KE", …)` in a client
  component pins locale but not timezone; server-UTC vs client-EAT can differ across
  midnight. (`ShowcaseDetail` makes the same call but server-side only, so it merely
  renders the UTC date.)

### IA / naming

- Three overlapping surfaces pitch the same inventory: "Community Hub" (`/community`),
  "Showcase" (`/showcase`), and "Projects" (`/projects`, nav-described as "What members
  are shipping with Claude" — the Showcase's exact pitch). The showcase empty state even
  invites "Shipped an MCP, a prompt, a demo…?" — the community hub's inventory. Worth a
  deliberate naming/IA decision alongside fixing P0-3.

---

## P2 — Low severity / polish

- **Dead code:** `src/app/community/CommunityFilters.tsx` and `CommunityHeader.tsx`
  (incl. `CommunityEmpty`, `CommunityCountChip`) are imported by nothing — superseded by
  `KaribuCommunity`. They're also non-compliant (hard-coded persona-pro hexes, Noir
  tokens; `CommunityHeader.tsx:78` even hard-codes the #7a7870 gray that globals.css
  documents as bumped for failing WCAG AA). Delete them.
- **`font-newsreader` on headings (dead class):** 15 heading usages across
  `KaribuCommunity.tsx` (69, 172), `ShowcaseFeed.tsx` (64), `ShowcaseCard.tsx` (57),
  `ShowcaseDetail.tsx` (65, 152), `ShowcaseComposer.tsx` (69, 129, 303, 316, 379, 409,
  446, 451, 472) — all silently render Fraunces via `.persona-pro h1,h2,h3`. The 3
  non-heading usages (`KaribuCommunity.tsx:144`, `ShowcaseFeed.tsx:136,149`) work and
  must not be blanket-deleted. These add to the documented sitewide wart — resolve with
  the sitewide fix, not per-file.
- **Touch targets:** CopyButton ≈26px, EmojiPicker cells 28px, sort chips ≈28px tall,
  tag-remove X buttons 12px icons.
- **Overflow:** detail-page descriptions/titles (`ShowcaseDetail.tsx:117-121`,
  `CommunitySubmissionDetail.tsx:216-236`) lack `break-words` — a pasted long URL
  overflows on narrow screens.
- **`target="_blank"` links** ("Visit Resource/project", "GitHub Repo", "View source")
  have correct `rel` but no "(opens in new tab)" hint.
- **Heading skips:** both feeds go h1 → h3 with no h2.
- **Sitemap:** `/showcase/submit` missing while `/community/submit` is present
  (`sitemap.ts:53`); `/showcase/[slug]` has no bespoke `opengraph-image` while
  `/community/[slug]` has a 266-line one — posts without covers get the generic root card.
- **BuiltWithPanel.tsx:43:** hard-coded `border-[#3B352D]` duplicates `--footer-border`
  — renders fine (non-inverting panel) but should be a token.
- **ShowcaseFeed.tsx:57:** event filter label degrades to "Event: this event" when the
  filter matches zero posts.
- **Missing `type="button"`** (currently outside forms, fragile): `UpvoteButton.tsx:52`,
  `CopyButton.tsx:7`, `CommentForm.tsx:57`.
- **Bare counts in cards:** upvote icons are `aria-hidden` so SRs hear "12" with no
  context (`ShowcaseCard.tsx:79-87`, `KaribuCommunity.tsx:189-195`).
- **`CommunitySubmissionDetail.tsx:63-64`:** decorative "## " prefix not `aria-hidden`.
- **Duplicated-but-divergent patterns** to collapse during the Karibu conversion: two
  tag inputs, two filter bars, two CSRF strategies, two submit-success flows
  ("inline panel" vs "redirect to post").

---

## What's in good shape

- `npx tsc --noEmit` clean; no dead internal links found in these surfaces.
- Reduced-motion: global resets in `globals.css:670-710` plus `useReducedMotion` in
  ScrollReveal/MediaGallery cover everything except GIF thumbnails and the unpausable
  video noted above.
- `src/app/community/loading.tsx` + `Skeleton.tsx` — exemplary accessible skeleton.
- Metadata/canonicals exist on all six routes in scope (these are *not* part of the
  known sitewide metadata gap); showcase detail pages are in the sitemap with real
  `lastModified`, limit-guarded.
- `notFound()` on bad slugs; pending/double-submit protection on every mutating control.
- Clean components: ReactionRow, EmojiPicker (minus focus-restore), GifPicker (minus
  live regions), MediaGallery's token use, BuiltWithPanel, ReportButton's Karibu styling,
  `robots.ts`, both submit layouts, `showcase/page.tsx`, `showcase/[slug]/page.tsx`.
- `next/image` remotePatterns cover R2; the three raw `<img>` uses are justified and
  lint-suppressed.

---

## Recommended fix order

1. **Karibu conversion of /community detail + submit + the four shared components**
   (P0-1, P0-2) — collapses ~40 individual findings, unblocks removing `"/community/"`
   from `legacyPrefixes`, and fixes the showcase comments section as a side effect.
2. **One-line data fix:** exclude SHOWCASE in `getCommunitySubmissionBySlug` (P0-4).
3. **Link /showcase** from nav + footer, cross-link the two hubs (P0-3), and settle the
   Showcase/Projects naming overlap.
4. **Token pass:** replace `text-[#4A4238]`, the `bg-[#F3E3D9]` chip pattern (→
   `bg-clay/10`), and the red/green status colors with new Karibu status tokens; fix the
   `bg-ink/70` scrim (P0-5).
5. **Forms accessibility pass:** `htmlFor`/`id` wiring in both `Field` helpers,
   `aria-label` on tag-remove buttons, radiogroup semantics on the type picker,
   `role="alert"` + `aria-describedby` on errors (P0-6).
6. **Decide the showcase upvote story** and wire `lastActivityAt` to reactions/comments
   (P0-7).
7. Work the P1 list — widget semantics (ReportButton/MediaGallery/tablists), live
   regions, loading states, pagination, hydration fixes.
8. Sweep P2 with the above (delete dead components while converting /community).
