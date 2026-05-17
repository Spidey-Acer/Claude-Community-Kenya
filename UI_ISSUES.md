# UI Issues — Visual QA Report

**Date:** 2026-05-12
**Method:** Screenshot review (dashboard, home, home+chat) + targeted code inspection
**Site:** https://claudekenya.org

This file documents **visible UI/UX issues** observed in screenshots and corroborated in source. A separate `AUDIT.md` covers security, performance, accessibility, code quality.

---

## Fixed in this pass

- [x] **Site footer rendered on `/dashboard`** — broke the "member workspace" feel.
  Fix: `src/components/layout/ConditionalLayout.tsx` now skips `<Footer />` on `/dashboard/*`.
- [x] **Dashboard inline footer "// Member features in progress…"** read like a TODO comment.
  Fix: `src/app/dashboard/page.tsx` — replaced with a 2-column "roadmap / feedback" card and a subtle wordmark line.
- [x] **Chat had no model attribution.**
  Fix: `src/components/chat/ChatInput.tsx` — added "Powered by Claude Haiku 4.5" line under the input (dev and pro variants).

---

## Open UI issues by surface

### Dashboard (`/dashboard`)

- **Header role label uses raw enum.** `role.toLowerCase().replace("_", " ")` will print `super admin` for `SUPER_ADMIN` — readable, but `MODERATOR` shows as `moderator`. Consider a `formatRole()` helper that yields title-case.
  `src/app/dashboard/page.tsx`
- **`$ cd /admin` button color (`amber`) collides with status badges.** Approved = green, rejected = red, pending = amber. The admin CTA also amber means scanning the page, the eye groups them together. Swap admin CTA to cyan or a dedicated `--accent-admin` token.
  `src/app/dashboard/page.tsx:101-107`
- **Persona toggle pill `>_ DEV  ◆ PRO`** floats centered under the navbar. On the dashboard it competes visually with the page heading "Welcome back, …". Consider hiding the persona toggle on `/dashboard` (member workspace should be one mode) or moving it into the navbar dropdown.
  `src/components/persona/PersonaToggle.tsx` (likely)
- **Empty state for "My submissions"** — block only renders when `totalSubmissions > 0`. New members see no hint that submissions will live here. Add a zero-state "// no submissions yet — try /submit-idea or /submit-project".
  `src/app/dashboard/page.tsx:205`
- **No "Member since" badge precision** — `member since May 2026` is fine, but consider showing the join-date with day for the first 90 days ("member since 12 May 2026") so brand-new joiners feel acknowledged.

### Home (`/`)

- **Hero `Claude Community Kenya` wordmark in navbar** is "Claude Community" + a Kenyan-flag flame image; the word "Kenya" is implied by the flag but not text. Acceptable for the logo but means the navbar reads "Claude Community" only in screen-reader output. Fix: `alt="Kenya"` already on the flame image — verify the navbar logo's accessible name reads "Claude Community Kenya" via `aria-label` on the wrapping link.
  `src/components/layout/Navbar.tsx`
- **`Anthropic-supported community` pill** sits above the H1. It clips on `<375px` viewports. Add `max-w-[90vw] truncate` or a smaller xs: variant.
- **Hero CTA stack** — "Join the Community →", "Browse Events", "Resources" — works at desktop but stacks vertically on mobile with equal weight. Consider visually emphasizing "Join the Community" as primary and demoting the other two to text links on mobile.
- **Map illustration (orange Kenya map with network nodes)** is a `.webp` or `.png`. If it's a raster, swap to SVG for crisp scaling on high-DPI mobile — the network lines look slightly soft in screenshot 3.
- **Stats row "808+ MEMBERS · 8 EVENTS · 2 CITIES"** — labels are uppercase but use the same color as the number, so at a glance numbers and labels visually blur. Add `text-text-dim` on labels and keep numbers `text-text-primary`.

### Chat widget

- **Close button** — dev variant has `[x]` and pro variant has an "×" circle button. Both work but the dev `[x]` overlaps the header on narrow screens because the header has `pr-3` while the close button sits at `right-2 top-2`. Either: (a) bump header right padding to `pr-9`, or (b) move close button into the header.
  `src/components/chat/ChatWidget.tsx:14-22`
- **"hello where am i?" → 4 paragraph response** (screenshot 2) — the LLM is verbose. Consider tightening the system prompt to "Default to ≤3 sentences. Use bullets only when listing ≥3 items."
  `src/lib/chat/system-prompt.ts`
- **Suggestion chips** disappear after first message. Add a tiny "/help" or "/reset" hint near the input so returning users can re-trigger suggestions.
- **Input doesn't auto-grow.** `<textarea rows={1}>` with `max-h-24` is fine, but the textarea height never expands while typing multi-line. Add `onChange`-driven auto-resize using `scrollHeight`.
  `src/components/chat/ChatInput.tsx`

### Site-wide footer (`Footer.tsx`)

- **Column titles `CCK`, `Quick Links`, `Community`, `Resources`, `Cities`** are inconsistently styled — `CCK` is a wordmark; the rest are descriptive headers. Either make `CCK` say `Claude Community Kenya` for symmetry or treat all five as small caps.
  `src/components/layout/Footer.tsx`
- **`📍 Nairobi, Kenya` and `✉ claudecommunitykenya@gmail.com`** use emoji icons. Swap to Lucide icons (`MapPin`, `Mail`) for visual consistency with the rest of the site.
- **Subscribe input** placeholder `you@email.com` is fine; but the input has no `name`, no `required`, and submits without showing inline validation. Verify the Subscribe form in `src/components/layout/Footer.tsx` posts to `/api/newsletter` with proper feedback.
- **`Personalize ⏵`** button bottom-right of the legal strip is unlabeled (just `Personalize`). Add an icon and a small description tooltip — users won't know it opens the persona modal.
- **Legal copy block** is long and uppercase-heavy: "Anthropic-supported community initiative... not an official division or representative body of Anthropic PBC." Considering compressing to two sentences and link to a `/legal` page for the rest.

### Misc

- **Brave browser screenshot shows the Brave shield with 2 trackers blocked** — the home page loads ≥2 third-party trackers. Audit your loaded scripts (`next/script`) and remove anything not strictly needed (Google Analytics? Plausible? Self-host where possible).
- **OS-level rendering issue (Brave on Win11):** the kenya flame `webp` in the navbar appears to flicker subtly between animation frames. If `prefers-reduced-motion` is set, the `kenya-flame-glow` and `kenya-flame-sway` animations should be disabled — verify in `globals.css`.

---

## Visual consistency observations

- **Three accent colors** (green-primary, amber, cyan) used as card accents on the dashboard. Each card picks one. There's no system mapping accent→category, so the choice looks decorative. Either: (a) document a mapping (green = personal, amber = action, cyan = explore), or (b) use a single accent and let icon shape carry meaning.
- **Spacing scale is consistent** (mostly multiples of 4) — good.
- **Font pairing** (JetBrains Mono headings + IBM Plex Sans body) reads well; no issue.
- **Dark-on-dark text** — `text-text-dim` on `bg-bg-primary` (#0a0a0a) — measure contrast: estimated ratio is around 4.0:1, which fails WCAG AA for normal text. See `AUDIT.md` accessibility section.

---

## Quick wins (≤30 min each)

1. Add a "no submissions yet" empty state on dashboard.
2. Increase `text-text-dim` lightness by ~10% to clear WCAG AA.
3. Swap footer emoji icons for Lucide.
4. Tighten chat system prompt for shorter default answers.
5. Add `aria-label="Claude Community Kenya"` to navbar logo link.
6. Auto-resize chat textarea.
