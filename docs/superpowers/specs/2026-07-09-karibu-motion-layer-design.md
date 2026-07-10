# Karibu Motion Layer — Design Spec

**Date:** 2026-07-09
**Repo:** `Claude-Community-Kenya` (Next.js 16 App Router, TS strict, Tailwind v4, Framer Motion)
**Branch:** `redesign/karibu-motion` (cut off `redesign/karibu-darkmode` / PR #36; rebase onto `main` after #36 merges)
**Status:** Approved design → next step is `writing-plans`.

---

## 1. Goal

Add a restrained, premium motion layer across the warm-light "Karibu" pages, and — the central fix — **eliminate the reveal-degradation bug** so animation *enhances an already-legible page* instead of gating legibility behind a trigger that can fail.

Guiding rule (from Peter's spec): motion must either **clarify** (show relationships, state, hierarchy) or **reward** (a small delight on a key action) — never decorate. On a content-thin site, restrained motion reads premium; busy motion reads like it's hiding emptiness.

## 2. The bug being fixed

Every Karibu component defines its own local `Reveal` using Framer Motion `whileInView` with `initial={{ opacity: 0, y: 18 }}` (20 files, 77 occurrences). The `initial`-hidden state is baked into the rendered output, so **if hydration/JS fails, content is stuck invisible** (the old `ScrollReveal` variant stuck at ~30% opacity on Resources). Reduced-motion is already handled per-component (`initial={reduce ? false : ...}`), but the normal path is the degradation surface.

**Fix:** rebuild the reveal **CSS-first** — content is fully visible by default; a JS-added class *introduces* the hidden→visible transition. No JS → no class → content stays visible. Degrade-safe by construction.

## 3. Architecture — CSS-first hybrid (approved)

Framer Motion is kept **only** where it genuinely earns it (FLIP layout, hero orchestration, scroll-linked timeline). Everything else is CSS-first. `CountUp` is reused as-is.

### 3.1 Foundation — `globals.css` + one bootstrap line

**Motion tokens** (`:root`):
- `--ease-entrance: cubic-bezier(.16, 1, .3, 1)` — confident ease-out for entrances
- `--ease-reversible: cubic-bezier(.4, 0, .2, 1)` — symmetric, for hovers/reversible states
- `--dur-micro: 150ms` (hover/press), `--dur-reveal: 320ms` (entrances/reveals), `--dur-hero: 500ms` (large hero/page)
- `--reveal-shift: 18px`

**`.js` bootstrap:** extend the **existing** before-paint `<head>` IIFE in `src/app/layout.tsx` (currently sets `data-theme`) with `document.documentElement.classList.add('js')`. Runs before first paint → no flash. This class is the switch that makes reveals degrade-safe.

### 3.2 Shared reveal utility → `src/components/karibu/motion/`

- **`Reveal.tsx`** — thin client wrapper rendering `<div data-reveal>` (props: `as`, `className`, `children`, optional `stagger`). Visible by default. On mount, registers the element with a **single shared IntersectionObserver singleton** (`observer.ts`) — not one observer per element. On first intersect: add `.in-view`, then unobserve (one-time). Honors reduced-motion via CSS (no JS branch needed).
- **`observer.ts`** — module-level singleton IntersectionObserver + a `register(el)` / `unregister(el)` API. `viewport` margin `0px 0px -6% 0px`, threshold ~0.

**CSS (the degrade-safe core, in `globals.css`):**
```css
[data-reveal] { opacity: 1; }                       /* default: fully visible */
.js [data-reveal] {
  opacity: 0;
  transform: translateY(var(--reveal-shift));
  transition: opacity var(--dur-reveal) var(--ease-entrance),
              transform var(--dur-reveal) var(--ease-entrance);
  will-change: opacity, transform;
}
.js [data-reveal].in-view { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .js [data-reveal] { opacity: 1; transform: none; transition: none; }  /* instant */
}
```

**Stagger:** a `data-reveal-stagger` parent sets each child's `transition-delay: calc(var(--i, 0) * 60ms)`, **capped at 6 steps** (`--i` clamped) so long lists don't cascade forever. Applied via a small `RevealGroup` helper or inline `--i` on children.

### 3.3 Replace all 20 local `Reveal` defs with the shared one (DRY)

Single swap fixes the degradation bug site-wide and removes duplication. Files:
`KaribuAbout, KaribuBanner, KaribuBlog, KaribuCommunity, KaribuEventDetail, KaribuEvents, KaribuFaq, KaribuHome, KaribuGallery, KaribuJoin, KaribuLearn, KaribuModal, KaribuNewsletter, KaribuProjects, KaribuProjectsPage, KaribuSubmitIdea, KaribuTeam, KaribuTestimonials, KaribuSubmitProject, KaribuVolunteer`.

## 4. Build phases

| Phase | Scope |
|---|---|
| **P0 Foundation** | Motion tokens, `.js` bootstrap, shared `Reveal` + `observer` singleton + CSS + stagger helper. |
| **P1 Unify** | Swap all 20 local `Reveal` defs → shared. Fixes the degradation bug everywhere. Mechanical → delegate to Sonnet subagents on **disjoint files**; lead owns `globals.css`, the shared util, and the build gate. |
| **P2 Through-line** | Highest-value motion: <br>• **Home** — hero stagger (eyebrow→headline→subhead→buttons, ~400ms), wire existing `CountUp` to the stat row (once-on-scroll), 4 "ways we learn" cards staggered fade-up + hover lift. <br>• **Nav** — sticky-header shrink + soft bg/blur past hero (~200ms); dropdowns fade-and-slide-down 4–8px (150–200ms); "Join" hover (scale ~1.03 + tone shift); marquee pause-on-hover + reduced-motion stop. <br>• **Events** — filter transitions as **FLIP** layout animation (Framer `layout` + `AnimatePresence`) instead of hard-cut; card hover lift + date-badge accent. <br>• **Learn/Community** — card hover lift + **"Open →" arrow nudge** a few px right. |
| **P3 Craft** | • **About** — timeline scroll-linked line-draw + per-milestone reveal (Framer `useScroll`/`useInView`); story blocks simple fade-up; organiser faces soft hover (scale inside fixed frame). <br>• **Learn** — "Suggested Path" 1-2-3 steps reveal sequentially + progress indicator animating on scroll. <br>• **Community** — upvote quick scale-pop; copy-confirmation checkmark-morph; "Share something" mirrors primary-CTA hover. <br>• **Team** — **not animated** while "coming soon"; gentle staggered grid reveal + per-card hover only once populated. |

## 5. Non-negotiables (baked into every phase)

- **`prefers-reduced-motion`** → replace all movement with instant/opacity; marquee stops entirely.
- Animate **only `transform` / `opacity`** (GPU-friendly).
- Scroll reveals are **one-time** (unobserve after first fire).
- **Never gate legibility** behind an entrance. Empty / error / read-quickly states appear **instantly** — never animate attention onto "nothing here".
- **No hero parallax** (mobile-first community). No looping attention motion except the single marquee.
- Do **not** animate body paragraphs / long text.

## 6. What Framer Motion is kept for

FLIP filter transitions (Events), hero stagger orchestration (Home), scroll-linked timeline draw (About). All other reveals/hovers/micro-interactions are CSS-first. `src/components/ui/CountUp.tsx` reused unchanged.

## 7. Workflow / logistics

- **Branch:** `redesign/karibu-motion` off `redesign/karibu-darkmode`. Rebase onto `main` after PR #36 merges.
- **Gate:** `npm run build && npx tsc --noEmit` must both be clean before every commit. Conventional commits. Never commit to `main`. Auto-commit at logical checkpoints; **ask before opening/merging PRs**.
- **Verification:** no live DB locally (Supabase host unreachable) → verify motion visually on the **Vercel preview** of the PR, not just build/tsc.
- **Delegation:** P1 file swap → parallel Sonnet subagents on disjoint files. Lead (Opus) owns foundation, shared util, `globals.css`, build, and commits.

## 8. Open sign-offs carried forward (not blockers for motion, but flag at PR)

1. Testimonial name spellings in `KaribuTestimonials.tsx` (Billy Mwangi, Samuel, James Lloyd, Isaac Toili / Tuigoin).
2. `/join` application-form decision (WhatsApp-first vs form returns).

## 9. Out of scope

Un-converted dark sub-pages (`resources/*` guides, `community/[slug]`, `community/submit`, `blog/[slug]`, `newsletter/[slug]`) — a later conversion batch, not part of the motion layer.
