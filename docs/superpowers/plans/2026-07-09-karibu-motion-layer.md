# Karibu Motion Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a restrained, degrade-safe motion layer across the warm-light "Karibu" pages, and eliminate the reveal-degradation bug so animation enhances an already-legible page instead of gating legibility behind a trigger that can fail.

**Architecture:** CSS-first hybrid. The reveal is rebuilt CSS-first — content is fully visible by default; a before-paint `.js` class on `<html>` *introduces* the hidden→visible transition, and a single shared IntersectionObserver singleton adds `.in-view` once per element. Framer Motion is kept **only** for genuine layout/orchestration work: Events FLIP filter, Home hero stagger, About timeline scroll-draw. All 17 local `Reveal` copies collapse into one shared `Reveal` component. `CountUp` is reused unchanged.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript strict, Tailwind CSS v4 (`@theme inline` + CSS variables), Framer Motion, `next/font`.

## Global Constraints

Copied verbatim from the spec — every task implicitly includes these:

- **Gate:** `npm run build && npx tsc --noEmit` must **both** be clean before **every** commit. `next build` runs ESLint (no `ignoreDuringBuilds`); `@typescript-eslint/no-unused-vars` is an error, so **every now-unused import must be removed** or the build fails.
- **Conventional commits.** Never commit to `main`. Stay on `redesign/karibu-motion`. Auto-commit at logical checkpoints; **ask before opening/merging any PR.**
- **`prefers-reduced-motion: reduce` → instant.** Replace all movement with opacity/instant; the marquee stops entirely.
- **Animate only `transform` / `opacity`** (GPU-friendly). No animating layout properties (width/height/top/left), except Framer `layout` FLIP which is transform-based under the hood.
- **Scroll reveals are one-time** — `unobserve` after first fire.
- **Never gate legibility behind an entrance.** Empty / error / read-quickly states appear **instantly** — never animate attention onto "nothing here".
- **No hero parallax.** No looping attention motion except the single marquee.
- **Do not animate body paragraphs / long text.**
- **No live DB locally** (Supabase host unreachable) → the build gate is necessary but **not sufficient**; motion must be verified visually on the **Vercel preview** of the PR.
- **Delegation:** P1's mechanical 20-file swap → parallel Sonnet subagents on **disjoint files**. The lead (Opus) owns `globals.css`, the shared util, `layout.tsx`, the build gate, and **all commits**.

**Testing note (intentional TDD deviation, per Iron Rules "state it when a default doesn't fit"):** This repo has no DOM/component test runner wired for CSS-driven motion, and the deliverable is inherently visual with no live DB locally. So per-task verification is: (1) `npm run build && npx tsc --noEmit` clean, (2) targeted DOM/CSS assertions where cheap (grep for the class/attribute), and (3) visual confirmation on the Vercel preview at the PR gate. Where a genuine unit is testable (the observer's one-time semantics), a lightweight assertion is included.

---

## File Structure

**New files:**
- `src/components/karibu/motion/observer.ts` — module-level singleton `IntersectionObserver` + `register(el)` / `unregister(el)`. One-time: adds `.in-view` on first intersect, then unobserves.
- `src/components/karibu/motion/Reveal.tsx` — thin `"use client"` wrapper rendering `<div data-reveal>`, visible by default. Registers with the observer on mount, unregisters on unmount. Optional `index` prop sets `--i` for stagger.

**Modified (foundation — lead only):**
- `src/app/globals.css` — motion tokens in the existing `:root` (line 6); degrade-safe reveal CSS + reduced-motion block (new section).
- `src/app/layout.tsx` — extend the existing before-paint `<head>` IIFE (lines 228–233) to add `.js` to `<html>`.

**Modified (P1 mechanical swap — 17 files, delegated on disjoint sets):**
`KaribuAbout, KaribuBlog, KaribuCommunity, KaribuEventDetail, KaribuEvents, KaribuFaq, KaribuGallery, KaribuHome, KaribuJoin, KaribuLearn, KaribuNewsletter, KaribuProjects, KaribuProjectsPage, KaribuSubmitIdea, KaribuSubmitProject, KaribuTeam, KaribuVolunteer` — each: delete local `Reveal`, import shared, fix imports.
(`KaribuBanner, KaribuModal, KaribuTestimonials` have **no** `Reveal` — untouched in P1.)

**Modified (P2/P3 craft — lead + frontend-design):**
- `KaribuHome.tsx` (hero stagger already Framer; wire `CountUp` into TrustBar; stagger the 4 "what we do" cards; card hover lift).
- `KaribuNav.tsx` (sticky-shrink on scroll; "Join" hover scale).
- `KaribuEvents.tsx` (FLIP filter transition).
- `KaribuLearn.tsx`, `KaribuCommunity.tsx` (card hover lift + "Open →" arrow nudge).
- `KaribuAbout.tsx` (timeline scroll-draw), `KaribuTeam.tsx` (grid reveal only once populated).

---

## Interfaces (shared contract used across tasks)

```ts
// src/components/karibu/motion/observer.ts
export function register(el: Element): void;   // observe; on first intersect add "in-view" + unobserve
export function unregister(el: Element): void; // stop observing (cleanup)

// src/components/karibu/motion/Reveal.tsx
export function Reveal(props: {
  children: React.ReactNode;
  className?: string;
  index?: number;   // optional stagger index (0-based); CSS caps delay at 6 steps
}): React.JSX.Element;   // renders <div data-reveal ...>
```

Import path everywhere: `import { Reveal } from "@/components/karibu/motion/Reveal";`

**CSS contract (globals.css):** `[data-reveal]` visible by default; `.js [data-reveal]` hidden + transitioned; `.js [data-reveal].in-view` visible; stagger via inline `--i` (`transition-delay: calc(min(var(--i,0),5) * 60ms)`).

---

# Phase P0 — Foundation

## Task 1: Motion tokens + degrade-safe reveal CSS

**Files:**
- Modify: `src/app/globals.css` (add tokens to existing `:root` block at line 6; add reveal CSS as a new section)

**Interfaces:**
- Produces: the CSS custom properties `--ease-entrance`, `--ease-reversible`, `--dur-micro`, `--dur-reveal`, `--dur-hero`, `--reveal-shift`; the `[data-reveal]` / `.js [data-reveal]` / `.in-view` rules that `Reveal.tsx` (Task 3) and every P1 swap rely on.

- [ ] **Step 1: Add motion tokens to the existing `:root` block.**

In `src/app/globals.css`, inside the existing `:root { ... }` that starts at line 6 (which holds font stacks), append before its closing brace:

```css
  /* ─── Motion tokens (Karibu motion layer) ─── */
  --ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);   /* confident ease-out for entrances */
  --ease-reversible: cubic-bezier(0.4, 0, 0.2, 1);  /* symmetric, for hovers/reversible states */
  --dur-micro: 150ms;   /* hover / press */
  --dur-reveal: 320ms;  /* entrances / reveals */
  --dur-hero: 500ms;    /* large hero / page */
  --reveal-shift: 18px;
```

- [ ] **Step 2: Add the degrade-safe reveal section.**

Add a new section immediately **after** the existing `/* ─── Reduced Motion ─── */` block (ends at line 611, the `@media (prefers-reduced-motion: reduce)` global reset) and **before** the `/* ─── Karibu identity ─── */` block:

```css
/* ─── Karibu degrade-safe reveal ──────────────────────────────────────────
 * Content is fully visible by default. The before-paint `.js` class (set in
 * layout.tsx) introduces the hidden→visible transition; a shared observer
 * adds `.in-view` once per element. No JS → no `.js` → content stays visible.
 * Only opacity/transform animate. Reduced-motion → instant + always visible. */
[data-reveal] {
  opacity: 1;
}
.js [data-reveal] {
  opacity: 0;
  transform: translateY(var(--reveal-shift));
  transition:
    opacity var(--dur-reveal) var(--ease-entrance),
    transform var(--dur-reveal) var(--ease-entrance);
  transition-delay: calc(min(var(--i, 0), 5) * 60ms); /* stagger, capped at 6 steps */
  will-change: opacity, transform;
}
.js [data-reveal].in-view {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .js [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
    transition-delay: 0ms;
  }
}
```

- [ ] **Step 3: Verify the gate.**

Run: `npx tsc --noEmit`
Expected: clean (CSS changes don't affect types, but confirms nothing broke).

Run: `npm run build`
Expected: builds clean. Then grep the built/updated source to confirm the rules exist:
Run: `grep -n "data-reveal\|--ease-entrance\|--dur-reveal" src/app/globals.css`
Expected: shows the token defs and all three `[data-reveal]` rules + the reduced-motion override.

- [ ] **Step 4: Commit.**

```bash
git add src/app/globals.css
git commit -m "feat(karibu-motion): motion tokens + degrade-safe reveal CSS"
```

---

## Task 2: `.js` before-paint bootstrap

**Files:**
- Modify: `src/app/layout.tsx` (the existing theme-init `<script>` IIFE, lines 228–233)

**Interfaces:**
- Consumes: nothing.
- Produces: `document.documentElement` carries class `js` before first paint. This is the switch that activates `.js [data-reveal]` from Task 1.

- [ ] **Step 1: Extend the existing IIFE to add the `js` class first.**

In `src/app/layout.tsx`, the current script (lines 228–233) is:

```tsx
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('cck-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
        />
```

Replace the `__html` string so `.js` is added **before** the `try` (so it runs even if `localStorage` throws):

```tsx
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){document.documentElement.classList.add('js');try{var t=localStorage.getItem('cck-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
        />
```

Update the adjacent comment (lines 224–227) to mention it also sets `.js` for the motion layer.

- [ ] **Step 2: Verify the gate.**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run build`
Expected: builds clean.

Run: `grep -n "classList.add('js')" src/app/layout.tsx`
Expected: one match inside the before-paint IIFE.

- [ ] **Step 3: Commit.**

```bash
git add src/app/layout.tsx
git commit -m "feat(karibu-motion): add before-paint .js class for degrade-safe reveals"
```

---

## Task 3: Shared `observer` singleton + `Reveal` component

**Files:**
- Create: `src/components/karibu/motion/observer.ts`
- Create: `src/components/karibu/motion/Reveal.tsx`

**Interfaces:**
- Consumes: the CSS `data-reveal` / `.in-view` contract from Task 1.
- Produces: `register(el)`, `unregister(el)` (observer.ts); `Reveal` component (Reveal.tsx) — the single import every P1 file will use.

- [ ] **Step 1: Write `observer.ts`.**

Create `src/components/karibu/motion/observer.ts`:

```ts
/**
 * Shared IntersectionObserver singleton for the Karibu degrade-safe reveal.
 *
 * One observer instance for the whole page (not one per element). On an
 * element's first intersection it adds `.in-view` and unobserves it, so every
 * reveal fires exactly once. Constructed lazily on first `register` — which is
 * only ever called from a client `useEffect`, so `IntersectionObserver` is
 * always defined by then.
 */

let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer?.unobserve(entry.target); // one-time
        }
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0 },
  );
  return observer;
}

export function register(el: Element): void {
  getObserver().observe(el);
}

export function unregister(el: Element): void {
  observer?.unobserve(el);
}
```

- [ ] **Step 2: Write `Reveal.tsx`.**

Create `src/components/karibu/motion/Reveal.tsx`:

```tsx
"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { register, unregister } from "./observer";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Optional stagger index (0-based). CSS caps the delay at 6 steps. */
  index?: number;
}

/**
 * Degrade-safe reveal wrapper. Renders a visible `<div data-reveal>`; the
 * before-paint `.js` class (layout.tsx) + globals.css turn that into an
 * opacity/transform entrance, and the shared observer adds `.in-view` once on
 * scroll. No JS → content stays fully visible. Reduced-motion → instant.
 */
export function Reveal({ children, className, index }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    register(el);
    return () => unregister(el);
  }, []);

  const style =
    index != null ? ({ "--i": index } as CSSProperties) : undefined;

  return (
    <div ref={ref} data-reveal="" className={className} style={style}>
      {children}
    </div>
  );
}
```

Note: `as`/`stagger` props from the spec sketch are dropped per YAGNI — **no** current call site passes them (verified: every usage passes only `className` / `key`). Stagger is delivered via the `index` prop + CSS `--i`, which P2 uses. If a later phase needs a semantic tag, add `as` then.

- [ ] **Step 3: Verify types + build.**

Run: `npx tsc --noEmit`
Expected: clean (the `--i` custom property needs the `as CSSProperties` cast — confirm no TS error there).

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/components/karibu/motion/observer.ts src/components/karibu/motion/Reveal.tsx
git commit -m "feat(karibu-motion): shared degrade-safe Reveal + observer singleton"
```

---

# Phase P1 — Unify (swap all 17 local `Reveal` defs → shared)

**This is the central bug fix.** Mechanical and identical across files. **Delegate to Sonnet subagents on disjoint file sets** (see "Delegation" below). The lead owns commits and the gate.

**The swap recipe (identical for every file):**

1. Add the import near the other `@/components/karibu/...` imports:
   `import { Reveal } from "@/components/karibu/motion/Reveal";`
2. **Delete** the entire local `function Reveal({ ... }) { ... }` block (the `useReducedMotion` + `motion.div` version). Call sites stay unchanged — they already pass only `className`/`key`, which the shared `Reveal` accepts. (Two files — `KaribuHome`, `KaribuEvents` — have a `delay` **prop** in their local def, but **no call site passes `delay`**, so dropping it is safe.)
3. **Fix the `framer-motion` import** so nothing is unused (ESLint `no-unused-vars` is a build error):
   - If the file's **only** Framer usage was the deleted `Reveal` (i.e. `motion` and `useReducedMotion` are now unreferenced), **delete the whole `import { ... } from "framer-motion";` line.**
   - If the file keeps other Framer usage (`AnimatePresence`, a `motion.*` element, a `rise()` helper), **remove only the now-unused names** from that import, keeping the rest.
4. **Self-check before handing back:** grep the file for `motion`, `useReducedMotion`, `AnimatePresence`, `framer-motion`, and `function Reveal` — confirm no dangling references and no leftover local `Reveal`. Then `npx tsc --noEmit` on the file's project must be clean.

**Per-file map (from the verified inventory):**

| File | Local Reveal usages | Other Framer kept? | framer-motion import after swap |
|---|---|---|---|
| KaribuAbout | 9 | none | **delete line** |
| KaribuBlog | 4 | none | **delete line** |
| KaribuCommunity | 2 | none | **delete line** |
| KaribuEventDetail | 4 | none | **delete line** |
| KaribuEvents | 4 | none | **delete line** |
| KaribuJoin | 4 | none | **delete line** |
| KaribuLearn | 3 | none | **delete line** |
| KaribuProjects | 3 | none | **delete line** |
| KaribuProjectsPage | 3 | none | **delete line** |
| KaribuSubmitIdea | 2 | none | **delete line** |
| KaribuSubmitProject | 2 | none | **delete line** |
| KaribuTeam | 2 | none | **delete line** |
| KaribuVolunteer | 3 | none | **delete line** |
| KaribuFaq | 5 | `AnimatePresence` + accordion `motion.div` | keep `motion, AnimatePresence`; drop `useReducedMotion` **only if** unreferenced after swap — verify |
| KaribuGallery | 4 | `motion.li` grid item | keep `motion`; drop `useReducedMotion` **only if** unreferenced — verify |
| KaribuNewsletter | 2 | `AnimatePresence` swap | keep `motion, AnimatePresence`; drop `useReducedMotion` **only if** unreferenced — verify |
| KaribuHome | 12 | hero `rise()` + scale `motion.div` | keep `motion, useReducedMotion` (both used by hero) |

> For the four "keeps other Framer" files, **do not assume** — grep for `useReducedMotion(` and each `motion.`/`AnimatePresence` name after deleting `Reveal`, and keep exactly what's still referenced. The gate (`no-unused-vars`) will catch a miss.

**Do NOT touch:** `KaribuBanner`, `KaribuModal`, `KaribuTestimonials` (no `Reveal`; keep their Framer imports).

## Task 4: P1 batch A — subagent set 1 (6 files, no other Framer)

**Files (Modify):** `KaribuAbout.tsx`, `KaribuBlog.tsx`, `KaribuCommunity.tsx`, `KaribuEventDetail.tsx`, `KaribuJoin.tsx`, `KaribuLearn.tsx`

- [ ] **Step 1: Dispatch a Sonnet subagent** with the swap recipe above, scoped to exactly these 6 files. Each: add shared import, delete local `Reveal`, **delete** the `framer-motion` import line (all six have no other Framer usage). Subagent self-checks per file (grep + no dangling refs).
- [ ] **Step 2: Lead reviews the diff** — confirm each file has the shared import, no local `Reveal`, no `framer-motion` import remaining, call sites unchanged.
- [ ] **Step 3: Run the gate.** `npx tsc --noEmit` clean, then `npm run build` clean.
- [ ] **Step 4: Commit.**
```bash
git add src/components/karibu/KaribuAbout.tsx src/components/karibu/KaribuBlog.tsx src/components/karibu/KaribuCommunity.tsx src/components/karibu/KaribuEventDetail.tsx src/components/karibu/KaribuJoin.tsx src/components/karibu/KaribuLearn.tsx
git commit -m "refactor(karibu-motion): unify Reveal in about/blog/community/event-detail/join/learn"
```

## Task 5: P1 batch B — subagent set 2 (7 files, no other Framer)

**Files (Modify):** `KaribuEvents.tsx`, `KaribuProjects.tsx`, `KaribuProjectsPage.tsx`, `KaribuSubmitIdea.tsx`, `KaribuSubmitProject.tsx`, `KaribuTeam.tsx`, `KaribuVolunteer.tsx`

- [ ] **Step 1: Dispatch a Sonnet subagent** with the swap recipe, scoped to exactly these 7 files. All have no other Framer usage → **delete** the `framer-motion` import line in each. (`KaribuEvents` has the `delay` prop in its local def — dropping it is safe; no call site passes `delay`. Its FLIP work is a later P2 task, not here.)
- [ ] **Step 2: Lead reviews the diff.**
- [ ] **Step 3: Run the gate.** `npx tsc --noEmit` then `npm run build`, both clean.
- [ ] **Step 4: Commit.**
```bash
git add src/components/karibu/KaribuEvents.tsx src/components/karibu/KaribuProjects.tsx src/components/karibu/KaribuProjectsPage.tsx src/components/karibu/KaribuSubmitIdea.tsx src/components/karibu/KaribuSubmitProject.tsx src/components/karibu/KaribuTeam.tsx src/components/karibu/KaribuVolunteer.tsx
git commit -m "refactor(karibu-motion): unify Reveal in events/projects/projects-page/submit-idea/submit-project/team/volunteer"
```

## Task 6: P1 batch C — the 4 "keeps other Framer" files (lead-owned, careful)

**Files (Modify):** `KaribuFaq.tsx`, `KaribuGallery.tsx`, `KaribuNewsletter.tsx`, `KaribuHome.tsx`

These retain non-Reveal Framer usage; the import trim is per-file, not a blanket delete. **Lead does these directly** (not delegated) because the import surgery needs care.

- [ ] **Step 1: `KaribuFaq.tsx`** — add shared import; delete local `Reveal`; keep the `AnimatePresence` + accordion `motion.div`. Import line becomes `import { motion, AnimatePresence } from "framer-motion";` **iff** `useReducedMotion(` no longer appears in the file (grep to confirm; if it's still used elsewhere, keep it).
- [ ] **Step 2: `KaribuGallery.tsx`** — add shared import; delete local `Reveal`; keep `motion` (used by `motion.li`). Drop `useReducedMotion` from the import **iff** unreferenced after the swap (grep to confirm).
- [ ] **Step 3: `KaribuNewsletter.tsx`** — add shared import; delete local `Reveal`; keep the `AnimatePresence` form/success swap. Import becomes `import { motion, AnimatePresence } from "framer-motion";` **iff** `useReducedMotion(` is gone (grep to confirm).
- [ ] **Step 4: `KaribuHome.tsx`** — add shared import; delete **only** the local `Reveal` function (lines ~51–72). **Keep** `import { motion, useReducedMotion } from "framer-motion";` — both are still used by the hero `rise()` helper and the hero-visual scale `motion.div`. Leave the hero code untouched (it's a P2 concern).
- [ ] **Step 5: Run the gate.** `npx tsc --noEmit` then `npm run build`, both clean. Grep each file: `grep -n "function Reveal\|framer-motion\|useReducedMotion" src/components/karibu/KaribuFaq.tsx src/components/karibu/KaribuGallery.tsx src/components/karibu/KaribuNewsletter.tsx src/components/karibu/KaribuHome.tsx` — confirm no local `Reveal` remains and every kept import is genuinely referenced.
- [ ] **Step 6: Commit.**
```bash
git add src/components/karibu/KaribuFaq.tsx src/components/karibu/KaribuGallery.tsx src/components/karibu/KaribuNewsletter.tsx src/components/karibu/KaribuHome.tsx
git commit -m "refactor(karibu-motion): unify Reveal in faq/gallery/newsletter/home (keep other Framer usage)"
```

## Task 7: P1 verification checkpoint

- [ ] **Step 1: Confirm zero local Reveal defs remain.**
Run: `grep -rn "function Reveal" src/components/karibu/`
Expected: **no matches.**
- [ ] **Step 2: Confirm every Reveal usage resolves to the shared import.**
Run: `grep -rln "<Reveal" src/components/karibu/` then for each hit `grep -L "motion/Reveal" <file>` — expected: every file using `<Reveal` also imports from `@/components/karibu/motion/Reveal`.
- [ ] **Step 3: Full gate.** `npm run build && npx tsc --noEmit` — both clean.
- [ ] **Step 4: Push branch** (no PR yet) so a Vercel preview builds; note the preview URL for the P1 visual check (reveals fire once on scroll; content is visible with JS disabled — the degradation fix).

---

# Phase P2 — Through-line (highest-value motion)

**Consult `frontend-design` before implementing the craft in this phase** (hover lifts, stagger timing, nav shrink feel). All motion here obeys the Global Constraints (transform/opacity only, reduced-motion instant, empty states never animate).

## Task 8: Home — wire `CountUp` into the TrustBar

**Files:** Modify `src/components/karibu/KaribuHome.tsx` (the `TrustBar` component, lines ~227–272).

- [ ] **Step 1:** Import `CountUp`: `import { CountUp } from "@/components/ui/CountUp";`
- [ ] **Step 2:** In `TrustBar`, for the numeric stat(s) that are currently plain strings (e.g. `~${stats.totalMembers}` and the city count), render the number via `<CountUp target={n} .../>` **only when a real number exists**; keep the "Growing"/"Kenya"/"100% free"/"Supported" fallbacks as plain text (never count up a non-number). `CountUp` already fires once on scroll (threshold 0.3) and respects reduced-motion — reuse as-is. Preserve the exact prefix (`~`) and the `font-newsreader text-[30px]` styling by passing `className`/`prefix`.
- [ ] **Step 3: Gate.** `npx tsc --noEmit` + `npm run build` clean.
- [ ] **Step 4: Commit** `feat(karibu-motion): count-up the home trust-bar stats`.

## Task 9: Home — stagger the "four ways we learn" cards + hover lift

**Files:** Modify `src/components/karibu/KaribuHome.tsx` (`WhatWeDo`, lines ~335–408).

- [ ] **Step 1:** Currently the 4 `<article>` cards sit inside a single `<Reveal className="grid ...">`. Change so each card reveals with a staggered delay: either wrap each `<article>` in `<Reveal index={i}>` inside the grid, or keep the grid `<Reveal>` and give each article `data-reveal` + inline `--i`. Prefer per-card `<Reveal index={i}>` so the shared CSS stagger (`--i`, capped at 6) applies. Keep the grid layout classes on the container.
- [ ] **Step 2:** Add a hover lift to each card via CSS utility classes only (`transition-transform duration-150 hover:-translate-y-1` with the existing `--ease-reversible` feel; use `motion-reduce:hover:translate-y-0` or rely on the global reduced-motion reset). Transform/opacity only — no shadow-size animation of layout.
- [ ] **Step 3: Gate + commit** `feat(karibu-motion): stagger + hover-lift the home "what we do" cards`.

## Task 10: Nav — sticky-shrink on scroll + "Join" hover scale

**Files:** Modify `src/components/karibu/KaribuNav.tsx`.

Note: the **dropdown fade-and-slide-down** (`translate-y-1 → 0`, opacity, `duration-150`) and **marquee pause-on-hover + reduced-motion stop** already exist and satisfy the spec — do **not** rebuild them; verify they still work.

- [ ] **Step 1:** Add a `scrolled` boolean state driven by a passive `scroll` listener (past ~64px / hero). On scroll, toggle a class on the `<nav>` that (a) reduces height (`h-16` → `h-14`) and (b) strengthens the bg/blur/shadow — transition via `transition-[height,background-color,box-shadow] duration-200`. Use `useEffect` with `{ passive: true }` and clean up the listener.
- [ ] **Step 2:** Add `hover:scale-[1.03]` (+ existing `hover:bg-clay-dark` tone shift) with `transition-transform duration-150` to the "Join" CTA(s) (desktop `/signup`). Keep the reduced-motion global reset in charge of disabling it.
- [ ] **Step 3: Gate + commit** `feat(karibu-motion): sticky-shrink nav on scroll + join hover`.

## Task 11: Events — FLIP filter transition (Framer `layout` + `AnimatePresence`)

**Files:** Modify `src/components/karibu/KaribuEvents.tsx`.

Re-introduces Framer here (removed in Task 5) — legitimate: this is the FLIP layout case Framer is kept for.

- [ ] **Step 1:** Re-add `import { motion, AnimatePresence } from "framer-motion";`
- [ ] **Step 2:** Wrap the filterable collections (the upcoming `ListRow` list and the `past` grid) so that when `active` changes, items animate position instead of hard-cutting: give each row/card a stable `layout` + `layoutId={ev.slug}`, wrap the mapped lists in `<AnimatePresence mode="popLayout">`, and convert the row/card wrapper to `motion.*`. Enter/exit = opacity + small y; reorder = `layout`. Respect reduced-motion (Framer honors it globally; also guard with `useReducedMotion` to pass `initial={false}` when reduced).
- [ ] **Step 3:** The **empty-state** block (`upcoming.length === 0 && past.length === 0`) must **not** animate — render it instantly, outside any `AnimatePresence` entrance. Verify.
- [ ] **Step 4: Gate + commit** `feat(karibu-motion): FLIP filter transitions on events`.

## Task 12: Learn + Community — card hover lift + "Open →" arrow nudge

**Files:** Modify `src/components/karibu/KaribuLearn.tsx`, `src/components/karibu/KaribuCommunity.tsx`.

- [ ] **Step 1:** On the resource/community cards, add a hover lift (`hover:-translate-y-1`, `transition-transform duration-150`) and nudge the trailing "Open →" / arrow a few px right on card hover using a `group`/`group-hover:translate-x-1` on the arrow span with `transition-transform`. Transform/opacity only.
- [ ] **Step 2: Gate + commit** `feat(karibu-motion): card hover-lift + arrow nudge on learn/community`.

---

# Phase P3 — Craft

**Consult `frontend-design` before implementing.** Same Global Constraints.

## Task 13: About — timeline scroll-linked line-draw + per-milestone reveal

**Files:** Modify `src/components/karibu/KaribuAbout.tsx`.

- [ ] **Step 1:** For the timeline, use Framer `useScroll` (target = the timeline container, `offset` start/end) to drive a vertical line's `scaleY` (transform-origin top) as the section scrolls through the viewport — scroll-linked draw. Per-milestone dots/labels reveal via the shared `Reveal` (or `useInView`) once. Add `import { motion, useScroll, useTransform } from "framer-motion";` Guard with `useReducedMotion` → render the line fully drawn, no scroll link, when reduced.
- [ ] **Step 2:** Story blocks keep simple `Reveal` fade-up (already there). Organiser faces: soft hover `scale` **inside a fixed frame** (`overflow-hidden` wrapper so layout doesn't shift) — `group-hover:scale-105` on the image, `transition-transform`.
- [ ] **Step 3: Gate + commit** `feat(karibu-motion): about timeline scroll-draw + milestone reveals`.

## Task 14: Learn — "Suggested Path" sequential 1-2-3 reveal + progress indicator

**Files:** Modify `src/components/karibu/KaribuLearn.tsx`.

- [ ] **Step 1:** The "Suggested Path" steps reveal sequentially using the shared `Reveal index={i}` stagger. Add a progress indicator (a line/track) that animates its `scaleX`/`scaleY` on scroll-into-view (CSS `.in-view`-driven transform or a small `useInView`), one-time. Transform/opacity only; reduced-motion → fully shown instantly.
- [ ] **Step 2: Gate + commit** `feat(karibu-motion): learn suggested-path sequential reveal + progress`.

## Task 15: Community — upvote scale-pop + copy-confirm checkmark + "Share something" CTA hover

**Files:** Modify `src/components/karibu/KaribuCommunity.tsx` (and, if the upvote/copy controls live in `src/components/community/UpvoteButton.tsx` / `CopyButton.tsx`, confirm scope first — those are shared with Terminal Noir; only touch the Karibu surface unless the interaction is Karibu-only).

- [ ] **Step 1:** Upvote → quick `scale` pop on activation (CSS `:active`/state-driven `scale(1.15)` back to `1`, `transition-transform var(--dur-micro)`). Copy-confirmation → checkmark morph (swap icon with a short opacity/scale transition on the confirmed state). "Share something" primary CTA mirrors the primary-CTA hover from Task 10 (`hover:scale-[1.03]` + tone shift).
- [ ] **Step 2:** Verify these are Karibu-scoped; if a shared component is edited, re-run the gate against both identities and note it at the PR.
- [ ] **Step 3: Gate + commit** `feat(karibu-motion): community upvote/copy micro-interactions + CTA hover`.

## Task 16: Team — grid reveal only once populated (no animation while "coming soon")

**Files:** Modify `src/components/karibu/KaribuTeam.tsx`.

- [ ] **Step 1:** While the team is empty / "coming soon", render that state **instantly** — no reveal, no stagger (Global Constraint: never animate attention onto "nothing here"). Once populated, apply a gentle staggered grid reveal (`Reveal index={i}`) + per-card hover (`hover:-translate-y-1`, and face `scale` inside a fixed frame). Gate the animation on `members.length > 0`.
- [ ] **Step 2: Gate + commit** `feat(karibu-motion): team grid reveal + hover once populated`.

---

# Final: PR gate

## Task 17: Full verification + PR (ASK first)

- [ ] **Step 1: Full build gate.** `npm run build && npx tsc --noEmit` — both clean.
- [ ] **Step 2: Invoke `superpowers:verification-before-completion`** — do not claim done without evidence.
- [ ] **Step 3: Visual verification on the Vercel preview** (no live DB locally): reveals fire once on scroll and content is visible with JS disabled; reduced-motion path is instant and marquee stops; hero stagger; count-up; nav shrink + dropdowns + Join hover; Events FLIP with the empty state instant; hover lifts + arrow nudges; About timeline draw; Team "coming soon" does not animate.
- [ ] **Step 4: ASK the user before opening the PR.** When opening it, **flag the carried-forward sign-offs** (not blockers): (1) testimonial name spellings in `KaribuTestimonials.tsx` — Billy Mwangi, Samuel, James Lloyd, Isaac Toili / Tuigoin; (2) `/join` application-form decision (WhatsApp-first vs form returns). Also flag any shared `community/*` component touched in Task 15.

---

## Self-Review (author checklist — done)

**Spec coverage:** §2 bug → Tasks 1–7 (CSS-first reveal + `.js` + observer + full swap). §3.1 tokens/bootstrap → Tasks 1–2. §3.2 shared util/observer/stagger → Task 3 (+ stagger CSS in Task 1, `index` prop). §3.3 swap 20/17 → Tasks 4–7. §4 P2 Home/Nav/Events/Learn/Community → Tasks 8–12. §4 P3 About/Learn/Community/Team → Tasks 13–16. §5 non-negotiables → Global Constraints + per-task empty-state guards. §6 Framer-kept surfaces → Tasks 11 (Events FLIP), 6/9 (Home hero kept), 13 (About). §7 gate/preview → Global Constraints + Task 17. §8 sign-offs → Task 17 Step 4.

**Placeholder scan:** foundation/P1 tasks carry exact code and exact import surgery per file. P2/P3 tasks specify exact files, exact spec values (durations, transforms, which states must stay instant), and the concrete mechanism — with `frontend-design` consultation for feel, as the spec intends ("craft"). No "add error handling"/"TBD" left.

**Type consistency:** `register`/`unregister`/`Reveal({children,className,index})` names are identical across the Interfaces block, Task 3, and every consumer. Import path `@/components/karibu/motion/Reveal` is uniform.

**Known scope note:** spec §3.3 lists 20 files but only **17** define a local `Reveal` (Banner/Modal/Testimonials use Framer for other things and have no `Reveal`). The plan swaps the real 17 and explicitly leaves the other 3 untouched — matching the verified inventory, not the spec's round number.
