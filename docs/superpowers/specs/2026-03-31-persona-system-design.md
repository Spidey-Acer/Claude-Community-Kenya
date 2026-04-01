# Persona System — Design Spec

> Dual-experience system that tailors the entire CCK website based on whether the visitor is a **Developer** or **Professional**. Every page gets full persona treatment — headers, descriptions, tone, and framing all shift.

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persona names | Developer / Professional | Clear, no ambiguity, inclusive, won't age |
| Selector layout | Full split screen | Most dramatic, matches "nobody's done this" energy |
| Navbar toggle | Icon buttons (`>_` dev, `◆` pro) | Visual, recognizable symbols for each persona |
| Content architecture | Centralized content map | Single source of truth across 20+ pages |
| Entry animation | The Curtain Call | Theatrical — glowing center line, halves peel apart |
| Exit animation | Particle absorption | Rejected side dissolves into particles, chosen side expands |
| SSR default | Professional mode | Clean/accessible for SEO, persona is client-side only |

---

## 1. Architecture

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PersonaContext` | `src/contexts/PersonaContext.tsx` | React context — stores `"dev" \| "pro" \| null`, exposes `usePersona()` hook |
| `PersonaProvider` | Same file | Wraps app in `ConditionalLayout`, reads/writes `localStorage("cck-persona")` |
| `PersonaSelectorModal` | `src/components/persona/PersonaSelectorModal.tsx` | Full split-screen overlay on first visit |
| `PersonaToggle` | `src/components/persona/PersonaToggle.tsx` | Icon buttons in Navbar for switching |
| `persona-content.ts` | `src/data/persona-content.ts` | All dual-language content by page + section |
| `usePersonaContent()` | `src/hooks/usePersonaContent.ts` | Hook: returns resolved text for active persona |

### Data Flow

```
First visit (persona = null)
  → PersonaProvider detects null in localStorage
  → Shows PersonaSelectorModal (full split screen)
  → User clicks a side
  → Saves to localStorage("cck-persona") + updates context
  → Modal exit animation plays
  → Page renders with persona-appropriate content

Return visit
  → PersonaProvider reads localStorage on mount
  → Persona set immediately, no modal
  → Navbar shows PersonaToggle with active icon highlighted

Toggle click (navbar)
  → Swaps persona in context + localStorage
  → All persona-aware content re-renders instantly (no animation, no reload)
```

### Mount Point

`PersonaProvider` wraps children inside `ConditionalLayout` (`src/components/layout/ConditionalLayout.tsx`), which is already `"use client"` and already wraps all public pages. Admin routes are excluded — no persona treatment in admin.

---

## 2. Content Map

### Type Definitions

```ts
type Persona = "dev" | "pro";

type PersonaText = { dev: string; pro: string };

type SectionContent = {
  heading?: PersonaText;
  subtitle?: PersonaText;
  description?: PersonaText;
  items?: { dev: string[]; pro: string[] };
};

type PageContent = Record<string, SectionContent>;

type PersonaContentMap = Record<string, PageContent>;
```

### Structure

```ts
const PERSONA_CONTENT: PersonaContentMap = {
  about: {
    hero: {
      heading: { dev: "$ cat README.md", pro: "$ Our Story" },
      subtitle: {
        dev: "Africa's only Claude developer community. Not the first — the only one.",
        pro: "Africa's only Claude community. Not the first — the only one.",
      },
    },
    origin: {
      heading: { dev: "$ cat origin-story.md", pro: "$ How It Started" },
      description: {
        dev: "It started with 13 developers in a room...",
        pro: "It started with 13 people in a room...",
      },
    },
    mission: {
      heading: { dev: "$ cat mission.json", pro: "$ What We Stand For" },
    },
    team: {
      heading: { dev: "$ ls team/ --all", pro: "$ The Team" },
    },
    timeline: {
      heading: { dev: "$ git log --oneline", pro: "$ Milestones" },
      subtitle: {
        dev: "Our journey so far — every milestone tracked like a git commit.",
        pro: "Our journey so far — every milestone on the record.",
      },
    },
  },
  home: { /* hero, whatWeDo, events, projects, testimonials, cta sections */ },
  events: { /* page header, event card framing */ },
  blog: { /* page header, post card labels */ },
  projects: { /* page header, project descriptions */ },
  resources: { /* page header + all 7 sub-page headers and descriptions */ },
  community: { /* page header, submission framing */ },
  faq: { /* page header, category labels */ },
  ambassador: { /* page header, program description */ },
  codeOfConduct: { /* page header */ },
  notFound: { /* 404 message */ },
};
```

### Hook API

```ts
function usePersonaContent(page: string, section: string): SectionContent;

// Usage in components:
const content = usePersonaContent("about", "hero");
// Returns { heading: "$ cat README.md", subtitle: "Africa's only Claude developer..." }
// or     { heading: "$ Our Story", subtitle: "Africa's only Claude community..." }
// based on active persona
```

The hook reads the active persona from `usePersona()` context and resolves the PersonaText values to plain strings.

---

## 3. Persona Selector Modal

### Trigger
- Shows when `persona === null` (first visit, no localStorage value)
- Rendered by `PersonaProvider` — always mounted, visibility controlled by persona state

### Layout
- `fixed inset-0 z-[200]` (above CommandPalette at `z-[100]`, below Konami at `z-[9999]`)
- No close button, no backdrop click dismiss — visitor must pick a side
- Two halves, 50/50 vertical split

### Visual Design

**Left half (Developer):**
- Background: `#0a0a0a` (bg-primary)
- Accent: `#00ff41` (green-primary)
- Subtle gradient: `linear-gradient(135deg, rgba(0,255,65,0.05) 0%, transparent 50%)`
- Content (centered vertically):
  - Dim text: `$ whoami` (green, low opacity)
  - Icon: `>_` (large, green)
  - Title: "Developer" (green, bold, ~22px)
  - Subtitle: "I write code. Show me the terminal." (text-dim)
  - Preview lines: `$ cat README.md` / `$ git log --oneline` (green, low opacity)

**Right half (Professional):**
- Background: `#111111` (slightly lighter)
- Accent: `#ffb000` (amber)
- Subtle gradient: `linear-gradient(135deg, rgba(255,176,0,0.05) 0%, transparent 50%)`
- Content (centered vertically):
  - Dim text: "Welcome" (amber, low opacity)
  - Icon: `◆` (large, amber)
  - Title: "Professional" (amber, bold, ~22px)
  - Subtitle: "I use Claude for work. Keep it clean." (text-dim)
  - Preview lines: "Our Story" / "Milestones" (amber, low opacity)

**Center divider:**
- 1px line, default color `#222`
- Glows green when left side hovered, amber when right side hovered

**Hover effect:**
- Hovered side expands to ~52% width, other shrinks to ~48%
- Transition: 200ms ease-out

**Footer:**
- "You can switch anytime" centered at bottom, spanning both halves, dimmed text

**CCK logo:**
- Centered at top, spanning both halves

### Mobile (below `sm` breakpoint)
- Stacked vertically: Developer on top, Professional below
- Each takes ~45% viewport height with gap between
- Scrollable if needed on very small screens

### Entry Animation: "The Curtain Call"

1. **Screen starts fully black** (0ms)
2. **Glowing center line appears** — thin vertical line, center of screen, pulses once with glow (0–400ms)
3. **Halves peel apart** — left half slides left, right half slides right, revealing their respective backgrounds underneath. Like curtains opening. (400–800ms)
4. **Content staggers in** per side — icon first (fade+scale), then title (fade+y), then subtitle (fade+y), then preview lines (fade). Stagger: 80ms between elements. (800–1200ms)

Total entry: ~1.2 seconds.

### Exit Animation: "Particle Absorption"

1. **Rejected side dissolves** — its content breaks into small particles (CSS/canvas) that drift horizontally toward the chosen side, as if being absorbed. (0–500ms)
2. **Chosen side expands** — scales up to fill the full viewport width. Its accent color briefly flashes as a full-screen wash. (300–700ms, overlapping)
3. **Flash fades** — the color wash fades out, revealing the actual website underneath. (700–1000ms)

Total exit: ~1 second.

### Accessibility
- `role="dialog"` + `aria-modal="true"` + `aria-label="Choose your experience"`
- Each side is a `<button>` with proper labels: "Enter as Developer" / "Enter as Professional"
- `prefers-reduced-motion`: skip all animation, instant split, instant select
- Focus trapped within modal
- Keyboard: Tab between two sides, Enter/Space to select

---

## 4. Navbar Toggle

### Component: `PersonaToggle`

Two small icon buttons placed in the Navbar between the search (`Ctrl+K`) button and the JOIN CTA.

**Dev button:**
- Icon: `>_` rendered in monospace
- Active state: green text (`#00ff41`), subtle green border
- Inactive state: dimmed (`#444`), transparent border

**Pro button:**
- Icon: `◆`
- Active state: amber text (`#ffb000`), subtle amber border
- Inactive state: dimmed (`#444`), transparent border

**Behavior:**
- Clicking the inactive button swaps persona instantly
- No animation on swap — content just updates via React re-render
- Tooltip on hover: "Switch to Developer mode" / "Switch to Professional mode"

**Mobile:**
- Same toggle appears in `MobileMenu`, below the nav links, above the JOIN button
- Slightly larger touch targets (min 44px)

---

## 5. Persistence & SSR

### localStorage
- Key: `"cck-persona"`
- Values: `"dev"` | `"pro"`
- Read on mount in `PersonaProvider` via `useEffect`

### SSR Behavior
- Server always renders **Professional mode** (clean, accessible headers)
- This is the SEO-indexed version — search engines always see inclusive language
- Client hydration reads localStorage and swaps to dev mode if needed
- Brief flash prevention: modal covers the page on first visit anyway; returning dev users may see a single-frame flash of pro content before hydration (acceptable tradeoff vs. blocking SSR)

### Edge Cases
- localStorage cleared / incognito → first visit experience, modal shows
- User switches mid-page → instant content swap, no reload
- Multiple tabs → each tab reads localStorage on focus, stays in sync
- JS disabled → pro mode always (server-rendered default)

---

## 6. Pages — Full Persona Treatment

Every public page gets persona-specific content. Dynamic data (stats, events, team members, blog posts) stays the same — persona only affects the **framing language** around them.

| Page | What changes per persona |
|------|------------------------|
| **Home** | Hero heading/subtitle, section headers, "what we do" card descriptions, CTA text |
| **About** | Hero, origin story opener/closer, mission/vision/values text, team header, timeline header/subtitle |
| **Events** | Page header, event type labels |
| **Blog** | Page header, reading framing |
| **Projects** | Page header, project card descriptions |
| **Resources** (+ 7 sub-pages) | All page headers, resource descriptions, getting-started guidance |
| **Community** | Page header, submission framing |
| **FAQ** | Page header, category labels |
| **Ambassador** | Page header, program description |
| **Code of Conduct** | Page header |
| **Not Found** | 404 heading and message |

### Pages with NO persona treatment
- `/join` — universal form
- `/speak` — universal submission
- `/submit-idea`, `/submit-project`, `/community/submit` — universal forms
- `/admin/*` — fully isolated, no persona context

---

## 7. Implementation Notes

### File changes required

**New files:**
- `src/contexts/PersonaContext.tsx`
- `src/components/persona/PersonaSelectorModal.tsx`
- `src/components/persona/PersonaToggle.tsx`
- `src/data/persona-content.ts`
- `src/hooks/usePersonaContent.ts`

**Modified files:**
- `src/components/layout/ConditionalLayout.tsx` — wrap children with `PersonaProvider`
- `src/components/layout/Navbar.tsx` — add `PersonaToggle`
- `src/components/layout/MobileMenu.tsx` — add `PersonaToggle`
- Every page with persona treatment — replace hardcoded headers/text with `usePersonaContent()` calls

### Animation dependencies
- Framer Motion (already installed) for modal entry/exit, content stagger
- Canvas overlay for particle dissolution exit effect — captures rejected side as pixel data, spawns particles that drift toward chosen side. Falls back to simple fade-out if canvas is unavailable or `prefers-reduced-motion` is set. No new dependencies needed.
- Existing glitch CSS (`src/styles/glitch.css`) available if needed for effects

### Performance considerations
- `persona-content.ts` is statically imported — tree-shaken per page if structured as separate exports
- No API calls for persona — purely client-side context + localStorage
- Modal only mounts when persona is null — zero overhead for returning visitors
