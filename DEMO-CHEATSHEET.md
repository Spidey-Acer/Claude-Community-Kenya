# Claude Community Kenya — Live Demo Cheatsheet

> Quick reference for demoing this project at the meetup. Copy-paste ready.

---

## 1. Start the Dev Server

```bash
npm run dev
```

Open: http://localhost:3000

---

## 2. Show the Persona Toggle

- Click the toggle in the navbar (top right)
- **Dev Mode:** Terminal/hacker aesthetic — green text, matrix rain, CRT glow
- **Pro Mode:** Glassmorphism, Anthropic brand colors, premium feel
- Talk about: "Built entirely with Claude Code — even the design system switching"

---

## 3. Live Claude Code Demo Commands

### Ask Claude Code to explain the codebase
```
claude "explain the architecture of this project"
```

### Add a feature live
```
claude "add a 'Built with Claude Code' badge to the footer"
```

### Fix something live
```
claude "fix any TypeScript errors in the project"
```

### Generate a component
```
claude "create a speaker card component for the events page"
```

### Run checks
```
claude "run the build and fix any errors"
```

---

## 4. Key Files to Show (impressive code)

| What | File | Why |
|------|------|-----|
| Hero Terminal | `src/components/sections/HeroTerminal.tsx` | Live activity feed with typing animation |
| Persona System | `src/components/layout/PersonaProvider.tsx` | Context-based UI switching |
| Design System | `src/app/globals.css` | CSS variables + Tailwind v4 theme |
| Data Layer | `src/data/events.ts` | TypeScript-first data modeling |
| Terminal FX | `src/components/terminal/MatrixRain.tsx` | Canvas animation |
| Command Palette | `src/components/terminal/CommandPalette.tsx` | Cmd+K search |

---

## 5. Anthropic Course Concepts → This Codebase

| Course Concept | Where It Shows Up |
|---------------|-------------------|
| **Prompt Engineering** | Community Hub prompt submissions (`/community`) |
| **MCP (Model Context Protocol)** | MCP server submissions + resource pages |
| **Claude Code CLI** | The entire project — built with it |
| **Tool Use** | Community tools section, admin panel |
| **System Prompts** | Persona system — different "personalities" for the site |
| **Structured Output** | TypeScript interfaces in `src/data/` — type-safe content |

---

## 6. Architecture Talking Points

```
Next.js 16 (App Router) + TypeScript strict
├── Server Components (default — zero client JS)
├── Client Components (only where needed — interactivity)
├── Tailwind CSS v4 (CSS-based config, not JS)
├── Framer Motion (page transitions, scroll animations)
├── Prisma 7 + PostgreSQL (community submissions)
├── NextAuth v5 (admin auth)
├── Supabase Storage (file uploads)
├── Upstash Redis (rate limiting)
└── Deployed on Vercel (claudekenya.org)
```

---

## 7. Quick Build Verification

```bash
# Type check
npx tsc --noEmit

# Full build
npm run build

# Both
npx tsc --noEmit && npm run build
```

---

## 8. Git Workflow Demo

```bash
# Show clean conventional commits
git log --oneline -20

# Show current changes
git status
git diff --stat

# Commit with Claude Code
claude "/commit"
```

---

## 9. Pages to Navigate During Demo

| Page | URL | What to Show |
|------|-----|-------------|
| Home | `/` | Hero terminal, stats bar, persona toggle |
| About | `/about` | Timeline, team cards |
| Events | `/events` | Event cards, detail pages |
| Resources | `/resources` | 33 curated resources, sub-pages |
| Blog | `/blog` | Blog posts with reading time |
| Join | `/join` | Terminal-themed application form |
| FAQ | `/faq` | Accordion component |
| Community | `/community` | MCP/Prompt/Workflow submissions |

---

## 10. Crowd Pleasers

- **Cmd+K** → Opens command palette (search anything)
- **Matrix Rain** → Background animation on hero
- **Glitch Text** → Hover effects on headings
- **Persona Toggle** → Instant theme switch
- **Mobile responsive** → Show on phone too

---

## 11. Key Stats (accurate!)

- First meetup: **January 24, 2026**
- Venue: iHiT Events Space, Westlands, Nairobi
- Attendees: **30+**
- Events hosted: **2** (Nairobi #1 Jan 24, Nairobi #2 Feb 20)
- Cities: Nairobi + Mombasa

---

## 12. Links to Share with Audience

- **Website:** https://www.claudekenya.org
- **Discord:** https://discord.gg/CkD9QWjsHm
- **WhatsApp:** https://chat.whatsapp.com/HSNkqvKklyZBvI3zcpEMhX
- **Nairobi Events:** https://luma.com/sbsa789m
- **Mombasa Events:** https://luma.com/vsf5re14
- **Anthropic Courses:** https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
- **Claude Code:** https://docs.anthropic.com/en/docs/claude-code

---

*Good luck with the demo! 🚀*
