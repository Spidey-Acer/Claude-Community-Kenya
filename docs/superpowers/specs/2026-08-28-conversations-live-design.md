# Conversations Live — event feature modules, public participation, Q&A

**Date:** 2026-08-28 · **Branch:** `feat/conversations-live` · **Deadline:** live tonight; event Sat 29 Aug 2pm EAT.

## Why

Claude Conversations (Sat 29 Aug, Blockchain Centre NBO) picks the build brief for Claude Impact
Lab - AI Mashinani 02 (Wed 2 Sept, Anthropic team in the room). Three products in one build:

1. **Reusable Conversations event pages** — every future Claude Conversations event gets a live
   web page, configured from the admin, following Anthropic's Conversations Room Kit structure.
2. **Event Q&A feature** — any event can open a "submit your question" session. First consumers:
   Impact Lab 02's live Q&A with Anthropic's team (promised to attendees in the 28 Aug blast).
3. **Open participation** — any Kenyan, in the room or not, contributes a problem statement to
   the Conversations page; the strongest remote contributions get read aloud; the whole country
   sees the chosen problem the moment Peter publishes it from the venue.

Design decisions locked with Peter (28 Aug): full system now including admin (no static
stopgap); remote visitors contribute + see the result but do NOT vote (the room's dot vote is
sovereign); submissions need name + county, no account (moderated before display).

## Data model (Prisma)

New enums:

```prisma
enum SubmissionModerationStatus {
  PENDING
  APPROVED
  FEATURED   // surfaced prominently; framing/read-aloud pool
  REJECTED
}
```

New models — all keyed to the existing `Event`:

```prisma
/// A question-collection session attached to an event ("Ask Anthropic's team").
/// Reusable by any event; Conversations pages don't use it on day one, the
/// Impact Lab page does.
model EventQuestionSession {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  title     String                  // "Ask Anthropic's team"
  prompt    String   @db.Text      // helper copy above the form
  isOpen    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  questions EventQuestion[]
  @@index([eventId])
  @@map("event_question_sessions")
}

model EventQuestion {
  id            String   @id @default(cuid())
  sessionId     String
  session       EventQuestionSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  body          String   @db.VarChar(500)
  submitterName String   @db.VarChar(80)
  county        String   @db.VarChar(40)   // one of the 47, validated server-side
  ipHash        String?  @db.VarChar(64)   // sha256(ip + salt) for daily caps; never raw IP
  status        SubmissionModerationStatus @default(PENDING)
  createdAt     DateTime @default(now())
  @@index([sessionId, status])
  @@map("event_questions")
}

/// A problem statement contributed to a Conversations event, from the room or
/// from anywhere in Kenya. Mapped to one of the page's table questions.
model EventContribution {
  id            String   @id @default(cuid())
  eventId       String
  event         Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  questionKey   String   @db.VarChar(40)   // matches ConversationsPage.tableQuestions[].key
  body          String   @db.VarChar(600)
  submitterName String   @db.VarChar(80)
  county        String   @db.VarChar(40)
  ipHash        String?  @db.VarChar(64)   // sha256(ip + salt) for daily caps; never raw IP
  status        SubmissionModerationStatus @default(PENDING)
  createdAt     DateTime @default(now())
  @@index([eventId, status])
  @@map("event_contributions")
}

/// Per-event page config for a Conversations event. One row per event.
model ConversationsPage {
  id            String   @id @default(cuid())
  eventId       String   @unique
  event         Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  heroHeadline  String   @db.VarChar(200)  // "Kenya is #1 in the world at using AI..."
  heroSubline   String   @db.VarChar(300)  // "...and fewer than half of us are online."
  framingStats  Json     // [{line, source}]
  tableQuestions Json    // [{key, label, description}] — the kit's canonical three by default
  seedProblems  Json     // [{title, statement, questionKey, buildWedge}] — collapsed drawer
  contributionsOpen Boolean @default(true)
  /// null until the room decides; set from the phone at the venue.
  result        Json?    // {winner: {title, statement}, runnersUp: [{title, statement}], note, publishedAt}
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@map("conversations_pages")
}
```

`Event` gains relations: `questionSessions EventQuestionSession[]`,
`contributions EventContribution[]`, `conversationsPage ConversationsPage?`.
`EventType` already exists — add `CONVERSATIONS` value if not present (verify against schema
lines 43-50 before editing; if the enum can't take a new value cheaply, key the index page off
title match is FORBIDDEN — add the enum value, it's one migration).

Migration note: repo may carry migration quirks — check the website repo CLAUDE.md and
package.json scripts; use the repo's established migrate workflow, never `migrate reset`.

## API surface

All under `src/app/api/`, following the repo's existing envelope + zod conventions
(conventions brief from recon agent is binding). No auth on public POSTs; instead:

- zod validation, max lengths as in schema; county must be one of the 47 (shared constant
  `KENYA_COUNTIES` in `src/lib/`).
- Honeypot field `website` — if non-empty, return success without writing (silent drop).
- Rate limit: reuse the repo's existing limiter if one exists; else in-memory token bucket per
  IP (best-effort on serverless) + per-IP daily cap enforced in DB (count recent rows by
  hashed IP — store `ipHash String?` on both submission models, sha256(ip + server salt),
  never the raw IP).
- Nothing unmoderated is ever returned by any public GET.

Routes:

| Route | Method | Purpose |
|---|---|---|
| `/api/events/[id]/questions` | POST | submit a question to the event's OPEN session |
| `/api/events/[id]/contributions` | POST | submit a problem statement (Conversations events, `contributionsOpen`) |
| `/api/events/[id]/contributions` | GET | APPROVED+FEATURED only, grouped by questionKey, newest first, cap 100 |
| `/api/admin/moderation` | GET/PATCH | admin: combined queue (questions + contributions), approve/feature/reject |
| `/api/admin/conversations/[eventId]` | GET/PUT | admin: page config CRUD |
| `/api/admin/conversations/[eventId]/result` | PUT | admin: publish/update the result |

Admin routes use the repo's existing admin auth/role gate exactly as the recon brief shows.

## Public pages

`src/app/conversations/page.tsx` — index: all events with a `ConversationsPage`, upcoming
first; card = date, venue, title, status chip (Upcoming / Live today / Decided → shows winner
title). Karibu tokens throughout.

`src/app/conversations/[slug]/page.tsx` — the live page, top to bottom:
1. **Hero**: heroHeadline / heroSubline (the two numbers in tension), event date/venue chip,
   Luma link if `event.lumaUrl`.
2. **Stat wall**: framingStats as cards, each with its source line. Design: person-first, not
   ministry-first.
3. **The three questions**: three columns (stack on mobile), each with label + description +
   its APPROVED/FEATURED contributions as cards (name + county attribution, FEATURED pinned
   top with a subtle marker). Columns start honest-empty with an invitation line.
4. **Contribute form** (if `contributionsOpen`): question picker (the three), statement
   textarea with live char count, name, county select (47), honeypot. Submit → "Asante —
   your contribution is in review" state. Client component; optimistic UX but NO optimistic
   public display.
5. **Seed drawer**: collapsed `<details>` "If your table is stuck — what a sharp problem
   sounds like", rendering seedProblems. Framed as examples, never a menu.
6. **Result banner**: when `result` is non-null it renders ABOVE everything: "Nairobi picked
   this" + winner + runners-up + CTA to the Impact Lab event (luma link). Page revalidates
   (revalidate = 60 or on-demand revalidatePath from the publish action).

`src/app/events/[slug]` — add a Q&A section rendered when the event has an OPEN
EventQuestionSession: session title + prompt + question form (same field rules), plus
"X questions already in" count (APPROVED+ count). No public listing of questions (they're for
the live session, not a wall) — count only.

Design bar: this page will be read by Anthropic's team. Follow Karibu primitives from the
recon brief; no new one-off components where a primitive exists; mobile-first (most traffic is
phones from WhatsApp).

## Admin

`src/app/admin/conversations/page.tsx` — list Conversations events + "attach page to event"
(pick an event, creates ConversationsPage with kit defaults + research-brief seeds).

`src/app/admin/conversations/[eventId]/page.tsx` — tabs/sections:
- **Config**: hero lines, stats editor (line + source rows), table questions, seed problems,
  contributionsOpen toggle.
- **Moderation**: combined pending queue, newest first, 2-tap approve/feature/reject, counts
  by status. MUST be comfortable on a phone (Peter moderates from the venue).
- **Result**: winner + runners-up form (pick from approved contributions OR free text), one
  publish button with confirm. Phone-first layout; this is the Saturday 5pm moment.
- **Q&A sessions** (on the same admin page or `/admin/events` extension): create/open/close a
  session for any event; moderation of questions rides the same combined queue.

## Seed script

`prisma/seed` addition or one-off script `scripts/seed-conversations-29aug.ts`:
- Ensure the 29 Aug event row exists (check prod data first — an events row may already
  exist; UPDATE not duplicate).
- Create its ConversationsPage: hero pair + 10 framing stats + 3 kit questions + 12 seed
  problems from `C:\Projects\Claude-Community-Kenya\events\2026-08-29-kenya-research-brief.md`
  (copy content into the script; strip em dashes to match site voice).
- Create the Impact Lab event's EventQuestionSession ("Ask Anthropic's team", open).

## Testing

- Unit: zod schemas (lengths, county validation, honeypot), moderation transitions, result
  publish shape.
- API: POST happy path + honeypot drop + over-limit rejection + closed-session rejection;
  GET never leaks PENDING/REJECTED.
- Existing suite must stay green. Run repo's test script.
- Manual gate (Iron Law): Peter clicks through locally + on Vercel preview before merge —
  submit a contribution, moderate it on a phone-width window, publish a dummy result, verify
  the flip, then reset result to null.

## Rollout

1. PR from `feat/conversations-live`; Vercel preview.
2. Peter click-test → merge (his click) → prod deploy.
3. Run seed against prod (via the repo's established prod-DB access path — see CCK database
   access memory: cck_migrator over SSH tunnel).
4. Afternoon feature post goes out ONLY after Peter has submitted a real question end-to-end
   on prod.

## Out of scope (explicitly)

Remote voting; public display of Q&A questions; accounts/auth changes; i18n; photo upload on
contributions; any Showcase changes.
