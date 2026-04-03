# Implementation Prompt: Claude Community Kenya Chatbot

> Paste this entire prompt into a new Claude Code window opened in the project root.

---

## Feature: Hybrid Community Chatbot for claudekenya.org

### Context

You are implementing a chatbot for **Claude Community Kenya** — East Africa's first Claude developer community website. The full design spec is at `docs/superpowers/specs/2026-04-01-chatbot-design.md`. **Read it first before writing any code.**

This is a **Next.js 16 App Router** project with **Tailwind CSS v4**, **Framer Motion**, and a **persona system** (Dev mode = terminal aesthetic, Pro mode = glassmorphism + Anthropic brand). The persona context lives in `src/components/persona/`.

### What You're Building

A hybrid chatbot that:
1. **Community-first** — answers questions about Claude Community Kenya using existing site data (events, FAQs, resources, how to join). Falls back to general Claude for off-topic questions.
2. **Persona-aware** — both visually and in personality. Dev mode = casual hacker tone + terminal UI. Pro mode = polished professional tone + glassmorphism UI.
3. **Streams responses** token-by-token via Vercel AI SDK + Claude Haiku.
4. **Suggests actions** — inline buttons for joining, registering for events, Discord, etc.
5. **Guides form flows** — conversationally helps users through applications (join, speak, volunteer), then links to the actual form page.

### Critical Files to Read Before Starting

Read these files to understand existing patterns and data:

```
src/app/globals.css                    # CSS variables, Tailwind theme tokens
src/app/layout.tsx                     # Root layout — you'll add ChatWidget here
src/components/persona/                # PersonaToggle, context, how persona works
src/components/sections/               # Existing card components for style reference
src/data/faq.ts                        # FAQ data to inject into system prompt
src/data/events.ts                     # Events data
src/data/resources.ts                  # Resources data
src/data/blog-posts.ts                 # Blog data
src/data/team.ts                       # Team data
src/data/projects.ts                   # Projects data
src/data/persona-content.ts            # Persona-specific content
src/lib/rate-limit.ts                  # Existing Upstash rate limiter — reuse pattern
CLAUDE.md                             # Project conventions, key facts, critical links
```

### New Files to Create

```
src/app/api/chat/route.ts             # POST — rate limit, build prompt, stream
src/app/chat/page.tsx                 # Dedicated full-page chat experience

src/components/chat/ChatPanel.tsx     # Core chat UI (shared by widget + page)
src/components/chat/ChatWidget.tsx    # Floating bubble + expandable container
src/components/chat/ChatMessage.tsx   # Single message renderer (parses actions)
src/components/chat/ChatInput.tsx     # Input bar + send button
src/components/chat/ActionButton.tsx  # Rendered inline action buttons
src/components/chat/TypingIndicator.tsx # Persona-aware typing animation

src/lib/chat/system-prompt.ts        # Builds layered system prompt per request
src/lib/chat/community-context.ts    # Aggregates src/data/* into context string
src/lib/chat/action-parser.ts        # Parses [action:type](label|url) from responses
```

### Modified Files

```
src/app/layout.tsx                    # Add ChatWidget to root layout
```

### New Dependencies

```bash
npm install ai @ai-sdk/anthropic
```

### New Environment Variable

```
ANTHROPIC_API_KEY=<key>
```

### Implementation Order

Follow this exact order. **Verify after each step** with `npx tsc --noEmit`.

#### Step 1: Dependencies & Environment
1. Install `ai` and `@ai-sdk/anthropic`
2. Add `ANTHROPIC_API_KEY` to `.env.local`
3. Verify imports resolve: `npx tsc --noEmit`

#### Step 2: Library Layer (`src/lib/chat/`)
Build the backend utilities first:

1. **`community-context.ts`** — Import all data from `src/data/*` and format into a single context string. Include key facts (first meetup Jan 24 2026, cities Nairobi + Mombasa, Discord link, WhatsApp link, Luma links). Keep it concise — Haiku has limited context.

2. **`system-prompt.ts`** — Build the layered system prompt:
   - Layer 1: Identity + personality based on persona param ("dev" | "pro")
   - Layer 2: Community knowledge from `community-context.ts`
   - Layer 3: Action capability instructions — tell Claude it can use `[action:type](label|url)` format
   - Layer 4: Guardrails (no fake URLs, no personal info, admit uncertainty)

3. **`action-parser.ts`** — Parse `[action:type](label|url)` patterns from response text. Return an array of `{ type, label, url }` objects and the remaining text with actions stripped out. Handle edge cases: malformed actions, actions mid-sentence.

4. Verify: `npx tsc --noEmit`

#### Step 3: API Route (`src/app/api/chat/route.ts`)
1. POST handler accepting `{ messages, persona }`
2. Rate limit using Upstash Redis — 30 messages/hour per IP. Follow the existing pattern in `src/lib/rate-limit.ts`.
3. Validate message array length <= 20. Return 400 if exceeded.
4. Build system prompt using `system-prompt.ts` with the persona param
5. Call Claude Haiku via AI SDK `streamText()` with `@ai-sdk/anthropic` provider
6. Return the streaming response
7. Verify: `npx tsc --noEmit`

#### Step 4: Chat Components (`src/components/chat/`)
Build UI components. **Read existing persona components first** to match patterns.

1. **`ActionButton.tsx`** — Renders a single action button. Persona-aware:
   - Dev: ASCII-bordered `[ Label ]`, green/amber colors, monospace
   - Pro: Pill button with gradient, Anthropic palette
   - Links open in new tab for external URLs, client-side navigation for internal

2. **`ChatMessage.tsx`** — Renders a single message (user or assistant):
   - Parses actions from assistant messages using `action-parser.ts`
   - Renders text + inline ActionButtons
   - Persona-aware styling (see design spec Section 5 for the full styling table)
   - Framer Motion fade-in animation

3. **`TypingIndicator.tsx`** — Shown during streaming:
   - Dev: Blinking block cursor `█`
   - Pro: Pulsing dots animation

4. **`ChatInput.tsx`** — Text input + send button:
   - Dev: Terminal prompt style with `>_` prefix
   - Pro: Rounded input with soft shadow
   - Disabled during streaming
   - Enter to send, Shift+Enter for newline
   - Accessible: proper labels, focus management

5. **`ChatPanel.tsx`** — Core chat interface:
   - Uses `useChat()` hook from AI SDK pointing to `/api/chat`
   - Passes `persona` in request body
   - localStorage persistence for messages (save on each new message, load on mount)
   - Auto-scroll to bottom on new messages
   - Message list renders `ChatMessage` components
   - Shows `TypingIndicator` while `isLoading`
   - Reset button appears after 20 messages (also available in header)
   - Small persona badge showing current mode
   - Quick-start suggestion chips when conversation is empty

6. **`ChatWidget.tsx`** — Floating widget wrapper:
   - Bottom-right positioned bubble icon
   - Dev: Green pulse animation
   - Pro: Glass orb with subtle glow
   - Click expands to ~400x500px panel containing `ChatPanel`
   - Open/closed state persisted in localStorage
   - Mobile responsive: near-fullscreen when expanded
   - Framer Motion expand/collapse animation
   - Close button in header

7. Verify: `npx tsc --noEmit`

#### Step 5: Pages
1. **`src/app/chat/page.tsx`** — Dedicated chat page:
   - `"use client"` (needs hooks)
   - Full-page layout, centered ~720px max-width
   - Uses `ChatPanel` in a taller container
   - Quick-start suggestions in a header/sidebar area
   - Persona-aware page background
   - SEO metadata: title "Chat — Claude Community Kenya"

2. **Modify `src/app/layout.tsx`** — Add `<ChatWidget />` to the root layout so it appears on every page. Import conditionally or use dynamic import to avoid SSR issues.

3. Verify: `npx tsc --noEmit`

#### Step 6: Final Verification
1. Run `npx tsc --noEmit` — must pass clean
2. Run `npm run build` — must pass clean
3. Test locally with `npm run dev`:
   - Floating widget appears on homepage
   - Widget expands/collapses
   - Can send a message and get a streaming response
   - Action buttons render and link correctly
   - Persona toggle switches chat style AND tone
   - `/chat` page works with full-page layout
   - Rate limiting works (check after rapid messages)
   - 20-message limit triggers reset suggestion
   - localStorage persists across page navigations

### Conventions (MUST follow)

- `"use client"` only when needed (state, effects, event handlers)
- Import paths use `@/` alias
- All CSS via Tailwind utilities + CSS variables — no inline styles
- Match existing component patterns in `src/components/sections/` and `src/components/persona/`
- Accessibility: ARIA labels, keyboard nav, semantic HTML, `prefers-reduced-motion`
- TypeScript strict mode — no `any` types
- Use Framer Motion for animations (already in the project)
- Follow existing rate-limit patterns from `src/lib/rate-limit.ts`

### Guardrails (MUST NOT do)

- Do NOT fabricate URLs — only use real links from `src/data/*` and `CLAUDE.md`
- Do NOT add database tables or Prisma changes
- Do NOT add authentication requirements to the chat
- Do NOT install packages beyond `ai` and `@ai-sdk/anthropic`
- Do NOT use inline styles — Tailwind only
- Do NOT skip verification steps — run `npx tsc --noEmit` after each step
- Do NOT mock any implementation — everything must be production-ready
- Do NOT over-engineer — YAGNI. Build exactly what the spec describes.

### Action Button Reference

The chatbot should know these real URLs for action buttons:

```
Join Community:     /join
Speaker Application: /speak
Volunteer:          /volunteer
Submit Idea:        /submit-idea
Submit Project:     /submit-project
Events:             /events
Resources:          /resources
FAQ:                /faq
Ambassador Program: /ambassador
Discord:            https://discord.gg/CkD9QWjsHm
WhatsApp:           https://chat.whatsapp.com/Hpx42q1ADsrFNN3hHtZcQa
Nairobi Events:     https://luma.com/sbsa789m
Mombasa Events:     https://luma.com/vsf5re14
```

### Commit Strategy

After each step passes verification, commit:
```
feat(chat): add community context and system prompt builder
feat(chat): add streaming API route with rate limiting
feat(chat): add persona-aware chat components
feat(chat): add floating widget and dedicated chat page
feat(chat): integrate ChatWidget into root layout
```
