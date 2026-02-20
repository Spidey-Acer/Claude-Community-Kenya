# CCK Discord Bot — Comprehensive Build Prompt

## Project Overview
- **Project:** Claude Community Kenya (CCK) Discord Bot
- **Stack:** Node.js + TypeScript + Discord.js + Claude API (`@anthropic-ai/sdk`)
- **Model:** `claude-opus-4-6` (default), `claude-haiku-4-5` (for lightweight lookups)
- **Purpose:** AI-powered community bot for the CCK Discord server — handles FAQs, event info, resource lookups, member onboarding, and community engagement
- **Discord Server:** https://discord.gg/MdEhxH88

## Mission
Build a production-ready Discord bot that serves as the AI backbone of Claude Community Kenya's Discord server. The bot should feel like a knowledgeable community member — helpful, fast, on-brand (terminal/hacker aesthetic), and deeply integrated with CCK's data. It's powered by Claude, built for a Claude community, and should showcase what's possible with the Claude API.

---

## Architecture

### Core Design Principles
1. **Claude-powered intelligence** — Use Claude API for natural language understanding, not just keyword matching
2. **Data-driven** — All community data (FAQs, events, resources, team) lives in structured TypeScript files, same format as the website
3. **Slash commands + natural chat** — Structured commands for common actions, plus conversational AI for open-ended questions
4. **Cost-conscious** — Use `claude-haiku-4-5` for simple lookups/FAQ matching, `claude-opus-4-6` for complex conversations and code help
5. **Rate-limited** — Prevent abuse with per-user and per-channel cooldowns
6. **Modular** — Each feature is a separate module/command handler

### Project Structure
```
cck-discord-bot/
├── src/
│   ├── index.ts                 # Bot entry point, client setup, event registration
│   ├── config.ts                # Environment variables, constants, bot settings
│   ├── deploy-commands.ts       # Script to register slash commands with Discord
│   │
│   ├── commands/                # Slash command handlers
│   │   ├── ask.ts               # /ask — AI-powered Q&A (Claude conversational)
│   │   ├── faq.ts               # /faq — Browse/search community FAQs
│   │   ├── events.ts            # /events — List upcoming/past events
│   │   ├── resources.ts         # /resources — Search curated resource library
│   │   ├── about.ts             # /about — Community info, team, mission
│   │   ├── help.ts              # /help — Bot usage guide
│   │   ├── links.ts             # /links — Quick access to key URLs
│   │   └── claude.ts            # /claude — Claude tips, model info, getting started
│   │
│   ├── events/                  # Discord event handlers
│   │   ├── ready.ts             # Bot startup, status setting
│   │   ├── interactionCreate.ts # Slash command router
│   │   ├── messageCreate.ts     # Natural language message handler (mentions/DMs)
│   │   ├── guildMemberAdd.ts    # Welcome new members
│   │   └── messageReactionAdd.ts # Reaction-based role assignment (optional)
│   │
│   ├── services/                # Business logic
│   │   ├── claude.ts            # Claude API client wrapper (model selection, system prompts)
│   │   ├── faq-matcher.ts       # FAQ search/matching logic
│   │   ├── event-tracker.ts     # Event date tracking, reminders
│   │   └── rate-limiter.ts      # Per-user/channel rate limiting
│   │
│   ├── data/                    # Community data (mirrors website data)
│   │   ├── faqs.ts              # 13 FAQs across general/events/technical
│   │   ├── events.ts            # Community events with dates, venues, agendas
│   │   ├── resources.ts         # 28+ curated resources across 7 categories
│   │   ├── team.ts              # Core team members
│   │   └── constants.ts         # URLs, social links, site config
│   │
│   ├── utils/                   # Shared utilities
│   │   ├── embeds.ts            # Discord embed builders (terminal-themed)
│   │   ├── format.ts            # Date formatting, text truncation
│   │   └── logger.ts            # Structured logging
│   │
│   └── types/                   # TypeScript interfaces
│       └── index.ts             # Shared types
│
├── .env.example                 # Environment variable template
├── package.json
├── tsconfig.json
└── README.md                    # Setup & deployment guide
```

---

## Features — Detailed Specifications

### 1. `/ask` — AI-Powered Q&A (Core Feature)

The flagship command. Users ask anything about Claude, Anthropic, the community, coding with AI, or general tech questions. Claude answers with full context about CCK.

**Command:**
```
/ask question:<string>
```

**Behavior:**
- Takes the user's question and sends it to Claude API with a rich system prompt containing CCK context
- Use `claude-opus-4-6` with `thinking: { type: "adaptive" }` for complex questions
- Use `claude-haiku-4-5` for simple factual lookups (detect complexity via question length/keywords)
- System prompt includes: community info, upcoming events, key links, team info
- Response formatted as a Discord embed with terminal styling
- If the question matches a known FAQ closely, append "💡 Related FAQ" with the matching FAQ
- Maximum response length: 2000 characters (Discord limit) — truncate gracefully with "..." and suggest `/faq` or website
- Rate limit: 5 requests per user per minute

**System Prompt Template:**
```
You are CCK Bot, the AI assistant for Claude Community Kenya — East Africa's first Claude developer community.

Community Context:
- Website: https://claudecommunitykenya.com
- Discord: https://discord.gg/MdEhxH88
- Cities: Nairobi and Mombasa
- Founded: January 2026
- Members: 50+
- Contact: claudecommunitykenya@gmail.com

Upcoming Events:
{dynamically inject from events data}

Core Team:
- Peter Kibet — Community Lead & Founder
- Edwin Lungatso — Community Co-Lead
- Dr. Fullgence Mwakondo — Academic Advisor, Technical University of Mombasa
- Joshua Wekesa — Community Organizer, Mombasa Chapter

Key Links:
- Claude.ai: https://claude.ai
- Claude Code Docs: https://docs.anthropic.com/en/docs/claude-code
- Anthropic API Docs: https://docs.anthropic.com
- Nairobi Events (Luma): https://luma.com/sbsa789m
- Mombasa Events (Luma): https://luma.com/vsf5re14

Personality:
- Helpful, knowledgeable, enthusiastic about AI and the Kenyan tech scene
- Use a slightly techy/terminal tone — you represent a developer community
- Keep answers concise but complete
- Always encourage people to join events and the Discord community
- When discussing Claude products, be accurate — refer to official docs
- If you don't know something, say so honestly and point to relevant resources
```

**Claude API Integration:**
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

// For complex questions
const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  thinking: { type: "adaptive" },
  system: CCK_SYSTEM_PROMPT,
  messages: [{ role: "user", content: question }],
});

// For simple lookups — cheaper and faster
const response = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 512,
  system: CCK_SYSTEM_PROMPT,
  messages: [{ role: "user", content: question }],
});
```

---

### 2. `/faq` — Community FAQ Browser

Browse and search the 13 community FAQs.

**Commands:**
```
/faq list [category:general|events|technical]  — List FAQs by category
/faq search query:<string>                      — Fuzzy search FAQs
```

**Behavior:**
- `/faq list` with no category shows all 13 FAQs grouped by category
- `/faq list category:technical` shows only technical FAQs
- `/faq search` uses Claude Haiku to find the best-matching FAQ(s)
- Display as Discord embeds with green accent color (#00ff41)
- Each FAQ shows question as embed title, answer as description
- Add reaction buttons (◀️ ▶️) for pagination if multiple results

**FAQ Data (from website):**
```typescript
// 13 FAQs across 3 categories:
// General (6): What is CCK, who can join, is it free, cities, Anthropic relation, getting started
// Events (4): frequency, registration, remote attendance, hosting/speaking
// Technical (3): What is Claude, what is Claude Code, Claude Code pricing
```

---

### 3. `/events` — Event Tracker

List and explore community events.

**Commands:**
```
/events upcoming    — Show upcoming/registration-open events
/events past        — Show past events with highlights
/events next        — Show the very next event with full details
```

**Behavior:**
- Upcoming events show: title, date, time, venue, city, registration link, status badge
- Past events show: title, date, attendee count, highlights
- `/events next` shows the soonest upcoming event with full agenda
- Color-code by status: 🟢 registration-open, 🟡 upcoming, ⚪ completed
- Include Luma registration links as clickable buttons
- Auto-detect if an event date has passed and mark accordingly

**Event Data (from website):**
```typescript
// 3 events:
// 1. "Kenya's First Claude Code Meetup" — Jan 24 2026, Nairobi (completed, 30 attendees)
// 2. "Nairobi Meetup #2 — Deep Dive" — Feb 20 2026, Nairobi (registration-open)
// 3. "Mombasa AI & Career Talk" — Feb 28 2026, Mombasa (registration-open)
```

---

### 4. `/resources` — Resource Library

Search the curated library of 28+ Anthropic/Claude/community resources.

**Commands:**
```
/resources list [category:<string>]    — List resources by category
/resources search query:<string>       — Search resources by keyword
```

**Categories:** Official Anthropic (9), Developer Tools (6), Learning & Tutorials (6), Community & Social (6), Courses & Learning Paths (5), Kenya Tech (1), AI Safety & Ethics (1)

**Behavior:**
- List view: grouped by category with title + URL + short description
- Search: fuzzy match on title + description
- Each resource is a clickable link
- Paginate with buttons if many results
- Highlight "Start Here" resources for beginners

---

### 5. `/about` — Community Info

Quick community overview.

**Command:**
```
/about [topic:community|team|mission|links]
```

**Behavior:**
- Default (no topic): Community overview embed — name, description, stats, founding date
- `team`: Grid of team members with roles and social links
- `mission`: Mission, vision, values
- `links`: All social/platform links (Discord, Twitter, LinkedIn, GitHub, Luma, Instagram, Facebook)

---

### 6. `/help` — Bot Guide

How to use the bot.

**Behavior:**
- Lists all available commands with brief descriptions
- Shows examples of how to use `/ask`
- Links to the CCK website for more info

---

### 7. `/links` — Quick Links

Instant access to key URLs without searching.

**Command:**
```
/links [type:discord|twitter|github|luma|website|docs|claude]
```

**Behavior:**
- No argument: show all key links in a compact embed
- With argument: show the specific link prominently

---

### 8. `/claude` — Claude Info & Tips

Quick reference for Claude products and getting started.

**Commands:**
```
/claude models      — Current Claude models and pricing
/claude code        — What is Claude Code + how to install
/claude start       — Step-by-step getting started guide
/claude tips        — Pro tips for using Claude effectively
```

---

### 9. Welcome System (Auto — `guildMemberAdd`)

When a new member joins the Discord:
- Send a welcome embed in the designated welcome channel
- Include: greeting, community description, key commands to try, links to upcoming events
- Mention the new member
- Terminal-themed welcome message:
  ```
  $ ssh new_member@cck-server
  Connection established.
  Welcome to Claude Community Kenya! 🇰🇪

  > Type /help to see what I can do
  > Type /events upcoming to see what's next
  > Type /ask to chat with me about anything Claude
  ```

---

### 10. Natural Language Handler (`messageCreate`)

When the bot is @mentioned or receives a DM:
- Treat the message as a `/ask` question
- Use the same Claude API integration
- Rate limit: 3 per user per minute in DMs, 5 per user per minute in channels
- Respond in the same channel/DM thread

---

### 11. Event Reminders (Scheduled)

Automated reminders for upcoming events:
- **7 days before:** Post reminder in announcements channel
- **1 day before:** Post "tomorrow!" reminder with full details
- **Day of:** Post "happening today!" with venue, time, registration link
- Use `node-cron` or `setInterval` with date checks
- Reminders include registration link buttons

---

## Discord Embed Design System

All bot responses should use a consistent "Terminal Noir" themed embed style:

```typescript
// Base embed template
const createCCKEmbed = (options: {
  title: string;
  description: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
}) => {
  return new EmbedBuilder()
    .setTitle(`> ${options.title}`)          // Terminal prompt prefix
    .setDescription(options.description)
    .setColor(options.color ?? 0x00ff41)     // Green primary
    .setFooter({
      text: options.footer ?? "CCK Bot • Claude Community Kenya",
    })
    .setTimestamp();
};

// Color palette for embeds
const COLORS = {
  GREEN: 0x00ff41,    // Primary — general responses
  AMBER: 0xffb000,    // Warnings, CTAs, events
  CYAN: 0x00d4ff,     // Info, resources, links
  RED: 0xff3333,       // Errors
  DIM: 0x0a3d1a,      // Subtle/secondary
};
```

---

## Environment Variables

```env
# Discord
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id          # For development (guild-specific commands)

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Bot Config
BOT_PREFIX=>                             # For legacy prefix commands (optional)
WELCOME_CHANNEL_ID=channel_id           # Where to send welcome messages
ANNOUNCEMENTS_CHANNEL_ID=channel_id     # Where to send event reminders
LOG_CHANNEL_ID=channel_id               # Bot logs (optional)

# Rate Limiting
RATE_LIMIT_ASK=5                         # /ask requests per user per minute
RATE_LIMIT_GENERAL=10                    # General commands per user per minute
```

---

## Implementation Requirements

### Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "discord.js": "^14",
    "dotenv": "^16",
    "node-cron": "^3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5",
    "tsx": "^4"
  }
}
```

### TypeScript Configuration
- Strict mode enabled
- ES2022 target
- Node16 module resolution
- Path aliases: `@/` maps to `./src/`

### Code Quality
- [ ] TypeScript strict mode — zero `any` types
- [ ] All API keys via environment variables — never hardcoded
- [ ] Proper error handling on every Claude API call and Discord interaction
- [ ] Graceful degradation — if Claude API is down, return cached/static responses for FAQs
- [ ] Rate limiting on all user-facing commands
- [ ] Input sanitization — never pass raw user input without validation
- [ ] Logging — structured logs for debugging (no sensitive data)

### Claude API Best Practices
- [ ] Use `claude-haiku-4-5` for simple, fast lookups (FAQ matching, resource search)
- [ ] Use `claude-opus-4-6` with adaptive thinking for complex/conversational queries
- [ ] Stream responses for long answers using `.stream()` method
- [ ] Handle all error types: 400, 401, 429 (rate limit), 500, 529 (overloaded)
- [ ] SDK auto-retries 429 and 5xx — configure `max_retries: 2`
- [ ] Set reasonable `max_tokens` — 512 for simple lookups, 1024 for conversations
- [ ] Include `system` prompt with CCK context on every `/ask` call
- [ ] Prompt caching: use `cache_control: { type: "ephemeral" }` on the system prompt to reduce cost on repeated calls

### Discord Best Practices
- [ ] Use slash commands (not prefix commands) as primary interface
- [ ] Defer replies for commands that take >3 seconds (`interaction.deferReply()`)
- [ ] Use ephemeral replies for error messages (only visible to the user)
- [ ] Paginate long responses with button components
- [ ] Use autocomplete for category/topic parameters
- [ ] Handle interaction timeouts gracefully (15-minute window)
- [ ] Register commands with proper permissions and descriptions

### Security
- [ ] Never expose API keys in responses or logs
- [ ] Sanitize all user inputs before passing to Claude API
- [ ] Rate limit aggressively to prevent API cost abuse
- [ ] Block prompt injection attempts (monitor for "ignore previous instructions" patterns)
- [ ] Restrict bot to specific channels if needed (configurable)

---

## Verification — Run After Each Major Change

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Test locally (requires .env with tokens)
npm run dev

# Deploy slash commands to Discord
npm run deploy-commands
```

---

## What NOT to Do
- Do NOT store conversation history in memory (stateless per request, no multi-turn for now)
- Do NOT add a database — all data lives in TypeScript files (same as website)
- Do NOT add web dashboard or admin panel — keep it bot-only
- Do NOT add music, moderation, or features unrelated to the community mission
- Do NOT use deprecated Discord.js patterns (use v14+ slash commands, builders, components)
- Do NOT hardcode any IDs, tokens, or keys
- Do NOT over-engineer — simple modules, clear separation, no unnecessary abstractions

---

## Commit Strategy

```
feat(bot): initialize project with Discord.js + TypeScript + Claude SDK
feat(data): add community data files (FAQs, events, resources, team)
feat(commands): implement /ask with Claude API integration
feat(commands): implement /faq, /events, /resources commands
feat(commands): implement /about, /help, /links, /claude commands
feat(events): add welcome system and natural language handler
feat(reminders): add scheduled event reminders
feat(embeds): terminal-noir themed embed design system
fix(security): add rate limiting and input sanitization
docs(readme): add setup, deployment, and contribution guide
```

---

## Success Criteria

When done, the bot should:
1. **Respond intelligently** to any question about Claude, Anthropic, or the community via `/ask`
2. **Serve community data** accurately — FAQs, events, resources always up-to-date
3. **Welcome new members** warmly with an on-brand terminal-themed message
4. **Remind about events** automatically at 7d, 1d, and day-of
5. **Feel fast** — simple lookups under 1 second, AI responses under 3 seconds
6. **Stay within budget** — smart model selection (Haiku for simple, Opus for complex)
7. **Handle errors gracefully** — never crash, always respond with something useful
8. **Look professional** — consistent green/amber/cyan embed styling
9. **Be secure** — rate-limited, input-sanitized, no exposed keys
10. **Build passes** — zero TypeScript errors, zero runtime crashes

---

## Starting Point

1. Initialize the project: `npm init`, install dependencies, set up TypeScript
2. Create the data files (copy structure from website's `src/data/`)
3. Set up the Discord client and slash command registration
4. Implement `/ask` with Claude API — this is the core feature
5. Add remaining commands one by one
6. Add welcome system and event reminders
7. Add rate limiting and error handling
8. Test thoroughly, then deploy

Begin with step 1 and proceed sequentially. Verify TypeScript compiles after each step.
