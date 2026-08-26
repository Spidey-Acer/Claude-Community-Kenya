# Community UI Fixes — implementation plan

**Date:** 2026-08-26
**Branch:** `claude/community-ui-fixes`
**Source:** `docs/audits/2026-08-26-community-ui-audit.md` (PR #118)

Executes the audit's recommended fix order as one PR, phased into reviewable commits.
Each phase must leave `npx tsc --noEmit` and `npm run build` clean.

## Phase 1 — Structural quick wins

- `src/lib/data.ts` — `getCommunitySubmissionBySlug`: return `null` when
  `row.type === "SHOWCASE"` (kills the `/community/<slug>` duplicate-content route).
- `src/lib/constants.ts` — add Showcase to the Community nav dropdown and the footer;
  cross-link `/community` ↔ `/showcase` from each surface's header area.
- `src/app/sitemap.ts` — add `/showcase/submit`.
- `src/app/community/[slug]/opengraph-image.tsx` — return a valid fallback ImageResponse
  instead of `null` for a missing slug.
- Delete dead components: `src/app/community/CommunityFilters.tsx`,
  `src/app/community/CommunityHeader.tsx`.
- Validate `sort`/`type` searchParams on `/community` the way `/showcase` validates via
  `isShowcaseSort` (bad values → defaults, not Prisma throws).

## Phase 2 — Karibu status tokens + hard-coded hex cleanup

- `src/app/globals.css`: add status tokens with light + dark values —
  `--success` / `--success-bg`, `--error` / `--error-bg` — registered in `@theme inline`.
- Replace the fixed-cream chip pattern `bg-[#F3E3D9] text-clay` with the theme-safe
  `border-clay/30 bg-clay/10 text-clay` in `KaribuCommunity.tsx`, `ShowcaseFeed.tsx`
  (FilterChip), `ShowcaseCard.tsx`, `NeedsChips.tsx`.
- Replace `text-[#4A4238]` inactive chips with `text-ink-soft`
  (`KaribuCommunity.tsx:102`, `ShowcaseFeed.tsx:98`).
- Replace `text-green-700` / `text-red-600` / `text-red-700` / `border-red-500` status
  colors in `ShowcaseComposer.tsx` and `MediaUploader.tsx` with the new tokens.
- `MediaUploader.tsx`: swap the `bg-ink/70 text-paper` overlay for the fixed
  `--scrim`/`--scrim-text` pair; make the remove/cancel control always visible on
  touch (no hover-only opacity) and ≥ 32px.
- `BuiltWithPanel.tsx:43`: `border-[#3B352D]` → footer-border token.

## Phase 3 — Karibu restyle of the four shared community components

`src/components/community/` — restyled with Karibu tokens (these render inside
`/showcase/[slug]` today and `/community/[slug]` after Phase 4), plus their audit fixes:

- **CommentForm**: labels wired via `htmlFor`/`id`; error gets `role="alert"`; success
  message announced (`role="status"`), copy differentiates approved vs pending using the
  API response; `router.refresh()` after submit so approved comments appear.
- **CommentList**: Karibu card styling; `suppressHydrationWarning` on relative times.
- **UpvoteButton**: Karibu styling; count kept in the accessible name; `aria-pressed`;
  `localStorage` read moved to `useEffect` (hydration fix); errors surfaced; stays
  focusable when voted (`aria-disabled` + guard instead of `disabled`).
- **CopyButton**: visible "Copied" feedback + `role="status"` announcement; clipboard
  failure handled; `type="button"`.

## Phase 4 — Karibu conversion of /community detail + submit

- Rebuild `CommunitySubmissionDetail.tsx` on the `ShowcaseDetail` layout patterns:
  Karibu tokens only, no `TerminalWindow`, no inline font styles, `break-words` on
  long content, sr-only new-tab hints on external links.
- Rebuild `/community/submit` on the `ShowcaseComposer` form patterns: labelled fields
  (`Field` helper with `htmlFor`/`id`), radiogroup semantics for the type picker,
  named tag-remove buttons (reuse the composer's `TagInputField` approach),
  `role="alert"` errors with `aria-describedby`, status tokens for error/success.
- `ConditionalLayout.tsx`: remove `"/community/"` from `legacyPrefixes` (whole surface
  is Karibu after this phase).
- Composer parity fixes while in there: `Field` helper label wiring, cover-image button
  names + `aria-pressed`, CSRF bootstrap failure message instead of a forever-disabled
  submit.

## Phase 5 — Showcase activity + ranking wiring

Decision (from audit P0-7): keep `upvoteCount` as the ranking signal but make it real —
reactions maintain it.

- `/api/showcase/[slug]/react`: on add/remove, recompute/increment the post's
  `upvoteCount` (total reactions) and set `lastActivityAt`.
- Comment creation on showcase posts sets `lastActivityAt`.
- `ShowcaseCard`: label the count as reactions (icon + accessible text), no dead "↑ 0"
  styling change needed once the count is live.

## Phase 6 — Widget semantics, live regions, loading states, pagination

- **ReportButton**: drop unimplemented `menu` roles → plain disclosure; Escape +
  outside-click close; focus restore; `role="status"` on the done message.
- **MediaGallery**: `role="tablist"` → `aria-pressed` buttons; add `controls` to the
  video; accessible name for it.
- **ShowcaseFeed** sort row: tablist roles → `aria-pressed`.
- **NeedsChips**: real `<ul><li>`, drop `role` overrides, `aria-current` on active.
- **KaribuSelect**: move `aria-activedescendant` to the focused trigger.
- **EmojiPicker**: restore focus to trigger on close; `focus-visible` ring on cells.
- **GifPicker**: label the search input; `aria-live` region for load/empty/error;
  respect `prefers-reduced-motion` for animated thumbnails (static preview until
  hover/focus when reduced).
- **MediaUploader**: `role="status"` live region for progress/completion/errors;
  inline errors instead of `window.alert`.
- **ReactionRow** signed-out: `aria-disabled` + visible "Sign in to react" hint.
- Add `loading.tsx` for `/showcase`, `/showcase/[slug]`, `/community/[slug]`
  (reuse the Skeleton components).
- Distinguish DB failure from empty on both feeds and showcase comments (error panel
  instead of "Nothing here yet").
- Pagination: wire the existing server-side `page` param into both feeds with
  prev/next links driven by `total`.
- Hydration: `suppressHydrationWarning` on `timeAgo`; pin `timeZone` on the date
  formats used in client components.

## Phase 7 — Polish sweep

- Bare counts get accessible context ("N upvotes", "N comments") in cards.
- `aria-hidden` on the decorative "## " heading prefix (goes away with Phase 4 rebuild).
- Missing `type="button"` instances.
- Touch-target bumps where cheap (CopyButton, tag-remove, emoji cells).
- h2s (sr-only where visual design has none) to fix h1 → h3 skips on both feeds.
- Event filter chip fallback label (query the event name instead of "this event" when
  the filter matches zero posts — or show the slug).

Out of scope for this PR (tracked separately): the sitewide `font-newsreader`/
`persona-pro` heading wart (needs a sitewide decision), the Showcase/Projects/Community
naming-IA decision (content strategy), showcase per-post OG image generator.

## Next phase after this PR (user-requested)

1. Production-wide audit of everything not covered here: remaining public pages,
   resources sub-pages, join/speak/volunteer flows, blog, events, projects, FAQ,
   API routes, and the admin panel.
2. **Admin is non-functional on mobile** — reported broken; diagnose and fix
   responsive behavior across `/admin/*`.
