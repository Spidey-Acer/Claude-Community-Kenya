# Karibu — CCK Onboarding & Personalization

**Status:** Spec · **Author:** Peter Kibet (with Claude) · **Date:** 2026-05-10
**Type:** Design specification for a multi-audience onboarding & personalization system on claudekenya.org

---

## 1. Problem & Goals

### Problem
The current claudekenya.org experience is overwhelmingly developer-coded. The first-visit gate is a `Dev / Pro` persona splash that conflates two unrelated dimensions — *who you are* and *how you like things to look* — and assumes you fit one of two technical archetypes. Real CCK visitors include non-technical professionals, students, founders, and creators who don't see themselves in either door.

### Goals (in priority order)
1. **Welcome every visitor** with a "this place is for me" moment, regardless of technical background.
2. **Personalize content** so each audience sees the events, resources, and community channels most relevant to them.
3. **Funnel into the community** with audience-specific Discord/WhatsApp deep links and CTAs.
4. **Preserve discoverability** — never hide content behind a persona; only adjust emphasis.
5. **Stay shippable** — reuse existing chat infrastructure, ship in 3 weeks via phased rollout.

### Non-goals
Full Swahili conversation, voice input, fingerprint-based identity, runtime LLM recommendations, A/B testing infra, AI-generated email follow-ups. All deferred to v2.

---

## 2. Audiences (5)

| Code | Audience | Examples |
|---|---|---|
| `dev` | Developer | Engineers writing code with Claude Code, the API, MCP servers |
| `non_tech_pro` | Non-technical professional | Marketers, lawyers, consultants, ops folks using Claude.ai for work |
| `student` | Student / learner | University students, bootcamp grads, self-taught learners |
| `founder` | Founder / business owner | Building companies, AI strategy, partnerships |
| `creator` | Creator / educator / curious | Writers, journalists, teachers, trainers, general public |

---

## 3. Architecture: The Hybrid Model

Two **orthogonal** layers replace the current conflated `persona`.

| Layer | Controls | Values | Set by |
|---|---|---|---|
| **Audience** | Content surfaced (hero, recommendations, CTAs) | `dev` \| `non_tech_pro` \| `student` \| `founder` \| `creator` | Karibu conversation |
| **Skin** | Visual aesthetic (terminal vs polished) | `dev` \| `pro` | User-toggled, independent of audience |

A founder may browse in terminal skin; a developer may browse in polished skin. Two independent dimensions — no more conflation.

### Component map

| Need | Existing piece | Action |
|---|---|---|
| Chat UI | `src/components/chat/{ChatPanel,ChatMessage,ChatInput,TypingIndicator}.tsx` | **REUSE** — wrap in full-screen modal layout |
| Streaming Claude API | `src/app/api/chat/route.ts` (Haiku 4.5, ai-sdk v6) | **CLONE** → `src/app/api/karibu/route.ts` |
| System prompt builder | `src/lib/chat/system-prompt.ts` | **EXTEND** → add `buildKaribuPrompt()` |
| Rate limit | `src/lib/rate-limit.ts` (Upstash) | **REUSE** — new key `karibu`, 5/hr/IP |
| Persona context | `src/contexts/PersonaContext.tsx` | **SPLIT** → `SkinContext` (rename) + new `AudienceContext` |
| First-visit gate | `src/components/persona/PersonaSelectorModal.tsx` | **NARROW** — becomes optional Skin/Vibe toggle |
| First-visit gate (new role) | — | **NEW** — `src/components/karibu/KaribuModal.tsx` |
| DB persistence | None | **NEW** — `OnboardingSession` Prisma model |
| Personalized hero | None | **NEW** — `PersonalizedHero` with 5 variants |
| Recommendation engine | None | **NEW** — `src/lib/recommendations.ts` (pure function) |

**Net new:** ~6 files. **Modified:** 2-3 files. **Zero breaking changes** to the existing `/api/chat` widget.

---

## 4. The Karibu Conversation

### Format
AI-guided conversation powered by **Claude Haiku 4.5** via `@ai-sdk/anthropic`. Streaming response, free-text input + chip suggestions. **Cap: 4 Claude turns (8 messages total — 4 user + 4 Claude).**

### Turn-by-turn flow

| Turn | Speaker | Purpose | Captures |
|---|---|---|---|
| 1 | Claude | "Karibu! 👋 What brings you here today?" + 5 audience chips + free-text input | `audience` |
| 2 | Claude | Warm acknowledgement (uses user's words) + intent question + contextual chips | `intent` |
| 3 | Claude | Lightning experience question + 4 chips | `experience` |
| 4 | Claude | Personalized landing: 3 real DB-sourced recommendations + Discord CTA + "go to homepage" | (writes session) |

Optional: Claude may ask for `name`, `city`, `language` if the conversation flows there naturally — never as a forced step.

### Tool calling
Claude streams natural conversational text AND silently calls a `record_visitor` tool with structured arguments:

```ts
{
  audience: "dev" | "non_tech_pro" | "student" | "founder" | "creator",
  intent?: "learn_basics" | "find_event" | "find_collaborators" | "build" | "hire_or_partner" | "other",
  experience?: "never_used" | "claude_ai" | "claude_code" | "api_builder",
  name?: string,
  city?: string,
  language?: "en" | "sw"
}
```

The conversation feels human; the backend gets clean, validated, enum-constrained data.

### Key behavioral rules

- **Skip is sacred.** "Skip and explore →" link top-right at every turn. ESC key dismisses. Defaults `audience=dev` (current behavior preserved).
- **Off-topic redirect.** If user asks general questions ("how do I use Claude Code?"), Claude says: "Happy to dig in once you're inside — let's finish setup first?" then offers continuation via the existing ChatWidget post-onboarding.
- **Recommendations are real.** DB-sourced (events, blog posts, community channels) injected into context — Claude cannot hallucinate.
- **8-message hard cap.** 4 user messages + 4 Claude responses max. After cap, conversation lands gracefully with whatever was extracted.

---

## 5. Data Model

### Prisma schema (new)

```prisma
model OnboardingSession {
  id           String      @id @default(cuid())

  userId       String?
  user         User?       @relation(fields: [userId], references: [id], onDelete: Cascade)
  cookieId     String?     @unique

  audience     Audience?    // null when user skipped
  intent       Intent?
  experience   Experience?

  name         String?
  city         String?
  language     String?

  conversation Json?       // full transcript, purged after 30 days
  skipped      Boolean     @default(false)
  completedAt  DateTime?

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([cookieId])
  @@index([userId])
  @@index([audience])
}

enum Audience    { dev  non_tech_pro  student  founder  creator }
enum Intent      { learn_basics  find_event  find_collaborators  build  hire_or_partner  other }
enum Experience  { never_used  claude_ai  claude_code  api_builder }
```

`User` model gains: `onboardingSessions OnboardingSession[]`.

### Storage strategy

| Layer | Key | Lifetime | Purpose |
|---|---|---|---|
| Cookie | `cck-visitor` (UUID) | 1 year | Anonymous identity across visits |
| Cookie | `cck-audience` | 1 year | Values: one of 5 audience codes, or `skipped`. Missing = mount Karibu modal. SSR-readable so hero renders without flicker. |
| DB | `OnboardingSession` row | 1 year (anon) / until account deletion | Source of truth |
| localStorage | `cck-skin` (`dev` \| `pro`) | Forever | Client-only CSS class toggle |
| sessionStorage | `cck-karibu-progress` | Tab lifetime | Survives mid-conversation refresh |

Cookies are `HttpOnly`-where-possible, `SameSite=Lax`, `Secure` in production.

### Key flows

1. **First visit (anonymous)** — middleware sets `cck-visitor` UUID; root layout mounts `<KaribuModal />` because `cck-audience` is missing. User converses; tool call writes `OnboardingSession`; response sets `cck-audience` cookie. Modal exits, page re-renders personalized.
2. **Skip path** — `POST /api/karibu/skip` writes `OnboardingSession{ skipped: true, audience: null }`, sets `cck-audience=skipped` cookie, dismisses modal. Page renders the **generic homepage** (no audience-specific personalization, identical to today's site).
3. **Returning anonymous** — both cookies present, modal does not mount, page renders personalized.
4. **Anon → signs up** — NextAuth callback finds `OnboardingSession` by `cookieId` and links via `userId`. No data loss.
5. **Re-onboarding** — footer "Personalize" link → `POST /api/karibu/reset` archives old session, clears `cck-audience` cookie. Next page load mounts modal again.

### Privacy & retention

- `conversation` field purged daily by cron after 30 days. Audience/intent/experience persist.
- Optional fields (`name`, `city`, `language`) saved only when user volunteers them.
- System prompt instructs Claude not to ask for or store sensitive content (health, religion, politics).
- Self-erase via `/account/data` → "Reset onboarding" deletes session + clears cookies.

---

## 6. Visual & Interaction Design

### Karibu's identity
**Neutral hybrid** — not Dev, not Pro. Dark BG (`#0a0a0a`), green Claude bubbles (`#00ff41`), amber user bubbles (`#ffb000`), `IBM Plex Sans` body, monospace for system text. Designed to work as the gateway *before* either skin is chosen.

### Layout

- **Desktop**: Full-screen overlay, modal centered, max-width `680px`. Background page renders fully underneath, blurred + dimmed. Border-radius `16px`, soft green glow shadow.
- **Mobile**: Bottom sheet at `90vh`. Drag handle visible. Single column, chips stacked vertically.

### Entry choreography (1.5s)

| t | Event |
|---|---|
| 0.0s | Page renders fully (SSR'd) |
| 0.8s | Background dims + soft blur (250ms) |
| 1.0s | Radial green glow pulses from center (300ms) |
| 1.1s | Modal fades up + scales 0.96 → 1 (300ms ease-out) |
| 1.4s | Claude's first message streams in, char by char |
| ~3s | Chips fade in; focus moves to skip link / first chip |

**`prefers-reduced-motion`**: skip choreography entirely, modal appears instantly with full message rendered.

### Accessibility (non-negotiable)

- **Keyboard**: `Tab` cycles chips → input; `Esc` = skip; `Enter` sends free text; focus trap until skip/complete; skip link is first focusable element.
- **Screen readers**: `role="dialog" aria-modal="true"`; streaming text in `aria-live="polite"`; each chip is a `<button>` with explicit label.
- **Motion**: `prefers-reduced-motion` disables all animation including cursor blink and char-by-char streaming.
- **Contrast**: All text ≥ WCAG AA (4.5:1); chip focus ring 2px green with 3px offset; errors via `aria-live="assertive"`.

---

## 7. Personalization Payoff

### 5 surfaces that personalize · everything else stays universal

| Surface | What changes | Source |
|---|---|---|
| Homepage hero | Headline, sub-headline, accent color, primary CTA | `audience` |
| "Made for you" block | Top 3 events/resources/channels, ranked | All signals |
| Discord/WhatsApp deep links | Specific channel invite vs generic | `audience` |
| `/join` form pre-fill | Audience field pre-selected, experience defaulted | `audience`, `experience` |
| Welcome email | Subject + opening line | `name`, `audience` |

### Hero variants (5)

| Audience | Headline | Sub-headline | Primary CTA |
|---|---|---|---|
| `dev` | Africa's only Claude developer community | Build, ship, and learn with Kenya's strongest AI engineers | Join Discord (#devs) |
| `non_tech_pro` | AI for the work you actually do | Learn Claude with marketers, lawyers, and ops folks like you | Browse non-tech meetups |
| `student` | Start your AI journey with us | Free meetups, study groups, mentorship — built for Kenyan students | Join WhatsApp |
| `founder` | Build your AI company in Nairobi | Connect with founders, investors, and builders shipping with Claude | Founder events |
| `creator` | Tell better stories with Claude | Writers, journalists, teachers using AI to amplify their work | Creator track |

### Confirmation banner

Shown ONCE immediately after Karibu completes. Auto-dismisses in 8s or on click. Never shown again.
> ✓ Personalized for **marketing professionals**. Not right? *Change*

### Recommendation engine (`src/lib/recommendations.ts`)

Pure function, no external deps, no ML, no runtime LLM. Each event/resource carries `audiences: Audience[]` and optional `intents: Intent[]` tags (set manually via admin).

```
score =
  (audience match)         * 5 +
  (intent match)           * 3 +
  (city match)             * 2 +
  (experience appropriate) * 2 +
  (recency, weeks until)   * (1 / weeks_away) +
  (featured flag)          * 1
```

Top 3 by score. Cached per-audience for 5 minutes. Falls back to "featured" tag when nothing matches.

### Anti-patterns explicitly avoided

- **Navigation** — never hide nav items by audience. Discoverability > personalization.
- **Search results** — show all matches, no audience filter.
- **Detail pages** (event, blog, project) — same content for everyone; only the recommendation block on top adapts.
- **Sign-up forms** — never block based on audience.
- **Pricing/access gating** — N/A here, but principle: never gate by audience.

---

## 8. Failure Modes & Defenses

### Fallback ladder

| Level | State | When |
|---|---|---|
| L1 ✓ | Full Karibu — streaming Claude, tool calling, real recommendations | Happy path (~95%) |
| L2 ⚠ | Skeleton loader during slow API; 5s timeout per chunk → escalate | Network glitch |
| L3 ⚠ | Scripted 3-step chip wizard, no API calls, faked tool call client-side | API timeout, rate limit, daily budget exhausted |
| L4 ✗ | Static welcome + Skip button, no data captured | JS disabled, all chip wizards fail |
| L5 ✗ | No modal, no personalization — renders the generic homepage exactly as today | Server-side feature flag killed |

**Invariant:** at every level, the user reaches the homepage in <1 click. Karibu is never a wall.

### Threat defenses

| Threat | Defense |
|---|---|
| Prompt injection | Hardened system prompt with XML-delimited user input; tool call schema is enum-constrained; 300 char/msg cap; output filter strips URLs/commands from user-quoted text. |
| Cost runaway | Per-conversation: 1500 max output tokens, 8-message cap, 1 tool call max. Per-IP: 5 conversations/hour. Per-day: $50 spend cap with auto-fallback to L3. |
| Bot abuse | Upstash rate limit. Honeypot hidden field on skip endpoint. CSRF origin check (existing pattern from `/api/chat`). |
| PII leakage | System prompt forbids asking for or storing sensitive info. Conversation transcripts purged after 30 days. Optional fields only saved on user-volunteered consent. |
| Audience-shopping | Same IP starting 3+ onboardings/hour with different audiences → audit log flag (logged, not blocked). |

### Monitoring

- Structured logs from `/api/karibu`: conversation_id, latency_ms, total_tokens, audience_extracted, success_flag, fallback_level (L1-L5).
- Admin dashboard widget: today's onboardings, completion %, audience breakdown, avg latency, monthly cost.
- AuditLog entry per completed onboarding (reuses existing model).
- Sentry for errors with fallback-level + message-# context.
- Anthropic console budget alert: $40/day warning, $50/day cap (separate API key from `/api/chat`).

---

## 9. Rollout Plan (3 weeks)

| Week | Phase | Audience | Gate |
|---|---|---|---|
| 0 | Internal flag-gated | Team only via `?karibu=1` | All 5 audience flows complete clean |
| 1 | 10% canary | Hash-mod cookie ID | Completion ≥60%, p95 <3s, errors <1% |
| 2 | 50% A/B vs current `PersonaSelectorModal` | Random split | Karibu beats control on Discord join by ≥15% |
| 3 | 100% rollout | All new visitors | (kill switch: `KARIBU_ENABLED=false` reverts instantly) |

After week 3, the old `PersonaSelectorModal` is demoted to a navbar "Skin/Vibe" toggle.

---

## 10. Out of Scope (v1)

Deferred to v2 or later — explicitly NOT in this implementation:

- Full Swahili conversation mode ("Karibu" greeting is the only Swahili in v1)
- Voice input
- Persistent identity across cookie clearing (fingerprinting — privacy-sensitive)
- AI-generated personalized email follow-ups
- A/B testing different system prompts (Statsig/PostHog later)
- Runtime LLM-powered recommendations (v1 uses pure-function ranking)
- Auto-prompt for re-onboarding on life changes (manual footer link is enough)
- Vercel BotID integration (add post-launch only if abuse appears)
- Multi-tenant Karibu (e.g., other CCK chapters) — single-tenant v1

---

## 11. Open Questions for Implementation Plan

1. Do we need a database migration strategy for the existing `cck-persona` localStorage value? (proposal: read it on first load, set as `cck-skin`, leave `cck-audience` empty so user gets Karibu)
2. Where exactly does the "Personalize" footer link live — global footer component or only on homepage?
3. Should the welcome email pipeline (Resend) be in v1 or v2? (proposal: v1 for completed onboardings only; skipped sessions don't get email)
4. Is the `OnboardingSession.conversation` field worth storing at all if we're going to purge it? (proposal: keep for first 30 days as a debugging/improvement signal during weeks 1-3 rollout)

These get resolved in the implementation plan, not here.
