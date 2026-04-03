# Claude Community Kenya — Chatbot Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Approach:** Vercel AI SDK + Claude Haiku + Custom Persona-Aware UI

---

## 1. Purpose

Hybrid chatbot for claudekenya.org — community-first assistant that answers questions about Claude Community Kenya (events, membership, resources, FAQs) using existing site data, with Claude Haiku as a general fallback for off-topic questions.

## 2. Requirements

| Requirement | Decision |
|---|---|
| Access | Everyone, no login required |
| Location | Floating widget (every page) + dedicated `/chat` page |
| Persona | Full integration — style AND personality shift per Dev/Pro mode |
| Persistence | localStorage only, no database |
| Model | Claude Haiku (server-side proxy) |
| Rate limit | 30 messages/hour per IP (Upstash Redis) |
| Capabilities | Action buttons + conversational form assistance |
| Streaming | Yes, token-by-token via AI SDK |
| Conversation limit | 20 messages, then suggest reset |

## 3. Architecture

```
User (Browser)
  ├── ChatWidget (floating, every page)
  │     └── ChatPanel component (shared)
  ├── /chat page (dedicated, full-page)
  │     └── ChatPanel component (shared)
  └── ChatPanel
        ├── useChat() hook (AI SDK)
        ├── localStorage (message persistence)
        └── POST /api/chat
              ├── Rate limiter (Upstash Redis, 30/hr per IP)
              ├── System prompt builder
              │     ├── Persona context (dev vs pro tone)
              │     ├── Community data (FAQs, events, resources, etc.)
              │     └── Action/form capability instructions
              ├── Claude Haiku (streaming response)
              └── SSE stream back to client
```

## 4. System Prompt Strategy

### Layer 1 — Identity & Personality

**Dev Mode:** Casual, hacker tone. Terminal metaphors. Short, punchy answers. Monospace feel.

**Pro Mode:** Polished, professional. Warm but structured. Clean formatting.

**Shared:** Helpful, accurate, Kenya-community-focused. Never fabricates URLs or stats.

### Layer 2 — Community Knowledge

Injected from `src/data/`:

| Source | Content |
|---|---|
| `faq.ts` | 19 FAQs (general/events/technical) |
| `events.ts` | Events, locations, Luma links |
| `resources.ts` | Anthropic docs, tutorials, courses, tools |
| `blog-posts.ts` | Blog summaries |
| `team.ts` | Public team member info |
| `projects.ts` | Community projects |
| CLAUDE.md key facts | First meetup date, cities, Discord/WhatsApp links |

### Layer 3 — Capabilities

- **Action buttons:** Suggest clickable actions (join, register, Discord, etc.)
- **Form assistance:** Guide users conversationally through applications (join, speak, volunteer, demo), then link to the actual form page. No pre-filling.

### Layer 4 — Guardrails

- Only use real URLs from the data — never fabricate
- No personal info beyond what's publicly listed
- Admit uncertainty rather than guess on community specifics
- Off-topic is fine, but gently steer back to community context

## 5. Components

### File Structure

```
src/
├── app/
│   ├── api/chat/route.ts             # POST — rate limit, build prompt, stream
│   ├── chat/page.tsx                 # Dedicated full-page chat
├── components/chat/
│   ├── ChatPanel.tsx                 # Core chat UI (shared)
│   ├── ChatWidget.tsx                # Floating bubble + expandable container
│   ├── ChatMessage.tsx               # Message renderer (parses actions)
│   ├── ChatInput.tsx                 # Input bar + send button
│   ├── ActionButton.tsx              # Rendered action buttons
│   └── TypingIndicator.tsx           # Persona-aware typing animation
├── lib/chat/
│   ├── system-prompt.ts              # Builds layered system prompt
│   ├── community-context.ts          # Aggregates src/data/* into context
│   └── action-parser.ts              # Parses [action:type](label|url)
├── layout.tsx                        # MODIFIED — add ChatWidget
```

### Shared ChatPanel

- Message list with auto-scroll
- Input bar, disabled during streaming
- Inline action buttons from parsed response
- Typing indicator during streaming
- Reset button after 20 messages
- Persona badge (Dev/Pro indicator)

### ChatWidget (Floating)

- Bottom-right bubble (green pulse in Dev, glass orb in Pro)
- Expands to ~400x500px panel
- Open/closed state in localStorage
- Mobile: near-fullscreen expansion

### /chat Page

- Full-page layout, ~720px max-width centered
- Same ChatPanel, taller container
- Quick-start suggestions: "What events are coming up?", "How do I join?", "Show me resources"

### Persona Styling

| Element | Dev Mode | Pro Mode |
|---|---|---|
| Container | Dark terminal bg, green border, scanline | Glassmorphism, blur, Anthropic palette |
| User messages | Green text on dark | White on gradient accent |
| Bot messages | Amber/green monospace | Sans-serif on frosted glass |
| Input | Terminal prompt `>_` | Rounded, soft shadow |
| Action buttons | ASCII `[ Join Discord ]` | Pill buttons with gradient |
| Typing indicator | Blinking cursor `█` | Pulsing dots |

## 6. API Design

### POST /api/chat

**Request:**
```typescript
{
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  persona: "dev" | "pro";
}
```

**Flow:**
1. Extract IP → Upstash rate limit check (30/hr)
2. Validate message count (reject if > 20)
3. Build system prompt (persona + community data + capabilities)
4. Call Claude Haiku via AI SDK `streamText()`
5. Return streaming response

**Action format in responses:**
```
[action:join_community](Join the Community|/join)
[action:discord](Join Discord|https://discord.gg/CkD9QWjsHm)
[action:event](Register for Next Event|https://luma.com/sbsa789m)
```

Client-side parser converts to styled buttons inline.

**Error handling:**
- Rate limited → friendly message with retry hint
- API failure → generic error message
- Client disconnect → clean streaming abort

## 7. Dependencies

**New packages:**
- `ai` (Vercel AI SDK)
- `@ai-sdk/anthropic` (Claude provider)

**New env vars:**
- `ANTHROPIC_API_KEY`

**No database changes. No Prisma migrations.**

## 8. Out of Scope

- User authentication for chat
- Database-backed conversation history
- Admin panel for chat management
- Analytics/conversation logging
- Multi-language support (future consideration)
- Form pre-filling (just links to forms)
