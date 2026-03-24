# PHASE 1: Foundation & Infrastructure
## Claude Community Kenya — Next.js Website Build

**Role:** Infrastructure Architect
**Estimated Scope:** Core project setup, design system, global components
**Dependency:** None (foundational)

---

## Objective

Establish the complete foundation for the Claude Community Kenya website. This phase sets up the project structure, design system, typography, color tokens, and reusable UI component library that all subsequent pages will depend on.

---

## Deliverables

### 1. Project Initialization
- Create Next.js 14 project with App Router
- Configure TypeScript (strict mode)
- Set up tailwind.config.ts with custom color tokens and typography scale
- Install and configure required dependencies:
  - `framer-motion` (animations)
  - `lucide-react` (icons)
  - Google Fonts (`next/font`)

### 2. Design System & Global Styles
Create `/styles/globals.css` with:
- **CSS Variables** for the "Terminal Noir" color palette:
  ```
  --bg-primary, --bg-secondary, --bg-card, --bg-elevated, --border, --border-hover
  --green-primary, --green-dim, --green-muted
  --amber, --amber-dim, --red, --cyan
  --text-primary, --text-secondary, --text-dim, --white
  ```
- **Typography Scale** using JetBrains Mono and IBM Plex Sans (via Google Fonts)
- **Global Visual Effects:**
  - Scanline overlay (0.03-0.05 opacity CSS pattern)
  - Subtle noise/grain texture
  - Base styling for terminal aesthetic

Create `/styles/glitch.css` with:
- Glitch animation keyframes for hover effects

### 3. Layout Components

#### `/components/layout/Navbar.tsx`
- Desktop: Horizontal terminal-style navigation bar
- Mobile: Hamburger menu (terminal-green) → full-screen overlay menu
- Links: Home, Events, Resources, Projects, Blog, About, Join
- Logo: Stylized terminal prompt or "CCK" ASCII art
- Active page highlighted with green underline
- Primary CTA button: `> JOIN`

#### `/components/layout/Footer.tsx`
- Terminal window styled footer (box drawing characters)
- Sections: Quick Links, Community, Resources, Contact
- Copyright and "Built with ❤️ and Claude Code"
- `$ exit` Easter egg (hover reveals: "You can check out any time...")

#### `/components/layout/PageTransition.tsx`
- Framer Motion wrapper for all pages
- Fade + subtle slide animation
- Respects `prefers-reduced-motion`

#### `/components/layout/MobileMenu.tsx`
- Full-screen terminal-styled overlay
- Command-style links (e.g., `> HOME`, `> EVENTS`)
- Smooth open/close animation

### 4. Core UI Components Library

#### `/components/ui/Button.tsx`
- **Primary (green):** Border + text in green, fills on hover
- **Secondary (amber):** Border + text in amber, fills on hover
- **All prefixed with `>` symbol**
- Keyboard accessible, proper focus states
- Loading state support

#### `/components/ui/Card.tsx`
- Terminal window style with optional title bar
- Supports macOS-style dots (● ● ●) decoration
- Subtle border, hover lift with green glow
- Configurable padding and styling

#### `/components/ui/Badge.tsx`
- Status indicators: `UPCOMING` (green), `REGISTRATION OPEN` (amber), `COMPLETED` (dim), `SOLD OUT` (red)
- Inline tag styling for event types and content tags

#### `/components/ui/CountUp.tsx`
- Animated number counter (0 → target value)
- Used for stats bar on homepage
- Triggers on scroll into view

#### `/components/ui/Accordion.tsx`
- Collapsible terminal-styled sections
- Used for FAQ page
- Smooth open/close animations

#### `/components/ui/Timeline.tsx`
- Vertical git-log style timeline
- Used for About page milestones
- Commit-style entries with dates

### 5. Utility Libraries

#### `/lib/constants.ts`
- Site-wide URLs and links
- API endpoints (placeholders for v1)
- Social media handles
- Community Discord/contact info
- Site metadata

#### `/lib/utils.ts`
- Utility functions for:
  - Date formatting (events)
  - Reading time calculation (blog posts)
  - String utilities (slugs, formatting)
  - Responsive breakpoint helpers

### 6. Root Layout & Fonts

#### `/app/layout.tsx`
- Configure Google Fonts:
  - JetBrains Mono (headings, UI, code)
  - IBM Plex Sans (body text)
- Root navigation & footer wrapper
- Global providers for animations
- Meta tags structure for SEO
- Skip navigation link for accessibility

### 7. Data Structure Setup

Create `/data/` directory with TypeScript interfaces:

#### `/data/events.ts`
```typescript
interface Event {
  slug: string
  title: string
  date: string
  time: string
  venue: string
  city: string
  type: 'meetup' | 'workshop' | 'career-talk' | 'hackathon'
  status: 'upcoming' | 'registration-open' | 'completed' | 'sold-out'
  description: string
  agenda?: string[]
  registrationUrl?: string
  lumaUrl?: string
  host?: string
  partnerOrg?: string
  highlights?: string[]
  attendeeCount?: number
  photosUrl?: string
}
```

#### `/data/blog-posts.ts`
```typescript
interface BlogPost {
  slug: string
  title: string
  date: string
  author: string
  tags: string[]
  excerpt: string
  content: string
  readingTime: number
}
```

#### `/data/projects.ts`
```typescript
interface Project {
  id: string
  name: string
  builder: string
  description: string
  stack: string[]
  status: 'in-production' | 'in-development' | 'live'
  demoUrl?: string
  repoUrl?: string
  featured: boolean
}
```

#### `/data/resources.ts`
```typescript
interface Resource {
  id: string
  title: string
  url: string
  category: string
  description?: string
}
```

#### `/data/team.ts`
```typescript
interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  linkedIn?: string
  github?: string
  twitter?: string
  avatar?: string
}
```

#### `/data/faq.ts`
```typescript
interface FAQ {
  id: string
  category: 'general' | 'events' | 'technical'
  question: string
  answer: string
}
```

### 8. Create `CLAUDE.md` for Project Context

At project root, create CLAUDE.md with:
- Tech stack overview
- Design system explanation
- Conventions for this project
- File structure notes
- Current focus areas

---

## Testing & Validation

- [ ] Next.js dev server runs without errors
- [ ] All fonts load correctly (check Network tab in DevTools)
- [ ] Color tokens render correctly across components
- [ ] Navbar responsive: desktop → mobile menu transition
- [ ] Footer renders with proper box-drawing characters
- [ ] All core UI components render and are keyboard accessible
- [ ] No console warnings or errors
- [ ] Lighthouse performance baseline established

---

## Notes

- **No pages yet** — Just foundation
- Use TypeScript strict mode throughout
- All CSS should use Tailwind + CSS variables (avoid inline styles)
- Focus on accessibility: ARIA labels, keyboard navigation, semantic HTML
- Test on mobile early
- After this phase completes, Phase 2 (Terminal Components) can begin in parallel with Phase 3 (Content Pages)

---

## File Structure Created

```
claude-community-kenya/
├── app/
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── PageTransition.tsx
│   │   └── MobileMenu.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── CountUp.tsx
│       ├── Accordion.tsx
│       └── Timeline.tsx
├── data/
│   ├── events.ts
│   ├── blog-posts.ts
│   ├── projects.ts
│   ├── resources.ts
│   ├── team.ts
│   └── faq.ts
├── lib/
│   ├── constants.ts
│   └── utils.ts
├── styles/
│   ├── globals.css
│   └── glitch.css
├── public/
│   └── favicon.ico
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

---

## Success Criteria

- Project initializes without errors
- All components export cleanly
- Design system is fully defined in CSS variables
- Accessibility baseline met (WCAG AA for color contrast, keyboard navigation)
- Ready for Phase 2 & 3 teams to integrate components into pages
