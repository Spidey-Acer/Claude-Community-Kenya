# Persona System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dual-persona system (Developer / Professional) that tailors the entire CCK website's headers, descriptions, and tone based on visitor choice.

**Architecture:** React context + localStorage persistence. A first-visit split-screen modal lets visitors choose; a navbar toggle lets them switch anytime. A centralized content map (`persona-content.ts`) holds all dual-language text. Components read from it via a `usePersonaContent()` hook. Server-side always renders Professional mode for SEO.

**Tech Stack:** React Context, Framer Motion, Canvas API (particle effects), localStorage

**Spec:** `docs/superpowers/specs/2026-03-31-persona-system-design.md`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/contexts/PersonaContext.tsx` | React context, provider, `usePersona()` hook |
| `src/data/persona-content.ts` | All dual-language content mapped by page + section |
| `src/hooks/usePersonaContent.ts` | Hook that resolves persona text for a given page/section |
| `src/components/persona/PersonaSelectorModal.tsx` | Full split-screen first-visit overlay |
| `src/components/persona/PersonaToggle.tsx` | Navbar icon buttons for switching persona |
| `src/components/persona/ParticleCanvas.tsx` | Canvas-based particle dissolution effect for modal exit |

### Modified Files
| File | Change |
|------|--------|
| `src/components/layout/ConditionalLayout.tsx` | Wrap children with `PersonaProvider` |
| `src/components/layout/Navbar.tsx` | Add `PersonaToggle` between search and JOIN |
| `src/components/layout/MobileMenu.tsx` | Add `PersonaToggle` below nav links |
| `src/app/page.tsx` | Use `usePersonaContent()` for all section headers |
| `src/app/about/page.tsx` | Use `usePersonaContent()` for all section headers + body text |
| `src/app/events/EventsContent.tsx` | Use `usePersonaContent()` for page header |
| `src/app/blog/page.tsx` | Use `usePersonaContent()` for page header |
| `src/app/projects/page.tsx` | Use `usePersonaContent()` for page header |
| `src/app/resources/page.tsx` | Use `usePersonaContent()` for page header + card descriptions |
| `src/app/resources/getting-started/page.tsx` | Use `usePersonaContent()` for section headers |
| `src/app/resources/claude-code/page.tsx` | Use `usePersonaContent()` for section headers |
| `src/app/resources/workflows/page.tsx` | Use `usePersonaContent()` for section headers |
| `src/app/resources/courses/page.tsx` | Use `usePersonaContent()` for page header |
| `src/app/resources/links/page.tsx` | Use `usePersonaContent()` for page header |
| `src/app/resources/api-guide/page.tsx` | Use `usePersonaContent()` for section headers |
| `src/app/resources/production-guide/page.tsx` | Use `usePersonaContent()` for section headers |
| `src/app/community/page.tsx` | Use `usePersonaContent()` for page header |
| `src/app/faq/page.tsx` | Use `usePersonaContent()` for page header + category commands |
| `src/app/faq/FaqClient.tsx` | Accept persona-aware category data |
| `src/app/ambassador/page.tsx` | Use `usePersonaContent()` for page header + body text |
| `src/app/code-of-conduct/page.tsx` | Use `usePersonaContent()` for page header |
| `src/app/not-found.tsx` | Use `usePersonaContent()` for 404 message |
| `src/app/volunteer/page.tsx` | Use `usePersonaContent()` for page header |

---

## Task 1: PersonaContext + Provider + Hook

**Files:**
- Create: `src/contexts/PersonaContext.tsx`
- Create: `src/hooks/usePersonaContent.ts`

- [ ] **Step 1: Create PersonaContext**

```tsx
// src/contexts/PersonaContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Persona = "dev" | "pro";

interface PersonaContextValue {
  persona: Persona | null;
  setPersona: (p: Persona) => void;
  isLoaded: boolean;
}

const PersonaContext = createContext<PersonaContextValue>({
  persona: null,
  setPersona: () => {},
  isLoaded: false,
});

const STORAGE_KEY = "cck-persona";

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Persona | null;
    if (stored === "dev" || stored === "pro") {
      setPersonaState(stored);
    }
    setIsLoaded(true);
  }, []);

  const setPersona = useCallback((p: Persona) => {
    setPersonaState(p);
    localStorage.setItem(STORAGE_KEY, p);
  }, []);

  return (
    <PersonaContext.Provider value={{ persona, setPersona, isLoaded }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return context;
}
```

- [ ] **Step 2: Create usePersonaContent hook**

```tsx
// src/hooks/usePersonaContent.ts
"use client";

import { usePersona } from "@/contexts/PersonaContext";
import { getPersonaContent, type SectionContent } from "@/data/persona-content";

export function usePersonaContent(page: string, section: string): SectionContent {
  const { persona } = usePersona();
  return getPersonaContent(page, section, persona ?? "pro");
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: May show errors for missing `persona-content` module — that's fine, created in Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/PersonaContext.tsx src/hooks/usePersonaContent.ts
git commit -m "feat(persona): add PersonaContext, provider, and usePersonaContent hook"
```

---

## Task 2: Content Map — Core Pages

**Files:**
- Create: `src/data/persona-content.ts`

This is the centralized source of all persona-specific text. Every heading, subtitle, and description that differs between dev and pro mode lives here.

- [ ] **Step 1: Create persona-content.ts with types and core pages**

```tsx
// src/data/persona-content.ts

export type Persona = "dev" | "pro";

type PersonaText = { dev: string; pro: string };

export interface SectionContent {
  heading?: string;
  subtitle?: string;
  description?: string;
  items?: string[];
}

interface SectionDef {
  heading?: PersonaText;
  subtitle?: PersonaText;
  description?: PersonaText;
  items?: { dev: string[]; pro: string[] };
}

type PageDef = Record<string, SectionDef>;

const CONTENT: Record<string, PageDef> = {
  // ─── HOME ───
  home: {
    heroSubtitle: {
      subtitle: {
        dev: "Anthropic-supported Claude developer community — building, learning, and shipping with Claude.",
        pro: "Anthropic-supported Claude community — learning, creating, and working with Claude AI.",
      },
    },
    events: {
      heading: {
        dev: "ls events/ --upcoming",
        pro: "Upcoming Events",
      },
      subtitle: {
        dev: "Upcoming meetups, workshops, and career talks across Kenya.",
        pro: "Upcoming meetups, workshops, and talks across Kenya.",
      },
    },
    whatWeDo: {
      heading: {
        dev: "man claude-community-kenya",
        pro: "What We Do",
      },
      subtitle: {
        dev: "How we bring Kenya's developer community together around Claude and AI.",
        pro: "How we bring Kenya's community together around Claude and AI.",
      },
    },
    testimonials: {
      heading: {
        dev: "cat community/voices.log",
        pro: "Community Voices",
      },
      subtitle: {
        dev: "What developers are saying about Claude Community Kenya.",
        pro: "What people are saying about Claude Community Kenya.",
      },
    },
    projects: {
      heading: {
        dev: "ls projects/ --featured",
        pro: "Featured Projects",
      },
      subtitle: {
        dev: "Real projects built by community members with Claude Code.",
        pro: "Real projects created by community members with Claude.",
      },
    },
    cta: {
      heading: {
        dev: "sudo join --community",
        pro: "Join the Community",
      },
      subtitle: {
        dev: "Whether you're an experienced AI developer or just getting started, there's a place for you in Claude Community Kenya.",
        pro: "Whether you're experienced with AI or just curious about what Claude can do, there's a place for you here.",
      },
    },
  },

  // ─── ABOUT ───
  about: {
    hero: {
      heading: {
        dev: "cat README.md",
        pro: "Our Story",
      },
      subtitle: {
        dev: "Africa's only Claude developer community. Not the first — the only one.",
        pro: "Africa's only Claude community. Not the first — the only one.",
      },
    },
    origin: {
      heading: {
        dev: "cat origin-story.md",
        pro: "How It Started",
      },
    },
    mission: {
      heading: {
        dev: "cat mission.json",
        pro: "What We Stand For",
      },
    },
    missionContent: {
      description: {
        dev: "Give developers across Africa the tools, knowledge, and community to build real things with Claude — from farm management systems to fintech, from healthtech to education.",
        pro: "Give people across Africa the tools, knowledge, and community to do real work with Claude — from software to research, from business to education.",
      },
    },
    visionContent: {
      description: {
        dev: "Make Kenya the launchpad for AI-first development across Africa. Not by talking about it — by shipping.",
        pro: "Make Kenya the launchpad for AI-powered work across Africa. Not by talking about it — by doing it.",
      },
    },
    team: {
      heading: {
        dev: "ls team/ --all",
        pro: "The Team",
      },
    },
    timeline: {
      heading: {
        dev: "git log --oneline",
        pro: "Milestones",
      },
      subtitle: {
        dev: "Our journey so far — every milestone tracked like a git commit.",
        pro: "Our journey so far — every milestone on the record.",
      },
    },
  },

  // ─── EVENTS ───
  events: {
    hero: {
      heading: {
        dev: "ls events/ -la --sort=date",
        pro: "Browse Events",
      },
      subtitle: {
        dev: "Meetups, workshops, hackathons, and career talks across Kenya. Find an event near you and join the community.",
        pro: "Meetups, workshops, and talks across Kenya. Find an event near you and join the community.",
      },
    },
  },

  // ─── BLOG ───
  blog: {
    hero: {
      heading: {
        dev: "tail -f community.log",
        pro: "Community Blog",
      },
      subtitle: {
        dev: "Updates, recaps, and thoughts from the community.",
        pro: "Updates, recaps, and thoughts from the community.",
      },
    },
  },

  // ─── PROJECTS ───
  projects: {
    hero: {
      heading: {
        dev: "ls projects/ -la",
        pro: "Community Projects",
      },
      subtitle: {
        dev: "Built by the community, powered by Claude.",
        pro: "Created by the community, powered by Claude.",
      },
    },
    submitCta: {
      heading: {
        dev: "Built something with Claude?",
        pro: "Created something with Claude?",
      },
      subtitle: {
        dev: "Share what you've built. Every project, big or small, inspires someone.",
        pro: "Share what you've created. Every project, big or small, inspires someone.",
      },
    },
  },

  // ─── COMMUNITY HUB ───
  community: {
    hero: {
      heading: {
        dev: "ls community/ --shared",
        pro: "Community Hub",
      },
      subtitle: {
        dev: "MCPs, prompts, workflows, and tools built by the community. Browse what others have shared or submit your own.",
        pro: "Prompts, workflows, and tools shared by the community. Browse what others have created or submit your own.",
      },
    },
  },

  // ─── FAQ ───
  faq: {
    hero: {
      heading: {
        dev: "claude --help",
        pro: "Help & FAQ",
      },
    },
    still: {
      heading: {
        dev: 'echo "Still have questions?"',
        pro: "Still Have Questions?",
      },
    },
    categoryGeneral: {
      heading: {
        dev: "cat faq/general.txt",
        pro: "General",
      },
    },
    categoryEvents: {
      heading: {
        dev: "cat faq/events.txt",
        pro: "Events",
      },
    },
    categoryTechnical: {
      heading: {
        dev: "cat faq/technical.txt",
        pro: "Technical",
      },
    },
  },

  // ─── AMBASSADOR ───
  ambassador: {
    hero: {
      heading: {
        dev: "cat ambassador-program.md",
        pro: "Ambassador Program",
      },
    },
    getInvolved: {
      heading: {
        dev: 'echo "Get Involved"',
        pro: "Get Involved",
      },
    },
    body: {
      description: {
        dev: "Organize meetups, workshops, and hackathons. Lead and grow local developer communities.",
        pro: "Organize meetups, workshops, and events. Lead and grow local communities.",
      },
    },
  },

  // ─── CODE OF CONDUCT ───
  codeOfConduct: {
    hero: {
      heading: {
        dev: "cat CODE_OF_CONDUCT.md",
        pro: "Code of Conduct",
      },
    },
  },

  // ─── 404 ───
  notFound: {
    hero: {
      heading: {
        dev: "cd /requested-page",
        pro: "Page Not Found",
      },
      subtitle: {
        dev: "bash: /requested-page: No such file or directory",
        pro: "The page you're looking for doesn't exist or has been moved.",
      },
    },
  },

  // ─── VOLUNTEER ───
  volunteer: {
    hero: {
      heading: {
        dev: "volunteer --apply",
        pro: "Volunteer With Us",
      },
      subtitle: {
        dev: "Help us grow Claude Community Kenya. We're looking for passionate volunteers to help manage social media, create content, coordinate events, and build community.",
        pro: "Help us grow Claude Community Kenya. We're looking for passionate volunteers to help manage social media, create content, coordinate events, and grow the community.",
      },
    },
  },
};

export function getPersonaContent(
  page: string,
  section: string,
  persona: "dev" | "pro",
): SectionContent {
  const pageDef = CONTENT[page];
  if (!pageDef) return {};
  const sectionDef = pageDef[section];
  if (!sectionDef) return {};

  return {
    heading: sectionDef.heading?.[persona],
    subtitle: sectionDef.subtitle?.[persona],
    description: sectionDef.description?.[persona],
    items: sectionDef.items?.[persona],
  };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/data/persona-content.ts
git commit -m "feat(persona): add centralized content map for all core pages"
```

---

## Task 3: Content Map — Resource Pages

**Files:**
- Modify: `src/data/persona-content.ts`

Resource pages have many section headers. Dev-specific pages (Claude Code, Workflows, API Guide, Production Guide) keep their technical content but get friendlier headers in pro mode.

- [ ] **Step 1: Add resource page entries to persona-content.ts**

Add these entries inside the `CONTENT` object, after the `volunteer` entry:

```ts
  // ─── RESOURCES INDEX ───
  resources: {
    hero: {
      heading: {
        dev: "man claude --resources",
        pro: "Resources",
      },
      subtitle: {
        dev: "Everything you need to start building with Claude",
        pro: "Everything you need to start using Claude",
      },
    },
    claudeCode: {
      description: {
        dev: "Master the CLI tool that's changing how developers build software.",
        pro: "Learn about the AI coding tool that helps developers write software faster.",
      },
    },
    workflows: {
      description: {
        dev: "Agentic patterns, plan mode, git worktrees, and production strategies.",
        pro: "Advanced strategies and patterns for getting more done with Claude.",
      },
    },
    apiGuide: {
      description: {
        dev: "Complete API reference — authentication, models, streaming, tool use, and code examples.",
        pro: "Technical reference for integrating Claude into applications.",
      },
    },
    productionGuide: {
      description: {
        dev: "Deploy Claude to production — error handling, rate limits, cost optimization, and security.",
        pro: "Guide to using Claude reliably at scale — costs, security, and best practices.",
      },
    },
  },

  // ─── GETTING STARTED ───
  gettingStarted: {
    hero: {
      heading: {
        dev: "cat getting-started.md",
        pro: "Getting Started",
      },
      subtitle: {
        dev: "Your guide to getting started with Claude AI — from zero to building.",
        pro: "Your guide to getting started with Claude AI — from zero to productive.",
      },
    },
    products: {
      heading: {
        dev: "ls ./claude-products/",
        pro: "Claude Products",
      },
    },
    setup: {
      heading: {
        dev: "./setup.sh --guided",
        pro: "Quick Setup",
      },
    },
    pricing: {
      heading: {
        dev: "claude --pricing",
        pro: "Pricing",
      },
    },
  },

  // ─── CLAUDE CODE ───
  claudeCode: {
    hero: {
      heading: {
        dev: "man claude-code",
        pro: "Claude Code Guide",
      },
      subtitle: {
        dev: "The complete guide to Anthropic's CLI for building software with Claude.",
        pro: "A guide to Anthropic's AI-powered coding assistant.",
      },
    },
    install: {
      heading: { dev: "./install.sh", pro: "Installation" },
    },
    commands: {
      heading: { dev: "claude /help", pro: "Key Commands" },
    },
    claudeMd: {
      heading: { dev: "cat CLAUDE.md", pro: "Project Configuration" },
    },
    multiInstance: {
      heading: { dev: "tmux split-window -h", pro: "Multi-Instance Workflows" },
    },
    resources: {
      heading: { dev: "cat ./resources.txt", pro: "Learn More" },
    },
  },

  // ─── WORKFLOWS ───
  workflows: {
    hero: {
      heading: {
        dev: "cat advanced-workflows.md",
        pro: "Advanced Workflows",
      },
      subtitle: {
        dev: "Level up your development with agentic patterns, parallel workflows, and production-grade strategies.",
        pro: "Advanced strategies for getting more done with Claude.",
      },
    },
    agentic: {
      heading: { dev: "explain --agentic-development", pro: "Agentic Development" },
    },
    planMode: {
      heading: { dev: "claude --plan", pro: "Plan Mode" },
    },
    worktrees: {
      heading: { dev: "git worktree --strategy", pro: "Parallel Workflows" },
    },
  },

  // ─── COURSES ───
  courses: {
    hero: {
      heading: {
        dev: "cat learning-paths.md",
        pro: "Learning Paths",
      },
      subtitle: {
        dev: "Free structured courses from Anthropic. Complete them in order for the best learning experience — or jump to the topic you need.",
        pro: "Free structured courses from Anthropic. Complete them in order for the best learning experience — or jump to the topic you need.",
      },
    },
  },

  // ─── LINKS ───
  links: {
    hero: {
      heading: {
        dev: "tree ./resources --links",
        pro: "Resource Directory",
      },
      subtitle: {
        dev: "A comprehensive directory of resources, tools, and communities — curated by Claude Community Kenya.",
        pro: "A comprehensive directory of resources, tools, and communities — curated by Claude Community Kenya.",
      },
    },
    contribute: {
      heading: {
        dev: "contribute --resource",
        pro: "Contribute a Resource",
      },
    },
  },

  // ─── API GUIDE ───
  apiGuide: {
    hero: {
      heading: {
        dev: "man claude-api",
        pro: "API Reference",
      },
      subtitle: {
        dev: "A complete reference for integrating Claude into your applications via the Anthropic API.",
        pro: "A complete reference for integrating Claude into your applications.",
      },
    },
    auth: {
      heading: { dev: 'export ANTHROPIC_API_KEY="..."', pro: "Authentication" },
    },
    models: {
      heading: { dev: "claude models --list", pro: "Available Models" },
    },
    basicUsage: {
      heading: { dev: "curl https://api.anthropic.com/v1/messages", pro: "Basic Usage" },
    },
    streaming: {
      heading: { dev: "claude --stream", pro: "Streaming Responses" },
    },
    tools: {
      heading: { dev: "claude --tools", pro: "Tool Use" },
    },
    systemPrompts: {
      heading: { dev: 'claude --system "You are..."', pro: "System Prompts" },
    },
    rateLimits: {
      heading: { dev: "claude --rate-limits", pro: "Rate Limits" },
    },
    sdk: {
      heading: { dev: "npm install @anthropic-ai/sdk", pro: "SDK Installation" },
    },
    nextSteps: {
      heading: { dev: "cat ./next-steps.md", pro: "Next Steps" },
    },
  },

  // ─── PRODUCTION GUIDE ───
  productionGuide: {
    hero: {
      heading: {
        dev: "deploy --production",
        pro: "Production Guide",
      },
      subtitle: {
        dev: "Everything you need to ship Claude-powered applications that are reliable, cost-efficient, and ready for real users.",
        pro: "Everything you need to run Claude-powered applications that are reliable, cost-efficient, and ready for real users.",
      },
    },
    architecture: {
      heading: { dev: "cat architecture.md", pro: "Architecture" },
    },
    errorHandling: {
      heading: { dev: "try {} catch { handle() }", pro: "Error Handling" },
    },
    rateLimits: {
      heading: { dev: "cat rate-limits.md", pro: "Rate Limits" },
    },
    prompts: {
      heading: { dev: "vim system-prompt.txt", pro: "Prompt Design" },
    },
    costs: {
      heading: { dev: "claude --cost-optimize", pro: "Cost Optimization" },
    },
    security: {
      heading: { dev: "chmod 600 .env", pro: "Security" },
    },
    monitoring: {
      heading: { dev: "tail -f production.log", pro: "Monitoring" },
    },
    checklist: {
      heading: { dev: "./pre-launch-checklist.sh", pro: "Launch Checklist" },
    },
    nextSteps: {
      heading: { dev: "cat ./next-steps.md", pro: "Next Steps" },
    },
  },
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/data/persona-content.ts
git commit -m "feat(persona): add content map entries for all resource pages"
```

---

## Task 4: PersonaSelectorModal — Layout & Structure

**Files:**
- Create: `src/components/persona/PersonaSelectorModal.tsx`

Build the split-screen modal without animations first. Animations come in Task 5.

- [ ] **Step 1: Create the modal component**

```tsx
// src/components/persona/PersonaSelectorModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { Persona } from "@/contexts/PersonaContext";

interface PersonaSelectorModalProps {
  onSelect: (persona: Persona) => void;
}

export function PersonaSelectorModal({ onSelect }: PersonaSelectorModalProps) {
  const [hoveredSide, setHoveredSide] = useState<Persona | null>(null);
  const [selectedSide, setSelectedSide] = useState<Persona | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleSelect = (persona: Persona) => {
    setSelectedSide(persona);
    setIsExiting(true);
    // Delay actual persona set to allow exit animation
    setTimeout(() => {
      onSelect(persona);
    }, 1000);
  };

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 z-[200] flex"
        role="dialog"
        aria-modal="true"
        aria-label="Choose your experience"
      >
        <button
          className="flex flex-1 flex-col items-center justify-center bg-bg-primary"
          onClick={() => onSelect("dev")}
          aria-label="Enter as Developer"
        >
          <span className="font-mono text-sm text-green-primary/50">$ whoami</span>
          <span className="mt-2 font-mono text-2xl font-bold text-green-primary">&gt;_</span>
          <span className="mt-2 font-mono text-xl font-bold text-green-primary">Developer</span>
          <span className="mt-2 text-sm text-text-dim">I write code. Show me the terminal.</span>
        </button>
        <div className="w-px bg-border-default" />
        <button
          className="flex flex-1 flex-col items-center justify-center bg-[#111]"
          onClick={() => onSelect("pro")}
          aria-label="Enter as Professional"
        >
          <span className="font-mono text-sm text-amber/50">Welcome</span>
          <span className="mt-2 text-2xl text-amber">◆</span>
          <span className="mt-2 font-mono text-xl font-bold text-amber">Professional</span>
          <span className="mt-2 text-sm text-text-dim">I use Claude for work. Keep it clean.</span>
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {!isExiting || selectedSide ? (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col sm:flex-row"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your experience"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* CCK Logo — top center */}
          <motion.div
            className="absolute left-1/2 top-8 z-10 -translate-x-1/2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <Image
              src="/images/Claude Community Kenya.png"
              alt="Claude Community Kenya"
              width={64}
              height={64}
              className="rounded-lg"
            />
          </motion.div>

          {/* Developer Side */}
          <motion.button
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-bg-primary transition-[flex] duration-200 ease-out"
            style={{
              flex: hoveredSide === "dev" ? 1.08 : hoveredSide === "pro" ? 0.92 : 1,
            }}
            onClick={() => handleSelect("dev")}
            onMouseEnter={() => setHoveredSide("dev")}
            onMouseLeave={() => setHoveredSide(null)}
            aria-label="Enter as Developer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
          >
            {/* Gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-primary/5 to-transparent" />

            <motion.span
              className="relative font-mono text-sm text-green-primary/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              $ whoami
            </motion.span>
            <motion.span
              className="relative mt-3 font-mono text-4xl text-green-primary"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.3 }}
            >
              &gt;_
            </motion.span>
            <motion.span
              className="relative mt-3 font-mono text-2xl font-bold text-green-primary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              Developer
            </motion.span>
            <motion.span
              className="relative mt-2 text-sm text-text-dim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.08 }}
            >
              I write code. Show me the terminal.
            </motion.span>
            <motion.div
              className="relative mt-6 space-y-1 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.16 }}
            >
              <p className="font-mono text-xs text-green-primary/40">$ cat README.md</p>
              <p className="font-mono text-xs text-green-primary/40">$ git log --oneline</p>
              <p className="font-mono text-xs text-green-primary/40">$ ls projects/ -la</p>
            </motion.div>
          </motion.button>

          {/* Center Divider */}
          <motion.div
            className="z-10 hidden sm:block"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ originY: 0.5 }}
          >
            <div
              className="h-full w-px transition-shadow duration-200"
              style={{
                backgroundColor: hoveredSide === "dev" ? "#00ff41" : hoveredSide === "pro" ? "#ffb000" : "#333",
                boxShadow:
                  hoveredSide === "dev"
                    ? "0 0 12px rgba(0,255,65,0.4)"
                    : hoveredSide === "pro"
                      ? "0 0 12px rgba(255,176,0,0.4)"
                      : "none",
              }}
            />
          </motion.div>

          {/* Mobile horizontal divider */}
          <motion.div
            className="z-10 sm:hidden"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div
              className="h-px w-full transition-shadow duration-200"
              style={{
                backgroundColor: hoveredSide === "dev" ? "#00ff41" : hoveredSide === "pro" ? "#ffb000" : "#333",
                boxShadow:
                  hoveredSide === "dev"
                    ? "0 0 12px rgba(0,255,65,0.4)"
                    : hoveredSide === "pro"
                      ? "0 0 12px rgba(255,176,0,0.4)"
                      : "none",
              }}
            />
          </motion.div>

          {/* Professional Side */}
          <motion.button
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#111] transition-[flex] duration-200 ease-out"
            style={{
              flex: hoveredSide === "pro" ? 1.08 : hoveredSide === "dev" ? 0.92 : 1,
            }}
            onClick={() => handleSelect("pro")}
            onMouseEnter={() => setHoveredSide("pro")}
            onMouseLeave={() => setHoveredSide(null)}
            aria-label="Enter as Professional"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-amber/5 to-transparent" />

            <motion.span
              className="relative font-mono text-sm text-amber/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Welcome
            </motion.span>
            <motion.span
              className="relative mt-3 text-4xl text-amber"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.3 }}
            >
              ◆
            </motion.span>
            <motion.span
              className="relative mt-3 font-mono text-2xl font-bold text-amber"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              Professional
            </motion.span>
            <motion.span
              className="relative mt-2 text-sm text-text-dim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.08 }}
            >
              I use Claude for work. Keep it clean.
            </motion.span>
            <motion.div
              className="relative mt-6 space-y-1 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.16 }}
            >
              <p className="font-mono text-xs text-amber/40">Our Story</p>
              <p className="font-mono text-xs text-amber/40">Milestones</p>
              <p className="font-mono text-xs text-amber/40">Community Projects</p>
            </motion.div>
          </motion.button>

          {/* Footer — "You can switch anytime" */}
          <motion.p
            className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 font-sans text-xs text-text-dim/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            You can switch anytime
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/components/persona/PersonaSelectorModal.tsx
git commit -m "feat(persona): add split-screen selector modal with curtain-call entry animation"
```

---

## Task 5: Particle Canvas Exit Effect

**Files:**
- Create: `src/components/persona/ParticleCanvas.tsx`
- Modify: `src/components/persona/PersonaSelectorModal.tsx`

The "particle absorption" exit: rejected side dissolves into particles that drift toward the chosen side, then the chosen side fills the screen with a color flash.

- [ ] **Step 1: Create ParticleCanvas component**

```tsx
// src/components/persona/ParticleCanvas.tsx
"use client";

import { useEffect, useRef } from "react";
import type { Persona } from "@/contexts/PersonaContext";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface ParticleCanvasProps {
  selected: Persona;
  onComplete: () => void;
}

export function ParticleCanvas({ selected, onComplete }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const particleCount = 120;
    const isDevSelected = selected === "dev";

    // Rejected side is the opposite half
    const rejectedStartX = isDevSelected ? canvas.width / 2 : 0;
    const rejectedEndX = isDevSelected ? canvas.width : canvas.width / 2;
    const targetX = isDevSelected ? canvas.width * 0.25 : canvas.width * 0.75;
    const rejectedColor = isDevSelected ? "#ffb000" : "#00ff41";

    // Create particles scattered across the rejected side
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: rejectedStartX + Math.random() * (rejectedEndX - rejectedStartX),
        y: Math.random() * canvas.height,
        targetX,
        vx: 0,
        vy: 0,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        color: rejectedColor,
      });
    }

    let frame = 0;
    const maxFrames = 60; // ~1 second at 60fps

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const progress = frame / maxFrames;

      for (const p of particles) {
        // Drift toward the chosen side
        p.vx += (p.targetX - p.x) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.5;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.98;
        p.size *= 0.995;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          p.color +
          Math.round(p.alpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();
      }

      // Color flash overlay for the chosen side
      if (progress > 0.5) {
        const flashAlpha = Math.sin((progress - 0.5) * Math.PI) * 0.3;
        const flashColor = isDevSelected
          ? `rgba(0, 255, 65, ${flashAlpha})`
          : `rgba(255, 176, 0, ${flashAlpha})`;
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    }

    requestAnimationFrame(animate);
  }, [selected, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[201]"
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Wire ParticleCanvas into PersonaSelectorModal**

In `src/components/persona/PersonaSelectorModal.tsx`, add the import at the top:

```tsx
import { ParticleCanvas } from "@/components/persona/ParticleCanvas";
```

Replace the `handleSelect` function:

```tsx
  const handleSelect = (persona: Persona) => {
    setSelectedSide(persona);
    setIsExiting(true);
  };

  const handleParticlesComplete = () => {
    if (selectedSide) {
      onSelect(selectedSide);
    }
  };
```

Add the ParticleCanvas inside the component's return, after the `AnimatePresence` block but still inside the fragment:

```tsx
      {isExiting && selectedSide && (
        <ParticleCanvas selected={selectedSide} onComplete={handleParticlesComplete} />
      )}
```

Also update the exit animation on the main `motion.div` — when `isExiting` is true, the modal should fade out during the particle effect. Change the animate prop:

```tsx
          animate={{ opacity: isExiting ? 0 : 1 }}
          transition={{ duration: isExiting ? 0.8 : 0.3 }}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/components/persona/ParticleCanvas.tsx src/components/persona/PersonaSelectorModal.tsx
git commit -m "feat(persona): add particle-absorption exit animation to selector modal"
```

---

## Task 6: PersonaToggle — Navbar Icon Buttons

**Files:**
- Create: `src/components/persona/PersonaToggle.tsx`

- [ ] **Step 1: Create PersonaToggle component**

```tsx
// src/components/persona/PersonaToggle.tsx
"use client";

import { usePersona, type Persona } from "@/contexts/PersonaContext";

export function PersonaToggle({ className }: { className?: string }) {
  const { persona, setPersona, isLoaded } = usePersona();

  if (!isLoaded || !persona) return null;

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <button
        onClick={() => setPersona("dev")}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all ${
          persona === "dev"
            ? "border-green-primary/40 text-green-primary"
            : "border-transparent text-text-dim hover:text-text-secondary"
        }`}
        aria-label={persona === "dev" ? "Developer mode active" : "Switch to Developer mode"}
        aria-pressed={persona === "dev"}
        title="Developer mode"
      >
        <span className="text-sm">&gt;_</span>
        <span>DEV</span>
      </button>
      <button
        onClick={() => setPersona("pro")}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all ${
          persona === "pro"
            ? "border-amber/40 text-amber"
            : "border-transparent text-text-dim hover:text-text-secondary"
        }`}
        aria-label={persona === "pro" ? "Professional mode active" : "Switch to Professional mode"}
        aria-pressed={persona === "pro"}
        title="Professional mode"
      >
        <span className="text-sm">◆</span>
        <span>PRO</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/components/persona/PersonaToggle.tsx
git commit -m "feat(persona): add navbar persona toggle with icon buttons"
```

---

## Task 7: Integration — Mount Provider, Add Toggle to Navbar

**Files:**
- Modify: `src/components/layout/ConditionalLayout.tsx`
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/layout/MobileMenu.tsx`

- [ ] **Step 1: Read current ConditionalLayout**

Read `src/components/layout/ConditionalLayout.tsx` to get exact current code.

- [ ] **Step 2: Wrap children with PersonaProvider and add modal**

Add imports at the top of `ConditionalLayout.tsx`:

```tsx
import { PersonaProvider, usePersona } from "@/contexts/PersonaContext";
import { PersonaSelectorModal } from "@/components/persona/PersonaSelectorModal";
```

Wrap the public-facing branch (the non-admin block) with `<PersonaProvider>`:

```tsx
// The existing public layout:
<PersonaProvider>
  <a href="#main-content" className="...">Skip to main content</a>
  <Navbar />
  <LoadingBar />
  <main id="main-content">
    <PageTransition>{children}</PageTransition>
  </main>
  <Footer />
  <EasterEggs />
  <PersonaGate />
</PersonaProvider>
```

Add a small inner component that conditionally renders the modal:

```tsx
function PersonaGate() {
  const { persona, setPersona, isLoaded } = usePersona();

  if (!isLoaded || persona !== null) return null;

  return <PersonaSelectorModal onSelect={setPersona} />;
}
```

- [ ] **Step 3: Read current Navbar**

Read `src/components/layout/Navbar.tsx` to get exact insertion point.

- [ ] **Step 4: Add PersonaToggle to Navbar**

Add import at top of `Navbar.tsx`:

```tsx
import { PersonaToggle } from "@/components/persona/PersonaToggle";
```

Insert `<PersonaToggle />` between the search button and JOIN CTA in the desktop nav (after the search `<button>`, before the `<Link href="/join">`):

```tsx
<PersonaToggle className="ml-2" />
```

- [ ] **Step 5: Read current MobileMenu**

Read `src/components/layout/MobileMenu.tsx` to get exact insertion point.

- [ ] **Step 6: Add PersonaToggle to MobileMenu**

Add import at top of `MobileMenu.tsx`:

```tsx
import { PersonaToggle } from "@/components/persona/PersonaToggle";
```

Insert `<PersonaToggle />` after the nav links loop ends and before the JOIN CTA `motion.div`. Wrap it in a `motion.div` with the same stagger pattern:

```tsx
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: NAV_LINKS.length * 0.05 }}
  className="mt-4 flex justify-center"
>
  <PersonaToggle />
</motion.div>
```

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/ConditionalLayout.tsx src/components/layout/Navbar.tsx src/components/layout/MobileMenu.tsx
git commit -m "feat(persona): mount provider in layout, add toggle to navbar and mobile menu"
```

---

## Task 8: Update About Page — Use Persona Content

**Files:**
- Modify: `src/app/about/page.tsx`

The about page is currently a server component. Since persona is client-side, we need to extract the persona-dependent parts into a client component wrapper.

- [ ] **Step 1: Read current about page**

Read `src/app/about/page.tsx` for the exact current code.

- [ ] **Step 2: Create a client wrapper for persona headings**

Add a new client component at the top of the about page file (or in a separate file). The simplest approach: create a `PersonaHeading` client component that wraps `CommandPrefix` + heading text.

Create `src/components/persona/PersonaHeading.tsx`:

```tsx
// src/components/persona/PersonaHeading.tsx
"use client";

import { CommandPrefix } from "@/components/terminal";
import { usePersonaContent } from "@/hooks/usePersonaContent";

interface PersonaHeadingProps {
  page: string;
  section: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  showPrefix?: boolean;
  prefixSymbol?: "$" | ">" | "#";
}

export function PersonaHeading({
  page,
  section,
  as: Tag = "h2",
  className = "mb-2 font-mono text-xl text-green-primary",
  showPrefix = true,
  prefixSymbol = "$",
}: PersonaHeadingProps) {
  const content = usePersonaContent(page, section);
  if (!content.heading) return null;

  return (
    <Tag className={className}>
      {showPrefix && <CommandPrefix symbol={prefixSymbol} />}
      {content.heading}
    </Tag>
  );
}
```

Also create `PersonaText` for inline text swaps:

```tsx
// src/components/persona/PersonaText.tsx
"use client";

import { usePersonaContent } from "@/hooks/usePersonaContent";

interface PersonaTextProps {
  page: string;
  section: string;
  field: "heading" | "subtitle" | "description";
  className?: string;
  as?: "p" | "span" | "div";
}

export function PersonaText({
  page,
  section,
  field,
  className,
  as: Tag = "p",
}: PersonaTextProps) {
  const content = usePersonaContent(page, section);
  const text = content[field];
  if (!text) return null;

  return <Tag className={className}>{text}</Tag>;
}
```

- [ ] **Step 3: Update about page to use PersonaHeading and PersonaText**

Replace each hardcoded `<CommandPrefix /> text` heading and persona-sensitive subtitle/description with the new components. The about page stays a server component — only the `PersonaHeading` and `PersonaText` children are client components.

Example replacements:

```tsx
// Before:
<h1 className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl">
  <CommandPrefix />
  Our Story
</h1>

// After:
<PersonaHeading
  page="about"
  section="hero"
  as="h1"
  className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl"
/>
```

```tsx
// Before:
<p className="max-w-2xl font-sans text-lg text-text-secondary">
  Africa&apos;s only Claude community. Not the first — the only one.
</p>

// After:
<PersonaText
  page="about"
  section="hero"
  field="subtitle"
  className="max-w-2xl font-sans text-lg text-text-secondary"
/>
```

Apply this pattern to all 5 headings and their subtitles in the about page: `hero`, `origin`, `mission`, `team`, `timeline`.

Also replace the mission content, vision content, and values text with `PersonaText` components pointing to `about.missionContent`, `about.visionContent`.

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add src/components/persona/PersonaHeading.tsx src/components/persona/PersonaText.tsx src/app/about/page.tsx
git commit -m "feat(persona): update about page to use persona-aware headings and text"
```

---

## Task 9: Update Home Page — Use Persona Content

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current home page sections that need persona treatment**

Read `src/app/page.tsx` focusing on the 5 section headers and hero subtitle.

- [ ] **Step 2: Add PersonaHeading and PersonaText imports**

```tsx
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
```

- [ ] **Step 3: Replace each hardcoded heading with PersonaHeading**

Apply to all 5 sections: `events`, `whatWeDo`, `testimonials`, `projects`, `cta` — plus the hero subtitle.

Same pattern as Task 8. Each `<CommandPrefix /> text` becomes a `<PersonaHeading page="home" section="..." />`.

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(persona): update home page to use persona-aware headings"
```

---

## Task 10: Update Remaining Core Pages

**Files:**
- Modify: `src/app/events/EventsContent.tsx`
- Modify: `src/app/blog/page.tsx`
- Modify: `src/app/projects/page.tsx`
- Modify: `src/app/community/page.tsx`
- Modify: `src/app/faq/page.tsx`
- Modify: `src/app/faq/FaqClient.tsx`
- Modify: `src/app/ambassador/page.tsx`
- Modify: `src/app/code-of-conduct/page.tsx`
- Modify: `src/app/not-found.tsx`
- Modify: `src/app/volunteer/page.tsx`

- [ ] **Step 1: Read each file to get exact current code**

Read all 10 files listed above.

- [ ] **Step 2: Update each file with PersonaHeading/PersonaText**

Apply the same pattern from Task 8 to each file. For each page:

1. Add imports for `PersonaHeading` and/or `PersonaText`
2. Replace `<CommandPrefix /> text` headings with `<PersonaHeading page="..." section="..." />`
3. Replace persona-sensitive subtitles with `<PersonaText page="..." section="..." field="subtitle" />`

**Special case — FAQ page:**
The FAQ page passes category commands to `FaqClient`. Update the categories array to use persona content. Since the page is a server component, the category commands should be passed as both `devCommand` and `proCommand`, and `FaqClient` (client component) reads persona to pick the right one.

**Special case — not-found.tsx:**
This is likely a client component already. Add `usePersonaContent` directly.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/app/events/ src/app/blog/ src/app/projects/ src/app/community/ src/app/faq/ src/app/ambassador/ src/app/code-of-conduct/ src/app/not-found.tsx src/app/volunteer/
git commit -m "feat(persona): update all core pages with persona-aware headings"
```

---

## Task 11: Update Resource Pages

**Files:**
- Modify: `src/app/resources/page.tsx`
- Modify: `src/app/resources/getting-started/page.tsx`
- Modify: `src/app/resources/claude-code/page.tsx`
- Modify: `src/app/resources/workflows/page.tsx`
- Modify: `src/app/resources/courses/page.tsx`
- Modify: `src/app/resources/links/page.tsx`
- Modify: `src/app/resources/api-guide/page.tsx`
- Modify: `src/app/resources/production-guide/page.tsx`

- [ ] **Step 1: Read each resource page**

Read all 8 files.

- [ ] **Step 2: Update resources index page**

Replace the main heading + card descriptions with persona variants from the content map.

- [ ] **Step 3: Update getting-started page**

Replace all 4 section headings: `hero`, `products`, `setup`, `pricing`.

- [ ] **Step 4: Update claude-code page**

Replace all 6 section headings: `hero`, `install`, `commands`, `claudeMd`, `multiInstance`, `resources`.

- [ ] **Step 5: Update workflows page**

Replace all 4 section headings: `hero`, `agentic`, `planMode`, `worktrees`.

- [ ] **Step 6: Update courses page**

Replace the hero heading.

- [ ] **Step 7: Update links page**

Replace the hero heading and contribute section heading.

- [ ] **Step 8: Update api-guide page**

Replace all 10 section headings.

- [ ] **Step 9: Update production-guide page**

Replace all 10 section headings.

- [ ] **Step 10: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean

- [ ] **Step 11: Commit**

```bash
git add src/app/resources/
git commit -m "feat(persona): update all resource pages with persona-aware headings"
```

---

## Task 12: Build Verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: Build succeeds with zero errors

- [ ] **Step 3: Manual smoke test**

Start dev server (`npm run dev`) and verify:
1. First visit shows split-screen persona selector
2. Clicking "Developer" dismisses modal with particle animation
3. All page headings show dev-mode text (CLI commands)
4. Navbar shows persona toggle with DEV active
5. Clicking PRO in navbar swaps all headings to clean text
6. Refreshing page remembers the choice (no modal)
7. Clearing localStorage and refreshing shows the modal again

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(persona): address build verification issues"
```
