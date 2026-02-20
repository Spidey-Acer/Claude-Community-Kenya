# Claude Community Kenya — Full Website Revamp Prompt

## Project Overview
- **Project:** Claude Community Kenya (CCK) — community website
- **Stack:** Next.js 16 (App Router) + TypeScript strict + Tailwind CSS v4 + Framer Motion + Lucide React
- **Design System:** "Terminal Noir" — dark hacker/terminal aesthetic with green (#00ff41), amber (#ffb000), cyan (#00d4ff) accents on black (#0a0a0a)
- **Fonts:** JetBrains Mono (headings/code/UI) + IBM Plex Sans (body)
- **Working Directory:** The project root

## Mission
Revamp the entire Claude Community Kenya website to world-class, production-grade quality. Every page, component, animation, and interaction must be polished to professional standards — no half-measures, no generic AI aesthetics, no broken functionality.

## Design Philosophy
Follow the `/frontend-design` skill principles:
- **Bold "Terminal Noir" aesthetic** — commit fully. CRT scanlines, matrix rain, glitch effects, terminal chrome — all executed with precision, not gimmick
- **Typography:** JetBrains Mono for headings/code + IBM Plex Sans for body — ensure proper hierarchy, spacing, and readability
- **Color:** Green-on-black dominant. Amber for warnings/CTAs. Cyan for links/info. Red sparingly for errors. Never muddy the palette
- **Motion:** Purposeful animations only — staggered reveals on scroll, smooth page transitions, hover micro-interactions. No animation for animation's sake. All must respect `prefers-reduced-motion`
- **Spatial composition:** Asymmetric layouts where appropriate. Generous whitespace. Grid-breaking hero sections. Depth through layered backgrounds (matrix rain, scanlines, noise grain)
- **Responsive:** Mobile-first. Every layout must work flawlessly on 320px through 4K. Test hamburger menu, card grids, terminal windows, forms at every breakpoint

## Scope — What Needs to Be Done

### Phase 1: Fix All Known Issues (Do This First)

Before any visual work, fix these bugs and inconsistencies:

1. **CommandPalette FAQ links broken** — FAQ results link to `/about#${faq.id}` but FAQs live at `/faq`. Fix navigation targets
2. **Inconsistent OpenGraph URLs** — `page.tsx` uses `claudecommunity.co.ke`, layout uses `claudecommunitykenya.com`. Standardize to one domain
3. **StatsBar data mismatch** — Shows "1 Events Hosted" but there's 1 completed event. HeroTerminal says "50+" members, Join page counts to 30. Make stats consistent across the site
4. **Duplicate constants** — `NAV_LINKS` and `NAVIGATION_LINKS` are identical. Remove `NAVIGATION_LINKS`. Remove unused `API_ENDPOINTS`, unused `RESOURCE_LINKS`, and the duplicate `SOCIAL_LINKS`
5. **Scanlines duplication** — `globals.css` already applies scanlines via `body::after`. The `Scanlines.tsx` component is redundant. Remove the component
6. **`PageTransition` component unused** — Either wire it into the layout properly or remove it
7. **`resources` naming collision** — `constants.ts` and `data/resources.ts` both export `resources`. Rename the constants one to `RESOURCE_URLS` or similar

### Phase 2: Component-Level Polish

For EVERY component, review and improve:

#### Layout Components
- **Navbar** — Smooth scroll behavior. Active link indicator should be precise. Mobile hamburger animation should be fluid. Ctrl+K hint should be subtle but discoverable. Logo should have a subtle glow/pulse on hover. Ensure navbar blur-backdrop works on all browsers
- **Footer** — Clean up the "Hotel California" easter egg (keep it but make it more polished). Ensure footer links are properly spaced on mobile. Add subtle hover animations on social icons
- **MobileMenu** — Full-screen overlay should feel immersive. Staggered link animations should be snappy (not sluggish). Add backdrop blur. Ensure focus trap for accessibility
- **LoadingBar** — Route-change progress should feel responsive. The terminal-style percentage text should update smoothly

#### Terminal Components
- **TerminalWindow** — The core visual element. Ensure the three-dot title bar colors are pixel-perfect (red/amber/green circles). Box-drawing borders (╔═══╗) should render consistently across fonts. Add subtle hover elevation/glow
- **TypingAnimation** — Ensure timing feels natural (not robotic). Cursor should blink at a realistic rate. Lines should appear with slight variance in speed for authenticity
- **MatrixRain** — Performance must be solid (no jank on mobile). Should gracefully degrade — hidden on mobile per existing CSS, but ensure the transition is smooth not abrupt. Canvas should resize properly on window resize
- **CommandPalette** — Must feel instant. Search should be genuinely useful (fuzzy matching). Keyboard navigation must be flawless. Results should be categorized clearly. Add subtle animations for result list
- **GlitchText** — Chromatic aberration should be tasteful, not overwhelming. Ensure it works across all heading sizes
- **ScrollReveal** — Every section on every page should use scroll reveal with appropriate stagger. Ensure animations are smooth at 60fps
- **TerminalApplication (Join form)** — The multi-step terminal form is the crown jewel. Ensure every step transition is smooth. Validation messages should appear inline in terminal style. Easter eggs (help/ls/clear) should delight. Boot sequence should feel authentic. Progress bar on submission must be convincing

#### UI Components
- **Button** — Hover states should have terminal-style feedback (brief glow, slight scale). Focus rings must be visible for accessibility
- **Card** — Consistent border treatment. Hover states with subtle glow or border-color transition. Ensure card grids are responsive with proper gap
- **Badge** — Status colors should be instantly readable. Ensure contrast ratios meet WCAG AA
- **Accordion** — Height animation should be buttery smooth. Icon rotation should match expand/collapse. Focus management for keyboard users
- **Timeline** — Git-log style should be authentic. Connecting lines should be pixel-perfect. Consider adding subtle pulse on the latest/active item
- **CountUp** — Numbers should count up with satisfying easing. Ensure they only animate once (on first scroll into view). Large numbers should use locale formatting

#### Section Components
- **HeroTerminal** — The first thing users see. Typing animation must be flawless. After completion, the Discord link reveal should be elegant. Consider adding more interactive elements
- **StatsBar** — Numbers must be accurate and impressive. CountUp animations should stagger across the 4 stats
- **EventCard** — Status badges prominent. Date/time formatting clean. Hover state should invite clicking
- **ProjectCard** — Tech stack tags should be visually distinct. The "Your Project Here" placeholder should genuinely invite submissions
- **BlogPostCard** — Reading time, author, date metadata should be scannable. Tags should be filterable (or at least visually grouped)
- **TeamMemberCard** — Initials-based avatars should look intentional and professional (not like missing images). Consider adding a subtle terminal-style frame. Social links should have hover effects

### Phase 3: Page-Level Revamp

Every page must feel like a cohesive experience, not a collection of components:

#### Home Page (`/`)
- Hero section: MatrixRain background + HeroTerminal must create an immediately striking first impression. The typing animation is the hook — make it unforgettable
- Stats bar: Accurate numbers with satisfying count-up animations
- Featured Events: Cards should showcase upcoming events enticingly
- "What We Do" section: 4 value-prop cards with icons. Clear, concise copy
- Featured Projects: Showcase community work with pride
- Join CTA: Three pathways (Discord, Events, Build) — make each feel actionable
- Partners: Clean logo bar

#### About Page (`/about`)
- Our Story: Compelling narrative with scroll-triggered reveals
- Mission/Vision/Values: Three terminal windows side by side — ensure they're responsive (stack on mobile)
- Team: Grid of TeamMemberCards — make each member feel valued
- Timeline: Git-log milestones — make history feel alive with subtle animations

#### Events Page (`/events`)
- Filter tabs: Smooth tab switching with animated underline/indicator
- Event cards: Grid layout that adapts gracefully. Empty states for filtered categories
- Individual event pages: Full event details with clear CTAs. Share buttons should work. Past events should show highlights

#### Blog Page (`/blog`)
- Card grid with clean typography
- Individual posts: The custom Markdown renderer must handle all common Markdown patterns cleanly. Code blocks should have syntax highlighting styling. Share buttons functional
- Related posts section

#### Resources Hub (`/resources`)
- 4 sub-pages (Getting Started, Claude Code, Workflows, Links)
- Getting Started: Step-by-step guide should feel like an actual terminal tutorial
- Claude Code: Installation + commands should be copy-pasteable
- Workflows: Case studies and patterns
- Links: File-tree directory should look authentic with box-drawing characters

#### Join Page (`/join`)
- Community Pulse stats at top
- TerminalApplication form: The star feature. Must be flawless
- Social quick-links
- Contribute section: Clear pathways

#### FAQ Page (`/faq`)
- Three category sections with smooth accordions
- Answers should be scannable and helpful

#### Other Pages
- Code of Conduct: Professional, readable
- Ambassador Program: Inspiring, actionable
- 404 Page: Fun terminal error that helps users navigate back

### Phase 4: Cross-Cutting Concerns

#### SEO (Critical)
- Every page must have unique, descriptive `<title>` and `<meta description>`
- OpenGraph images: Ensure `/og-image.png` exists or generate proper OG metadata
- Structured data (JSON-LD): Already in layout — verify it's correct and comprehensive
- Canonical URLs: Consistent domain
- Semantic HTML: Proper heading hierarchy (h1 → h2 → h3), landmark roles, `<article>`, `<section>`, `<nav>`
- Performance: Lighthouse score target 90+ on all metrics

#### Accessibility (Critical)
- WCAG AA compliance minimum
- All interactive elements keyboard-accessible
- Focus management: visible focus rings, focus traps in modals/menus
- Screen reader support: ARIA labels, roles, live regions
- Color contrast: All text meets 4.5:1 ratio minimum
- `prefers-reduced-motion`: All animations must respect this
- Skip navigation link (already exists — verify it works)

#### Performance
- No layout shift (CLS near 0)
- First Contentful Paint under 1.5s
- Optimize MatrixRain canvas (requestAnimationFrame, proper cleanup)
- Lazy load below-fold content
- Image optimization (if any images are added)

#### Responsiveness
- Test every page at: 320px, 375px, 428px, 768px, 1024px, 1280px, 1440px, 1920px
- Card grids: 1 col mobile → 2 col tablet → 3 col desktop
- Terminal windows: Must not overflow on small screens
- Navigation: Hamburger menu on mobile, full nav on desktop
- Typography: Fluid sizing or proper breakpoint scaling
- Touch targets: Minimum 44x44px on mobile

### Phase 5: Animation & Interaction Polish

#### Page Transitions
- Wire up PageTransition component or implement route-based transitions
- Pages should fade/slide in smoothly on navigation

#### Scroll Animations
- Every section should reveal on scroll (ScrollReveal component)
- Stagger children within sections for cascading effect
- Use appropriate directions (cards from bottom, sidebars from sides)

#### Hover States
- Every interactive element needs a hover state
- Terminal-appropriate: glow effects, border brightening, subtle scale
- Buttons: `> ` prefix animation or glow pulse
- Cards: Border color transition + slight elevation
- Links: Underline animation or color shift

#### Loading States
- Route changes: LoadingBar with terminal percentage
- Any async operations: Terminal-style loading indicators

#### Micro-interactions
- Copy-to-clipboard: Toast/feedback when link copied
- Form inputs: Terminal cursor in input fields
- Accordion: Smooth expand with content fade-in
- Tab switching: Animated indicator slide

## Implementation Requirements

### Code Quality
- [ ] TypeScript strict mode — zero `any` types
- [ ] No unused imports, variables, or components
- [ ] Consistent code formatting
- [ ] Components properly typed with interfaces
- [ ] "use client" only where needed (state, effects, event handlers)
- [ ] Server components by default

### Verification (Run After Each Major Change)
```bash
npx next build
```
- Zero build errors
- Zero TypeScript errors
- No console warnings in dev mode

### What NOT to Do
- Do NOT add new dependencies unless absolutely necessary
- Do NOT create a CMS or backend — keep data in TypeScript files
- Do NOT over-engineer — simple, clean, maintainable code
- Do NOT add features not listed here
- Do NOT use generic fonts (Inter, Roboto, Arial) — stick with JetBrains Mono + IBM Plex Sans
- Do NOT break existing functionality while improving it
- Do NOT use inline styles — Tailwind utilities + CSS variables only
- Do NOT add comments to code you didn't change
- Do NOT create documentation files unless asked

### Commit Strategy
After completing each phase, commit with descriptive messages:
```
fix(core): resolve broken FAQ links and data inconsistencies
feat(components): polish terminal components with refined animations
feat(pages): revamp home page with improved layout and interactions
feat(seo): add comprehensive meta tags and structured data
feat(a11y): ensure WCAG AA compliance across all pages
```

## Success Criteria
When done, the website should:
1. Load fast (Lighthouse 90+)
2. Look stunning on every device (320px to 4K)
3. Feel alive with purposeful animations
4. Be fully accessible (keyboard, screen reader, reduced motion)
5. Rank well on search engines (proper SEO)
6. Have zero bugs, zero console errors, zero build warnings
7. Make visitors think "this community knows what they're doing"

## Starting Point
Begin with Phase 1 (bug fixes), then proceed through each phase sequentially. Verify the build passes after each phase before moving to the next.
