# Community Showcase — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a verified community member publish a showcase post — with images, a demo GIF or video, a linked event, what it was built with, and what it needs — that appears publicly without waiting on a moderator, and that other members react to, comment on, and upvote.

**Architecture:** Extend the existing `CommunitySubmission` model with a `SHOWCASE` type plus media and metadata fields, rather than building a parallel model. A new `/showcase` route renders the same records through new Karibu components; `/community` gains an explicit type exclusion so showcase posts never leak into it. Media goes direct-to-R2 through a member-scoped presign route modeled on the existing admin photo pipeline. Identity-aware upvoting replaces the current IP-only key.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Prisma 7 (client generated to `@/generated/prisma/client`), PostgreSQL, NextAuth v5, Cloudflare R2 via `@aws-sdk/client-s3`, Tailwind v4, Zod, Vitest (added in Task 1).

**Spec:** `docs/superpowers/specs/2026-08-21-community-showcase-design.md`

**Branch:** `feat/community-showcase` (already created off `main`).

## Global Constraints

- **Prisma client import path is `@/generated/prisma/client`**, never `@prisma/client`. Every existing route does this.
- **Public showcase pages use Karibu**, components under `src/components/karibu/`. Dark panels use `--panel-dark` / `--on-panel-dark` / `--on-panel-dark-muted`. Never `bg-ink` for a dark surface — that is the bug that put the footer at 1.59:1 contrast.
- **Terminal Noir is admin-only** (`/admin/*`, `/dashboard/*`, `/judge`, `/timer`). No Terminal Noir on `/showcase`.
- **Every mutating route** calls `withCsrfProtection(request)` first, then `rateLimit(request, RateLimits.X)`, in that order — matching every existing route in `src/app/api/community/`.
- **TypeScript strict. No `any`.** No `.js` files in `src/`.
- **No `console.log` in shipped code.** `console.warn` / `console.error` for genuine failure paths only, matching the existing `[COMMUNITY]` prefix convention.
- **Conventional commits**, one logical unit each: `type(scope): description`.
- **Media limits:** images jpg/png/webp ≤ 5 MB; demo mp4 ≤ 15 MB or gif ≤ 15 MB; max 5 media per submission.
- **`needs` vocabulary is fixed:** `testers`, `co-founder`, `frontend-dev`, `backend-dev`, `mobile-dev`, `designer`, `data`, `intro`, `funding`, `feedback`.
- **Reaction emoji set is fixed:** 🔥 🙌 🧠 😂 🚀.
- Run `npx tsc --noEmit` and `npm run lint` before every commit. Both must be clean.

---

## Pre-flight note for the implementer

The spec flagged one risk as unverified: whether `zodSanitizeString` strips emoji. **It does not.** `sanitizeString` in `src/lib/input-sanitization.ts:17` collapses whitespace, strips null bytes, and strips HTML/script tags — it never touches non-ASCII. Task 1 locks this in as a regression test rather than treating it as a blocker.

---

## File Structure

**New — showcase domain logic**
- `src/lib/showcase/constants.ts` — the `needs` vocabulary, reaction emoji set, media limits. One place so route validation and UI chips cannot drift.
- `src/lib/showcase/media.ts` — magic-byte sniffing, extension mapping, media-array validation. Pure functions, no I/O, so they unit-test without a database.
- `src/lib/showcase/ranking.ts` — the hot-score SQL fragment and sort resolution.
- `src/lib/showcase/queries.ts` — read helpers (`getShowcasePosts`, `getShowcasePostBySlug`). Kept out of the already-large `src/lib/data.ts`.

**New — API routes**
- `src/app/api/showcase/route.ts` — POST create a showcase post.
- `src/app/api/showcase/media/presign/route.ts` — mint direct-to-R2 upload URLs.
- `src/app/api/showcase/media/finalize/route.ts` — verify magic bytes, return the media descriptor.
- `src/app/api/showcase/[slug]/react/route.ts` — toggle a reaction.
- `src/app/api/reports/route.ts` — file a content report (shared across submissions, comments, updates).
- `src/app/api/showcase/gifs/route.ts` — server-side Tenor proxy so the API key never reaches the browser.

**New — pages and components**
- `src/app/showcase/page.tsx`, `src/app/showcase/[slug]/page.tsx`, `src/app/showcase/submit/page.tsx`
- `src/components/karibu/showcase/ShowcaseFeed.tsx`, `ShowcaseCard.tsx`, `ShowcaseDetail.tsx`, `ShowcaseComposer.tsx`, `MediaUploader.tsx`, `GifPicker.tsx`, `EmojiPicker.tsx`, `ReactionRow.tsx`, `NeedsChips.tsx`, `BuiltWithPanel.tsx`, `ReportButton.tsx`

**Modified**
- `prisma/schema.prisma`
- `src/app/api/community/[slug]/upvote/route.ts` — voterKey
- `src/app/api/community/[slug]/comment/route.ts` — member auth + status matrix
- `src/lib/data.ts:645` — exclude `SHOWCASE` from `getCommunitySubmissions`
- `src/app/admin/community/` — showcase tab + reports queue

---

## Task 1: Test harness and the emoji regression lock

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/showcase/__tests__/sanitization.test.ts`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` (single run) and `npm run test:watch`. Every later task's test steps use `npm test -- <path>`.

This repo has no test runner today; its convention is bespoke `scripts/verify-*.ts` run through `tsx`. Those stay for DB-level end-to-end checks (Task 14 adds one). Vitest is added because the approved spec requires unit and integration tests, and a `verify:` script cannot express a per-function assertion cycle.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^3 vite-tsconfig-paths@^5
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
})
```

**Where each layer of the spec's testing section is covered.** Vitest holds the pure-function assertions — sanitisation, media sniffing, voter keys, comment status, constants. Anything needing a live database or a live session is covered instead by `npm run verify:showcase` (Task 16) and the explicit browser verification steps inside each route task. That split is deliberate: standing up a seeded test database and a NextAuth session factory is its own project, and this repo has neither today. The route-level guarantees the spec asks for are still verified — by a named command with recorded output, not by assumption.

- [ ] **Step 3: Add scripts to `package.json`**

Add to the `scripts` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the emoji regression test**

Create `src/lib/showcase/__tests__/sanitization.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { sanitizeString, sanitizeMultilineText } from "@/lib/input-sanitization"

/**
 * Locks the behaviour the showcase depends on: emoji are stored as Unicode in
 * db.Text columns and must survive sanitisation untouched. If someone later
 * adds an ASCII-only filter to sanitizeString, emoji would vanish from every
 * comment with no error anywhere. This test is the alarm.
 */
describe("sanitisation preserves emoji", () => {
  it("keeps emoji in single-line strings", () => {
    expect(sanitizeString("shipped it 🚀")).toBe("shipped it 🚀")
  })

  it("keeps the full reaction set", () => {
    expect(sanitizeString("🔥 🙌 🧠 😂 🚀")).toBe("🔥 🙌 🧠 😂 🚀")
  })

  it("keeps emoji in multiline text", () => {
    const input = "line one 🇰🇪\n\nline two 👩🏾‍💻"
    expect(sanitizeMultilineText(input, 1000)).toBe(input)
  })

  it("still strips HTML while keeping emoji", () => {
    expect(sanitizeString("<script>bad()</script>ok 🔥")).toBe("ok 🔥")
  })
})
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, 4 tests. If the multiline case fails on the ZWJ sequence `👩🏾‍💻`, that is a real finding — stop and report it rather than weakening the assertion.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/showcase/__tests__/sanitization.test.ts
git commit -m "test: add vitest harness and emoji sanitisation regression lock"
```

---

## Task 2: Showcase constants

**Files:**
- Create: `src/lib/showcase/constants.ts`
- Create: `src/lib/showcase/__tests__/constants.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `NEEDS_OPTIONS: readonly NeedKey[]` and `type NeedKey`
  - `NEED_LABELS: Record<NeedKey, string>`
  - `REACTION_EMOJI: readonly string[]`
  - `MAX_MEDIA_PER_POST = 5`, `MAX_IMAGE_BYTES`, `MAX_DEMO_BYTES`
  - `isNeedKey(value: string): value is NeedKey`

- [ ] **Step 1: Write the failing test**

Create `src/lib/showcase/__tests__/constants.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  NEEDS_OPTIONS,
  NEED_LABELS,
  REACTION_EMOJI,
  isNeedKey,
  MAX_MEDIA_PER_POST,
} from "@/lib/showcase/constants"

describe("showcase constants", () => {
  it("exposes the ten agreed need keys", () => {
    expect(NEEDS_OPTIONS).toEqual([
      "testers", "co-founder", "frontend-dev", "backend-dev", "mobile-dev",
      "designer", "data", "intro", "funding", "feedback",
    ])
  })

  it("labels every need key", () => {
    for (const key of NEEDS_OPTIONS) {
      expect(NEED_LABELS[key]).toBeTruthy()
    }
  })

  it("exposes exactly five reaction emoji", () => {
    expect(REACTION_EMOJI).toHaveLength(5)
  })

  it("narrows valid need keys and rejects others", () => {
    expect(isNeedKey("testers")).toBe(true)
    expect(isNeedKey("pizza")).toBe(false)
  })

  it("caps media at five per post", () => {
    expect(MAX_MEDIA_PER_POST).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/showcase/__tests__/constants.test.ts`
Expected: FAIL — cannot resolve `@/lib/showcase/constants`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/showcase/constants.ts`:

```typescript
/**
 * Shared vocabulary for the community showcase.
 *
 * Route validation and UI chips both read from here so a need key rendered as
 * a filter can never drift from one the API will accept.
 */

export const NEEDS_OPTIONS = [
  "testers",
  "co-founder",
  "frontend-dev",
  "backend-dev",
  "mobile-dev",
  "designer",
  "data",
  "intro",
  "funding",
  "feedback",
] as const

export type NeedKey = (typeof NEEDS_OPTIONS)[number]

export const NEED_LABELS: Record<NeedKey, string> = {
  testers: "Testers",
  "co-founder": "Co-founder",
  "frontend-dev": "Frontend dev",
  "backend-dev": "Backend dev",
  "mobile-dev": "Mobile dev",
  designer: "Designer",
  data: "Data",
  intro: "An intro",
  funding: "Funding",
  feedback: "Feedback",
}

export function isNeedKey(value: string): value is NeedKey {
  return (NEEDS_OPTIONS as readonly string[]).includes(value)
}

/** Fixed set. Adding one is a product decision, not a config tweak. */
export const REACTION_EMOJI = ["🔥", "🙌", "🧠", "😂", "🚀"] as const

export type ReactionEmoji = (typeof REACTION_EMOJI)[number]

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value)
}

export const MAX_MEDIA_PER_POST = 5
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_DEMO_BYTES = 15 * 1024 * 1024
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/showcase/__tests__/constants.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/showcase/constants.ts src/lib/showcase/__tests__/constants.test.ts
git commit -m "feat(showcase): add shared needs and reaction vocabulary"
```

---

## Task 3: Media type sniffing

**Files:**
- Create: `src/lib/showcase/media.ts`
- Create: `src/lib/showcase/__tests__/media.test.ts`

**Interfaces:**
- Consumes: `MAX_IMAGE_BYTES`, `MAX_DEMO_BYTES`, `MAX_MEDIA_PER_POST` from Task 2.
- Produces:
  - `type MediaKind = "image" | "gif" | "mp4"`
  - `interface MediaDescriptor { key: string; url: string; width: number; height: number; kind: MediaKind; posterUrl?: string; alt?: string }`
  - `sniffMediaKind(bytes: Uint8Array): MediaKind | null`
  - `extensionForKind(kind: MediaKind, declared: string): string`
  - `validateMediaSize(kind: MediaKind, bytes: number): { ok: true } | { ok: false; error: string }`

The client-declared MIME type is never trusted. A file claiming `image/png` that is actually an MP4 would otherwise be stored and served with the wrong content type.

- [ ] **Step 1: Write the failing test**

Create `src/lib/showcase/__tests__/media.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { sniffMediaKind, validateMediaSize } from "@/lib/showcase/media"

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values)
}

/** RIFF????WEBP — the four size bytes between the tags are irrelevant. */
function webpHeader(): Uint8Array {
  const head = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]
  return new Uint8Array(head)
}

/** ????ftypisom — the box-size prefix precedes the ftyp marker at offset 4. */
function mp4Header(): Uint8Array {
  const head = [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]
  return new Uint8Array(head)
}

describe("sniffMediaKind", () => {
  it("detects JPEG", () => {
    expect(sniffMediaKind(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe("image")
  })

  it("detects PNG", () => {
    expect(sniffMediaKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0))).toBe("image")
  })

  it("detects WEBP", () => {
    expect(sniffMediaKind(webpHeader())).toBe("image")
  })

  it("detects GIF as its own kind, not a generic image", () => {
    const gif = new TextEncoder().encode("GIF89a______")
    expect(sniffMediaKind(gif)).toBe("gif")
  })

  it("detects MP4 via the ftyp box", () => {
    expect(sniffMediaKind(mp4Header())).toBe("mp4")
  })

  it("returns null for an unrecognised header", () => {
    expect(sniffMediaKind(bytes(0x00, 0x01, 0x02, 0x03, 0, 0, 0, 0, 0, 0, 0, 0))).toBeNull()
  })

  it("returns null for a buffer too short to identify", () => {
    expect(sniffMediaKind(bytes(0xff, 0xd8))).toBeNull()
  })
})

describe("validateMediaSize", () => {
  it("accepts an image under 5MB", () => {
    expect(validateMediaSize("image", 4 * 1024 * 1024)).toEqual({ ok: true })
  })

  it("rejects an image over 5MB", () => {
    const result = validateMediaSize("image", 6 * 1024 * 1024)
    expect(result.ok).toBe(false)
  })

  it("accepts a gif at exactly 15MB", () => {
    expect(validateMediaSize("gif", 15 * 1024 * 1024)).toEqual({ ok: true })
  })

  it("rejects an mp4 over 15MB", () => {
    expect(validateMediaSize("mp4", 16 * 1024 * 1024).ok).toBe(false)
  })

  it("rejects zero bytes", () => {
    expect(validateMediaSize("image", 0).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/showcase/__tests__/media.test.ts`
Expected: FAIL — cannot resolve `@/lib/showcase/media`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/showcase/media.ts`:

```typescript
import { MAX_DEMO_BYTES, MAX_IMAGE_BYTES } from "@/lib/showcase/constants"

/**
 * Media identification for showcase uploads.
 *
 * Everything here works off the file's own bytes. The browser-declared MIME
 * type and the filename extension are both attacker-controlled: a file
 * labelled image/png that is really an MP4 would be stored with a content type
 * that does not match its contents, and served as something it is not.
 */

export type MediaKind = "image" | "gif" | "mp4"

export interface MediaDescriptor {
  key: string
  url: string
  width: number
  height: number
  kind: MediaKind
  posterUrl?: string
  alt?: string
}

/** Shortest header we can decide on is the 12-byte RIFF/WEBP form. */
const MIN_SNIFF_BYTES = 12

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, i) => bytes[offset + i] === byte)
}

/**
 * Identify a file from its magic bytes, or null if it is not a format we accept.
 *
 * GIF is deliberately its own kind rather than folding into "image": it has a
 * different size ceiling and a different render path, and the spec's revisit
 * trigger counts GIF uploads specifically.
 */
export function sniffMediaKind(bytes: Uint8Array): MediaKind | null {
  if (bytes.length < MIN_SNIFF_BYTES) return null

  // GIF87a / GIF89a
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif"

  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image"

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image"

  // WEBP: "RIFF" ???? "WEBP" — the four bytes between are the file size.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image"
  }

  // MP4 and friends: a box-size prefix then "ftyp" at offset 4.
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return "mp4"

  return null
}

const EXTENSION_BY_KIND: Record<MediaKind, string> = {
  gif: "gif",
  mp4: "mp4",
  image: "webp",
}

/**
 * Storage extension for a sniffed kind.
 *
 * `declared` is the client's filename extension; it is honoured only when it
 * agrees with what the bytes say, so a jpg stays a jpg rather than being
 * renamed to webp without transcoding.
 */
export function extensionForKind(kind: MediaKind, declared: string): string {
  const clean = declared.toLowerCase().replace(/^\./, "")
  if (kind === "image" && ["jpg", "jpeg", "png", "webp"].includes(clean)) {
    return clean === "jpeg" ? "jpg" : clean
  }
  return EXTENSION_BY_KIND[kind]
}

export function validateMediaSize(
  kind: MediaKind,
  bytes: number,
): { ok: true } | { ok: false; error: string } {
  if (bytes <= 0) {
    return { ok: false, error: "File is empty." }
  }
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_DEMO_BYTES
  if (bytes > limit) {
    const mb = Math.round(limit / (1024 * 1024))
    return { ok: false, error: `File is too large. Limit is ${mb}MB.` }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/showcase/__tests__/media.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/showcase/media.ts src/lib/showcase/__tests__/media.test.ts
git commit -m "feat(showcase): identify upload media by magic bytes"
```

---

## Task 4: Schema — showcase fields, reactions, reports

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma model `ShowcaseReaction`, `ContentReport`; enums `ReportTarget`, `ReportReason`, `ReportStatus`; `SHOWCASE` on `CommunityResourceType`; new `CommunitySubmission` columns; `CommunityComment.userId`.

The `CommunityUpvote` change is deliberately **not** here — it is a data migration with its own failure mode and gets Task 5 to itself.

- [ ] **Step 1: Add `SHOWCASE` to the resource type enum**

In `prisma/schema.prisma`, find `enum CommunityResourceType` (around line 72) and add the value last, so existing stored values keep their ordinal:

```prisma
enum CommunityResourceType {
  MCP
  PROMPT
  WORKFLOW
  TOOL
  SHOWCASE
}
```

- [ ] **Step 2: Add the report enums**

Add near the other enums:

```prisma
enum ReportTarget {
  SUBMISSION
  COMMENT
  UPDATE
}

enum ReportReason {
  SPAM
  ABUSE
  OFF_TOPIC
  PLAGIARISM
  OTHER
}

enum ReportStatus {
  OPEN
  ACTIONED
  DISMISSED
}
```

- [ ] **Step 3: Extend `CommunitySubmission`**

Add these fields to the existing model (around line 601), keeping the existing ones untouched:

```prisma
  coverImageUrl  String?
  /// MediaDescriptor[] — see src/lib/showcase/media.ts. Max 5.
  media          Json?
  eventId        String?
  /// NeedKey[] — see src/lib/showcase/constants.ts.
  needs          Json?
  /// { models: string[], skills: string[], mcps: string[], tokensPerRun?: number }
  builtWith      Json?
  /// Feed ordering. Set on create; Phase 2 moves it on each ShowcaseUpdate.
  lastActivityAt DateTime @default(now())
  /// Denormalised for Phase 2's follow button; unused in Phase 1.
  followerCount  Int      @default(0)
  /// Denormalised { "🔥": 12 } so feed cards need no per-card aggregate.
  reactionCounts Json?

  event     Event?             @relation(fields: [eventId], references: [id], onDelete: SetNull)
  reactions ShowcaseReaction[]
```

And add these indexes alongside the existing `@@index` lines:

```prisma
  @@index([type, status, lastActivityAt])
  @@index([eventId])
```

- [ ] **Step 4: Add `userId` to `CommunityComment`**

In the existing `CommunityComment` model, add:

```prisma
  userId String?
  user   User?  @relation(fields: [userId], references: [id], onDelete: SetNull)
```

and an index:

```prisma
  @@index([userId])
```

- [ ] **Step 5: Add the new models**

```prisma
/// Reactions are members-only, so userId is required — unlike CommunityUpvote,
/// which keeps an anonymous path and therefore needs the voterKey scheme.
model ShowcaseReaction {
  id           String   @id @default(cuid())
  submissionId String
  userId       String
  emoji        String   @db.VarChar(16)
  createdAt    DateTime @default(now())

  submission CommunitySubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([submissionId, userId, emoji])
  @@index([submissionId])
  @@map("showcase_reactions")
}

model ContentReport {
  id         String       @id @default(cuid())
  targetType ReportTarget
  targetId   String
  reporterId String?
  reporterIp String?
  reason     ReportReason
  detail     String?      @db.Text
  status     ReportStatus @default(OPEN)
  reviewedBy String?
  reviewedAt DateTime?
  createdAt  DateTime     @default(now())

  reporter User? @relation(fields: [reporterId], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
  @@index([targetType, targetId])
  @@map("content_reports")
}
```

- [ ] **Step 6: Wire the back-relations**

On `model User`, add:

```prisma
  showcaseReactions ShowcaseReaction[]
  communityComments CommunityComment[]
  contentReports    ContentReport[]
```

On `model Event`, add:

```prisma
  communitySubmissions CommunitySubmission[]
```

- [ ] **Step 7: Generate the migration**

Run: `npm run db:migrate -- --name showcase_phase_1`
Expected: a new folder under `prisma/migrations/`, and `prisma generate` succeeds.

- [ ] **Step 8: Verify the schema compiles and the client regenerated**

Run: `npx prisma validate && npx tsc --noEmit`
Expected: "The schema at prisma/schema.prisma is valid" and no type errors.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(showcase): add showcase fields, reactions and content reports"
```

---

## Task 5: Identity-aware upvotes

**Files:**
- Modify: `prisma/schema.prisma` (model `CommunityUpvote`)
- Modify: `src/app/api/community/[slug]/upvote/route.ts`
- Create: `src/lib/showcase/__tests__/voter-key.test.ts`
- Create: `src/lib/showcase/voter-key.ts`

**Interfaces:**
- Consumes: `getSessionUserId` from `@/lib/auth-helpers`.
- Produces: `voterKeyFor(userId: string | null, ipHash: string): string`.

Today's `@@unique([submissionId, ipHash])` means two members behind one NAT block each other from voting. This is a live correctness bug on Kenyan carrier networks, independent of the showcase.

- [ ] **Step 1: Write the failing test**

Create `src/lib/showcase/__tests__/voter-key.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { voterKeyFor } from "@/lib/showcase/voter-key"

describe("voterKeyFor", () => {
  it("keys on the user when signed in", () => {
    expect(voterKeyFor("user_123", "abc")).toBe("u:user_123")
  })

  it("keys on the ip hash when anonymous", () => {
    expect(voterKeyFor(null, "abc")).toBe("ip:abc")
  })

  it("gives two users behind one ip distinct keys", () => {
    expect(voterKeyFor("user_a", "same")).not.toBe(voterKeyFor("user_b", "same"))
  })

  it("gives one user on two networks the same key", () => {
    expect(voterKeyFor("user_a", "net1")).toBe(voterKeyFor("user_a", "net2"))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/showcase/__tests__/voter-key.test.ts`
Expected: FAIL — cannot resolve `@/lib/showcase/voter-key`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/showcase/voter-key.ts`:

```typescript
/**
 * Identity for a vote or reaction, as a single string.
 *
 * A signed-in member is keyed on their user id, so they get one vote per post
 * regardless of which network they are on. Anonymous voters fall back to the
 * hashed IP.
 *
 * One column rather than two nullable ones because the uniqueness rule is
 * "one vote per voter per post", and a partial unique index — the two-column
 * form — is not expressible in Prisma's schema language.
 */
export function voterKeyFor(userId: string | null, ipHash: string): string {
  return userId ? `u:${userId}` : `ip:${ipHash}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/showcase/__tests__/voter-key.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Change the schema**

In `model CommunityUpvote`, make `ipHash` nullable, add `voterKey`, and swap the unique:

```prisma
model CommunityUpvote {
  id           String   @id @default(cuid())
  submissionId String
  /// Retained for abuse forensics only. No longer part of the uniqueness rule.
  ipHash       String?
  /// "u:<userId>" when signed in, "ip:<hash>" otherwise.
  voterKey     String
  createdAt    DateTime @default(now())

  submission CommunitySubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@unique([submissionId, voterKey])
  @@map("community_upvotes")
}
```

- [ ] **Step 6: Create the migration without applying it**

Run: `npx prisma migrate dev --name upvote_voter_key --create-only`
Expected: a migration folder is created and NOT applied.

- [ ] **Step 7: Hand-edit the migration so existing rows survive**

Prisma's generated SQL will add `voterKey` as `NOT NULL` with no default, which fails on a non-empty table. Replace the generated body with this ordered version — backfill and constraint swap in one transaction, so no window exists where a signed-in user could double-vote:

```sql
-- 1. Add nullable, then backfill from the existing IP hash.
ALTER TABLE "community_upvotes" ADD COLUMN "voterKey" TEXT;
UPDATE "community_upvotes" SET "voterKey" = 'ip:' || "ipHash" WHERE "voterKey" IS NULL;

-- 2. Now it can be required.
ALTER TABLE "community_upvotes" ALTER COLUMN "voterKey" SET NOT NULL;

-- 3. ipHash keeps its data but stops being required.
ALTER TABLE "community_upvotes" ALTER COLUMN "ipHash" DROP NOT NULL;

-- 4. Swap the uniqueness rule.
DROP INDEX IF EXISTS "community_upvotes_submissionId_ipHash_key";
CREATE UNIQUE INDEX "community_upvotes_submissionId_voterKey_key"
  ON "community_upvotes"("submissionId", "voterKey");
```

- [ ] **Step 8: Apply and verify no rows were lost**

```bash
npx prisma migrate dev
npx prisma db execute --stdin <<'SQL'
SELECT count(*) AS total, count("voterKey") AS keyed FROM community_upvotes;
SQL
```

Expected: `total` equals `keyed`, and both equal the row count before the migration. If they differ, roll back — do not proceed.

- [ ] **Step 9: Update the upvote route**

In `src/app/api/community/[slug]/upvote/route.ts`, import the helpers:

```typescript
import { getSessionUserId } from "@/lib/auth-helpers"
import { voterKeyFor } from "@/lib/showcase/voter-key"
```

Then replace the `ipHash` computation and the `create` call. The hash stays — it is still recorded — but it no longer decides uniqueness:

```typescript
    const ipHash = createHash("sha256")
      .update(ip + ":" + submission.id + ":" + UPVOTE_SALT)
      .digest("hex")

    const userId = await getSessionUserId()
    const voterKey = voterKeyFor(userId, ipHash)

    const result = await prisma.$transaction(async (tx) => {
      await tx.communityUpvote.create({
        data: {
          submissionId: submission.id,
          ipHash,
          voterKey,
        },
      })

      const updated = await tx.communitySubmission.update({
        where: { id: submission.id },
        data: { upvoteCount: { increment: 1 } },
        select: { upvoteCount: true },
      })

      return updated
    })
```

The existing `P2002` catch already returns "Already upvoted" — it now fires on the new constraint with no change.

- [ ] **Step 10: Verify end to end against a running app**

```bash
npm run dev
```

In two different browsers on the same machine (same IP): sign in as two different members and upvote the same `/community/<slug>` post. Both must succeed. Then upvote again as the same member — expect 409 "Already upvoted". Record the observed responses; a green unit test does not prove this.

- [ ] **Step 11: Commit**

```bash
npx tsc --noEmit && npm run lint
git add prisma/schema.prisma prisma/migrations "src/app/api/community/[slug]/upvote/route.ts" src/lib/showcase/voter-key.ts src/lib/showcase/__tests__/voter-key.test.ts
git commit -m "fix(community): key upvotes on user identity so shared NAT does not block voting"
```

---

## Task 6: Member comments publish without a queue

**Files:**
- Modify: `src/app/api/community/[slug]/comment/route.ts`
- Create: `src/lib/showcase/comment-status.ts`
- Create: `src/lib/showcase/__tests__/comment-status.test.ts`

**Interfaces:**
- Consumes: `getSessionUserId` from `@/lib/auth-helpers`.
- Produces: `resolveCommentStatus(author: { userId: string | null; emailVerified: boolean }): "APPROVED" | "PENDING"`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/showcase/__tests__/comment-status.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { resolveCommentStatus } from "@/lib/showcase/comment-status"

describe("resolveCommentStatus", () => {
  it("publishes a verified member's comment immediately", () => {
    expect(resolveCommentStatus({ userId: "u1", emailVerified: true })).toBe("APPROVED")
  })

  it("queues an unverified member's comment", () => {
    expect(resolveCommentStatus({ userId: "u1", emailVerified: false })).toBe("PENDING")
  })

  it("queues an anonymous comment", () => {
    expect(resolveCommentStatus({ userId: null, emailVerified: false })).toBe("PENDING")
  })

  it("queues an anonymous comment even if emailVerified is somehow true", () => {
    expect(resolveCommentStatus({ userId: null, emailVerified: true })).toBe("PENDING")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/showcase/__tests__/comment-status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/showcase/comment-status.ts`:

```typescript
import type { CommunityStatus } from "@/generated/prisma/client"

/**
 * Decide whether a new comment goes live or into the moderation queue.
 *
 * Pre-moderating every comment on a volunteer-run site means comments
 * effectively never publish — nobody approves fast enough for a conversation
 * to happen. A verified member has already cleared an email round-trip, which
 * is the bar that makes drive-by spam uneconomic.
 *
 * Both conditions are required: an anonymous request can present anything, so
 * emailVerified only counts when it belongs to a session user.
 */
export function resolveCommentStatus(author: {
  userId: string | null
  emailVerified: boolean
}): Extract<CommunityStatus, "APPROVED" | "PENDING"> {
  return author.userId && author.emailVerified ? "APPROVED" : "PENDING"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/showcase/__tests__/comment-status.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the comment route**

In `src/app/api/community/[slug]/comment/route.ts`, add imports:

```typescript
import { getSessionUserId } from "@/lib/auth-helpers"
import { resolveCommentStatus } from "@/lib/showcase/comment-status"
```

Replace the `prisma.communityComment.create` block and the response with:

```typescript
    // The verified flag is read from the database, never from the request —
    // the client has no say in whether its own comment skips moderation.
    const userId = await getSessionUserId()
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { emailVerified: true, firstName: true, lastName: true },
        })
      : null

    const status = resolveCommentStatus({
      userId,
      emailVerified: user?.emailVerified ?? false,
    })

    await prisma.communityComment.create({
      data: {
        submissionId: submission.id,
        userId,
        authorName: user ? `${user.firstName} ${user.lastName}`.trim() : data.authorName,
        content: data.content,
        status,
      },
    })

    return NextResponse.json(
      {
        success: true,
        published: status === "APPROVED",
        message:
          status === "APPROVED"
            ? "Comment posted."
            : "Your comment is pending approval.",
      },
      { status: 201 }
    )
```

- [ ] **Step 6: Verify against a running app**

```bash
npm run dev
```

Post a comment on a `/community/<slug>` page while signed in as a verified member — it must appear on reload with no admin action. Sign out, post anonymously — it must not appear, and must show up in `/admin/community`. Record both observations.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit && npm run lint
git add "src/app/api/community/[slug]/comment/route.ts" src/lib/showcase/comment-status.ts src/lib/showcase/__tests__/comment-status.test.ts
git commit -m "feat(community): publish verified members' comments without moderation"
```

---

## Task 7: Keep showcase posts out of `/community`

**Files:**
- Modify: `src/lib/data.ts:645` (`getCommunitySubmissions`)
- Create: `src/lib/showcase/ranking.ts`
- Create: `src/lib/showcase/queries.ts`

**Interfaces:**
- Consumes: `mapPrismaCommunitySubmission` and `CommunitySubmissionView` from `@/lib/data`.
- Produces:
  - `getShowcasePosts(opts): Promise<{ items: ShowcasePostView[]; total: number }>` where `opts` is `{ sort?: "hot" | "recent" | "popular" | "needs-help"; eventId?: string; need?: string; page?: number; limit?: number }`
  - `getShowcasePostBySlug(slug: string): Promise<ShowcasePostView | null>`
  - `type ShowcasePostView = CommunitySubmissionView & { coverImageUrl: string | null; media: MediaDescriptor[]; needs: NeedKey[]; builtWith: BuiltWith | null; eventName: string | null; eventSlug: string | null; reactionCounts: Record<string, number> }`

`getCommunitySubmissions` currently filters only on `status`, so without this change every showcase post would appear in the Community Hub.

- [ ] **Step 1: Exclude SHOWCASE from the community query**

In `src/lib/data.ts`, change the `where` inside `getCommunitySubmissions`:

```typescript
  const where = {
    status: "APPROVED" as const,
    // Showcase posts live at /showcase and share this table. Without an
    // explicit exclusion they would surface in the Community Hub, which is
    // scoped to reusable artefacts (MCPs, prompts, workflows, tools).
    ...(opts?.type
      ? { type: opts.type as PrismaCommunitySubmission["type"] }
      : { type: { not: "SHOWCASE" as const } }),
  }
```

Apply the same exclusion in `getCommunitySubmissionBySlug` by adding, after the existing `status` guard:

```typescript
  if (row.type === "SHOWCASE") return null
```

- [ ] **Step 2: Write the ranking module**

Create `src/lib/showcase/ranking.ts`:

```typescript
import { Prisma } from "@/generated/prisma/client"

export type ShowcaseSort = "hot" | "recent" | "popular" | "needs-help"

export function isShowcaseSort(value: string): value is ShowcaseSort {
  return ["hot", "recent", "popular", "needs-help"].includes(value)
}

/**
 * Hot score: upvotes decayed by how long the post has been quiet.
 *
 * Measured from lastActivityAt rather than createdAt, which is what makes the
 * build-log loop pay off in Phase 2 — posting a real update lifts the post
 * back up the feed instead of leaving it buried by age alone.
 *
 * The +1 keeps a brand-new zero-upvote post from scoring flat zero forever;
 * the +2 hours stops the first minutes after posting from dominating.
 * Exponent 1.5 is the usual Hacker News-ish decay: sharper than linear,
 * gentler than square.
 *
 * Expressed as raw SQL because Prisma cannot order by a computed expression.
 */
export const HOT_SCORE_SQL = Prisma.sql`
  ("upvoteCount" + 1) /
  POWER(EXTRACT(EPOCH FROM (NOW() - "lastActivityAt")) / 3600.0 + 2, 1.5)
`
```

- [ ] **Step 3: Write the query module**

Create `src/lib/showcase/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { HOT_SCORE_SQL, type ShowcaseSort } from "@/lib/showcase/ranking"
import type { MediaDescriptor } from "@/lib/showcase/media"
import type { NeedKey } from "@/lib/showcase/constants"

export interface BuiltWith {
  models: string[]
  skills: string[]
  mcps: string[]
  tokensPerRun?: number
}

export interface ShowcasePostView {
  id: string
  slug: string
  title: string
  shortDescription: string
  fullDescription: string
  url: string | null
  repoUrl: string | null
  tags: string[]
  authorName: string | null
  coverImageUrl: string | null
  media: MediaDescriptor[]
  needs: NeedKey[]
  builtWith: BuiltWith | null
  eventName: string | null
  eventSlug: string | null
  upvoteCount: number
  commentCount: number
  reactionCounts: Record<string, number>
  createdAt: string
  lastActivityAt: string
}

/** Json columns are `unknown` at the type level; narrow them once, here. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, number>
}

type Row = Prisma.CommunitySubmissionGetPayload<{
  include: {
    event: { select: { title: true; slug: true } }
    _count: { select: { comments: true } }
  }
}>

function mapRow(row: Row): ShowcasePostView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    fullDescription: row.fullDescription,
    url: row.url,
    repoUrl: row.repoUrl,
    tags: asArray<string>(row.tags),
    authorName: row.submitterName,
    coverImageUrl: row.coverImageUrl,
    media: asArray<MediaDescriptor>(row.media),
    needs: asArray<NeedKey>(row.needs),
    builtWith: (row.builtWith as BuiltWith | null) ?? null,
    eventName: row.event?.title ?? null,
    eventSlug: row.event?.slug ?? null,
    upvoteCount: row.upvoteCount,
    commentCount: row._count.comments,
    reactionCounts: asCounts(row.reactionCounts),
    createdAt: row.createdAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
  }
}

export async function getShowcasePosts(opts?: {
  sort?: ShowcaseSort
  eventId?: string
  need?: string
  page?: number
  limit?: number
}): Promise<{ items: ShowcasePostView[]; total: number }> {
  const page = opts?.page ?? 1
  const limit = opts?.limit ?? 20
  const skip = (page - 1) * limit
  const sort = opts?.sort ?? "hot"

  const where: Prisma.CommunitySubmissionWhereInput = {
    type: "SHOWCASE",
    status: "APPROVED",
    ...(opts?.eventId ? { eventId: opts.eventId } : {}),
    ...(opts?.need ? { needs: { array_contains: [opts.need] } } : {}),
    ...(sort === "needs-help" ? { NOT: { needs: Prisma.DbNull } } : {}),
  }

  const include = {
    event: { select: { title: true, slug: true } },
    _count: { select: { comments: { where: { status: "APPROVED" as const } } } },
  }

  // "hot" needs an expression sort, which Prisma's orderBy cannot express, so
  // it resolves ids in raw SQL first and then hydrates through the normal
  // client — keeping one mapping path rather than hand-rolling row parsing.
  if (sort === "hot") {
    const eventFilter = opts?.eventId
      ? Prisma.sql`AND "eventId" = ${opts.eventId}`
      : Prisma.empty

    const ranked = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM community_submissions
      WHERE type = 'SHOWCASE' AND status = 'APPROVED' ${eventFilter}
      ORDER BY ${HOT_SCORE_SQL} DESC
      LIMIT ${limit} OFFSET ${skip}
    `)

    const ids = ranked.map(r => r.id)
    if (ids.length === 0) {
      return { items: [], total: await prisma.communitySubmission.count({ where }) }
    }

    const [rows, total] = await Promise.all([
      prisma.communitySubmission.findMany({ where: { id: { in: ids } }, include }),
      prisma.communitySubmission.count({ where }),
    ])

    // findMany does not honour the `in` ordering, so restore the ranked order.
    const byId = new Map(rows.map(r => [r.id, r]))
    const items = ids
      .map(id => byId.get(id))
      .filter((r): r is Row => Boolean(r))
      .map(mapRow)

    return { items, total }
  }

  const orderBy: Prisma.CommunitySubmissionOrderByWithRelationInput =
    sort === "popular" ? { upvoteCount: "desc" } : { createdAt: "desc" }

  const [rows, total] = await Promise.all([
    prisma.communitySubmission.findMany({ where, orderBy, skip, take: limit, include }),
    prisma.communitySubmission.count({ where }),
  ])

  return { items: rows.map(mapRow), total }
}

export async function getShowcasePostBySlug(slug: string): Promise<ShowcasePostView | null> {
  const row = await prisma.communitySubmission.findUnique({
    where: { slug },
    include: {
      event: { select: { title: true, slug: true } },
      _count: { select: { comments: { where: { status: "APPROVED" } } } },
    },
  })
  if (!row || row.status !== "APPROVED" || row.type !== "SHOWCASE") return null
  return mapRow(row)
}
```

- [ ] **Step 4: Verify the exclusion holds against real data**

```bash
npm run dev
```

Using Prisma Studio (`npm run db:studio`), set one existing approved submission's `type` to `SHOWCASE`. Load `/community` — it must no longer appear. Load `/community/<that-slug>` — it must 404. Set it back afterwards.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/data.ts src/lib/showcase/ranking.ts src/lib/showcase/queries.ts
git commit -m "feat(showcase): add showcase queries and exclude showcase posts from community hub"
```

---

## Task 8: Media upload — presign and finalize

**Files:**
- Create: `src/app/api/showcase/media/presign/route.ts`
- Create: `src/app/api/showcase/media/finalize/route.ts`

**Interfaces:**
- Consumes: `sniffMediaKind`, `extensionForKind`, `validateMediaSize`, `MediaDescriptor` (Task 3); `MAX_MEDIA_PER_POST` (Task 2); `r2Client`, `r2Bucket`, `publicUrl` from `@/lib/gallery/r2`.
- Produces:
  - `POST /api/showcase/media/presign` → `{ success: true, data: { uploads: Array<{ uploadId: string; uploadUrl: string; key: string }> } }`
  - `POST /api/showcase/media/finalize` → `{ success: true, data: { media: MediaDescriptor } }`

Unlike the admin photo route, no database row is created at presign time — a showcase post does not exist yet when its cover image uploads. Orphans are handled by the `showcase/pending/` key prefix, which a later cleanup script can sweep by age.

> **Deviation from the spec, deliberate.** The spec specifies keys as
> `showcase/<submissionId>/<cuid>.<ext>`. That layout cannot work: media is
> uploaded *before* the post is created, so no `submissionId` exists yet at
> presign time. The admin photo route sidesteps this by creating its row first,
> which is available to it because a photo belongs to an already-existing event.
> Keys are therefore `showcase/pending/<userId>/<uuid>` instead. This keeps the
> spec's actual intent — a prefix scan finds orphans — and adds a second
> property the spec's layout lacked: the prefix encodes the owner, which is what
> lets finalize refuse a key belonging to another member.

- [ ] **Step 1: Write the presign route**

Create `src/app/api/showcase/media/presign/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { r2Bucket, r2Client } from "@/lib/gallery/r2"
import { MAX_DEMO_BYTES, MAX_MEDIA_PER_POST } from "@/lib/showcase/constants"

/**
 * POST /api/showcase/media/presign — mint direct-to-R2 upload URLs for a member.
 *
 * Modelled on /api/admin/photos/presign, with two deliberate differences.
 * Authorisation is "verified member" rather than an admin permission, and no
 * database row is created up front: a showcase post does not exist yet when
 * its cover image is being uploaded, so the key lands under a pending prefix
 * and is only claimed when the post is created.
 *
 * The declared size and content type here only gate the signature. What the
 * file actually IS gets decided from its bytes in finalize.
 */

const URL_TTL_SECONDS = 900

const bodySchema = z.object({
  files: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        contentType: z.string().max(100),
        size: z.number().int().positive().max(MAX_DEMO_BYTES),
      }),
    )
    .min(1)
    .max(MAX_MEDIA_PER_POST),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.FORM)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many uploads. Please try again shortly." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Sign in to upload media." },
      { status: 401 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, active: true },
  })
  if (!user?.active || !user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "Verify your email address to upload media." },
      { status: 403 },
    )
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid request" : "Invalid JSON body"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }

  const client = r2Client()
  const Bucket = r2Bucket()

  const uploads = await Promise.all(
    parsed.files.map(async (file) => {
      const uploadId = randomUUID()
      // Pending prefix: an object whose post is never created stays sweepable
      // by age without touching anything a live post references.
      const key = `showcase/pending/${userId}/${uploadId}`

      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket, Key: key, ContentType: file.contentType }),
        { expiresIn: URL_TTL_SECONDS },
      )

      return { uploadId, uploadUrl, key }
    }),
  )

  return NextResponse.json({ success: true, data: { uploads } }, { status: 201 })
}
```

- [ ] **Step 2: Write the finalize route**

Create `src/app/api/showcase/media/finalize/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { z } from "zod"
import sharp from "sharp"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { publicUrl, r2Bucket, r2Client } from "@/lib/gallery/r2"
import { sniffMediaKind, validateMediaSize, type MediaDescriptor } from "@/lib/showcase/media"

/**
 * POST /api/showcase/media/finalize — decide what an uploaded object actually is.
 *
 * The browser told us a content type at presign time and we signed against it,
 * but that claim is attacker-controlled. Here the first bytes of the stored
 * object decide the kind, the size is re-checked against the real object, and
 * only then does a media descriptor come back that the post can reference.
 *
 * Images are re-encoded through sharp, which both strips EXIF (location data
 * in a phone screenshot is a real leak) and gives us true dimensions.
 */

/** Enough to cover every signature we check, and cheap to pull. */
const SNIFF_BYTES = 64

const bodySchema = z.object({
  key: z.string().min(1).max(300),
  alt: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.FORM)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many uploads. Please try again shortly." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to upload media." }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, active: true },
  })
  if (!user?.active || !user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "Verify your email address to upload media." },
      { status: 403 },
    )
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  // A member may only finalize keys under their own pending prefix. Without
  // this, a signed-in user could point finalize at anyone else's object.
  if (!parsed.key.startsWith(`showcase/pending/${userId}/`)) {
    return NextResponse.json({ success: false, error: "Unknown upload" }, { status: 403 })
  }

  try {
    const client = r2Client()
    const Bucket = r2Bucket()

    const head = await client.send(
      new GetObjectCommand({ Bucket, Key: parsed.key, Range: `bytes=0-${SNIFF_BYTES - 1}` }),
    )
    const headBytes = new Uint8Array(await head.Body!.transformToByteArray())

    const kind = sniffMediaKind(headBytes)
    if (!kind) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type. Use JPG, PNG, WEBP, GIF or MP4." },
        { status: 400 },
      )
    }

    // ContentLength on the ranged GET is the range, not the object, so read
    // the real size off the same response's content-range total.
    const total = Number(head.ContentRange?.split("/")[1] ?? 0)
    const sizeCheck = validateMediaSize(kind, total)
    if (!sizeCheck.ok) {
      return NextResponse.json({ success: false, error: sizeCheck.error }, { status: 400 })
    }

    let width = 0
    let height = 0

    if (kind === "image") {
      const full = await client.send(new GetObjectCommand({ Bucket, Key: parsed.key }))
      const buffer = Buffer.from(await full.Body!.transformToByteArray())
      const meta = await sharp(buffer).metadata()
      width = meta.width ?? 0
      height = meta.height ?? 0
    }

    const media: MediaDescriptor = {
      key: parsed.key,
      url: publicUrl(parsed.key),
      width,
      height,
      kind,
      alt: parsed.alt,
    }

    return NextResponse.json({ success: true, data: { media } }, { status: 200 })
  } catch (error) {
    console.error("[SHOWCASE] Failed to finalize media:", error)
    return NextResponse.json(
      { success: false, error: "Could not process that upload. Please try again." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 3: Verify the reject paths against a running app**

```bash
npm run dev
```

With a signed-in verified member, use the browser console on any page to run these three checks and record each response:

```javascript
// 1. Presign should refuse when signed out (run in a private window):
await fetch('/api/showcase/media/presign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ files: [{ fileName: 'a.png', contentType: 'image/png', size: 1000 }] })
}).then(r => r.status)
// Expected: 401

// 2. Finalize must refuse a key outside your own prefix:
await fetch('/api/showcase/media/finalize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'showcase/pending/someone-else/abc' })
}).then(r => r.status)
// Expected: 403
```

3. Upload a `.txt` file renamed to `.png` through a presigned URL, then finalize it. Expected: 400 "Unsupported file type" — this is the magic-byte check doing its job.

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/showcase/media
git commit -m "feat(showcase): add member-scoped R2 media presign and byte-verified finalize"
```

---

## Task 9: Create a showcase post

**Files:**
- Create: `src/app/api/showcase/route.ts`

**Interfaces:**
- Consumes: `isNeedKey`, `MAX_MEDIA_PER_POST` (Task 2); `MediaDescriptor` (Task 3); `getSessionUserId`.
- Produces: `POST /api/showcase` → `{ success: true, data: { slug: string } }`, status 201.

Showcase posts from verified members publish as `APPROVED` immediately — the same bar as comments. The moderation queue stays for reports.

- [ ] **Step 1: Write the route**

Create `src/app/api/showcase/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import {
  zodSanitizeString,
  zodSanitizeMultilineText,
  zodSanitizeUrl,
  containsPromptInjection,
} from "@/lib/input-sanitization"
import { toSlug } from "@/lib/utils"
import { isNeedKey, MAX_MEDIA_PER_POST } from "@/lib/showcase/constants"

/**
 * POST /api/showcase — publish a showcase post.
 *
 * Verified members publish straight to APPROVED, matching the comment rule:
 * an email round-trip is the bar, and a queue nobody drains is the same as no
 * showcase at all. Reports are the backstop, not pre-moderation.
 */

const mediaSchema = z.object({
  key: z.string().min(1).max(300),
  url: z.string().url(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  kind: z.enum(["image", "gif", "mp4"]),
  posterUrl: z.string().url().optional(),
  alt: z.string().max(500).optional(),
})

const bodySchema = z.object({
  title: z.string().min(5).max(150).transform(zodSanitizeString),
  shortDescription: z.string().min(20).max(300).transform(zodSanitizeString),
  fullDescription: z.string().min(50).max(5000).transform(zodSanitizeMultilineText(5000)),
  url: z.string().url().optional().transform(v => (v ? zodSanitizeUrl(v) : undefined)),
  repoUrl: z.string().url().optional().transform(v => (v ? zodSanitizeUrl(v) : undefined)),
  tags: z.array(z.string().max(30).transform(zodSanitizeString)).max(10).default([]),
  coverImageUrl: z.string().url().optional(),
  media: z.array(mediaSchema).max(MAX_MEDIA_PER_POST).default([]),
  eventId: z.string().optional(),
  needs: z.array(z.string()).max(10).default([]).refine(
    values => values.every(isNeedKey),
    { message: "Unknown need" },
  ),
  builtWith: z
    .object({
      models: z.array(z.string().max(60).transform(zodSanitizeString)).max(10).default([]),
      skills: z.array(z.string().max(60).transform(zodSanitizeString)).max(20).default([]),
      mcps: z.array(z.string().max(60).transform(zodSanitizeString)).max(20).default([]),
      tokensPerRun: z.number().int().positive().max(100_000_000).optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.COMMUNITY_SUBMIT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many posts today. Please try again tomorrow." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Sign in to post to the showcase." },
      { status: 401 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, active: true, firstName: true, lastName: true },
  })
  if (!user?.active || !user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "Verify your email address to post to the showcase." },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = bodySchema.safeParse(body)
  if (!validation.success) {
    const details: Record<string, string> = {}
    for (const issue of validation.error.issues) {
      const key = issue.path[0]
      if (key && !details[String(key)]) details[String(key)] = issue.message
    }
    return NextResponse.json(
      { success: false, error: "Validation failed", details },
      { status: 400 },
    )
  }

  const data = validation.data
  const slug = toSlug(data.title) + "-" + Date.now().toString(36)

  if (containsPromptInjection([data.title, data.shortDescription, data.fullDescription].join(" "))) {
    console.warn("[SHOWCASE] Potential prompt injection detected in post:", slug)
  }

  // An unknown eventId is a client bug, and silently dropping it would lose
  // the provenance the post was written to claim.
  if (data.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true },
    })
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: { eventId: "Unknown event" } },
        { status: 400 },
      )
    }
  }

  try {
    await prisma.communitySubmission.create({
      data: {
        userId,
        type: "SHOWCASE",
        title: data.title,
        slug,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        url: data.url,
        repoUrl: data.repoUrl,
        tags: data.tags,
        coverImageUrl: data.coverImageUrl,
        media: data.media,
        eventId: data.eventId,
        needs: data.needs,
        builtWith: data.builtWith ?? undefined,
        submitterName: `${user.firstName} ${user.lastName}`.trim(),
        status: "APPROVED",
        lastActivityAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: { slug } }, { status: 201 })
  } catch (error) {
    console.error("[SHOWCASE] Failed to create post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to publish. Please try again." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Verify against a running app**

```bash
npm run dev
```

Signed in as a verified member, from the browser console:

```javascript
await fetch('/api/showcase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test showcase post',
    shortDescription: 'A short description that clears the twenty character minimum.',
    fullDescription: 'A full description that comfortably clears the fifty character minimum for this field.',
    needs: ['testers'],
    tags: ['test'],
  })
}).then(r => r.json())
// Expected: { success: true, data: { slug: "test-showcase-post-..." } }
```

Then confirm the rejects: `needs: ['pizza']` returns 400 "Unknown need"; the same call in a signed-out private window returns 401.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/showcase/route.ts
git commit -m "feat(showcase): add showcase post creation endpoint"
```

---

## Task 10: Reactions

**Files:**
- Create: `src/app/api/showcase/[slug]/react/route.ts`

**Interfaces:**
- Consumes: `isReactionEmoji`, `REACTION_EMOJI` (Task 2).
- Produces: `POST /api/showcase/[slug]/react` with body `{ emoji: string }` → `{ success: true, data: { reactionCounts: Record<string, number>, mine: string[] } }`. Toggles.

- [ ] **Step 1: Write the route**

Create `src/app/api/showcase/[slug]/react/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { isReactionEmoji, REACTION_EMOJI } from "@/lib/showcase/constants"

/**
 * POST /api/showcase/[slug]/react — toggle one reaction.
 *
 * Members only, keyed on userId: unlike upvotes there is no anonymous path, so
 * no voterKey scheme is needed here.
 *
 * Counts are recomputed from rows inside the same transaction rather than
 * incremented, so a denormalised count can never drift from the rows it
 * summarises — a groupBy over one post's reactions is cheap.
 */

const bodySchema = z.object({
  emoji: z.string().max(16).refine(isReactionEmoji, {
    message: `Emoji must be one of ${REACTION_EMOJI.join(" ")}`,
  }),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.COMMUNITY_UPVOTE)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many reactions. Please slow down." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to react." }, { status: 401 })
  }

  const { slug } = await params

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid request" : "Invalid JSON body"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }

  try {
    const submission = await prisma.communitySubmission.findUnique({
      where: { slug },
      select: { id: true, status: true, type: true },
    })

    if (!submission || submission.status !== "APPROVED" || submission.type !== "SHOWCASE") {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.showcaseReaction.findUnique({
        where: {
          submissionId_userId_emoji: {
            submissionId: submission.id,
            userId,
            emoji: parsed.emoji,
          },
        },
        select: { id: true },
      })

      if (existing) {
        await tx.showcaseReaction.delete({ where: { id: existing.id } })
      } else {
        await tx.showcaseReaction.create({
          data: { submissionId: submission.id, userId, emoji: parsed.emoji },
        })
      }

      const grouped = await tx.showcaseReaction.groupBy({
        by: ["emoji"],
        where: { submissionId: submission.id },
        _count: { emoji: true },
      })

      const reactionCounts: Record<string, number> = {}
      for (const row of grouped) {
        reactionCounts[row.emoji] = row._count.emoji
      }

      await tx.communitySubmission.update({
        where: { id: submission.id },
        data: { reactionCounts },
      })

      const mine = await tx.showcaseReaction.findMany({
        where: { submissionId: submission.id, userId },
        select: { emoji: true },
      })

      return { reactionCounts, mine: mine.map(m => m.emoji) }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[SHOWCASE] Failed to toggle reaction:", error)
    return NextResponse.json(
      { success: false, error: "Failed to react. Please try again." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Verify toggle behaviour against a running app**

```bash
npm run dev
```

Against the slug created in Task 9, signed in:

```javascript
const react = () => fetch('/api/showcase/<slug>/react', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emoji: '🔥' })
}).then(r => r.json())

await react()  // Expected: reactionCounts { "🔥": 1 }, mine ["🔥"]
await react()  // Expected: reactionCounts {} (or 🔥 absent), mine []
```

Also confirm `{ emoji: '🍕' }` returns 400.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit && npm run lint
git add "src/app/api/showcase/[slug]/react/route.ts"
git commit -m "feat(showcase): add toggleable emoji reactions"
```

---

## Task 11: Content reports

**Files:**
- Create: `src/app/api/reports/route.ts`

**Interfaces:**
- Consumes: `getSessionUserId`.
- Produces: `POST /api/reports` with body `{ targetType, targetId, reason, detail? }` → 201.

Anonymous users may report — the whole point is that anyone who sees something bad can flag it. Rate limiting carries the abuse weight.

- [ ] **Step 1: Write the route**

Create `src/app/api/reports/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { ReportReason, ReportTarget } from "@/generated/prisma/client"

/**
 * POST /api/reports — flag a submission, comment or update for a moderator.
 *
 * Open to anonymous users on purpose: reporting is the backstop that replaced
 * pre-moderation, and requiring a login to flag abuse would blunt it. The IP
 * is hashed rather than stored so a repeat reporter is recognisable without
 * the table holding raw addresses.
 */

const REPORT_SALT = process.env.UPVOTE_SALT ?? "cck-dev-salt"

const bodySchema = z.object({
  targetType: z.nativeEnum(ReportTarget),
  targetId: z.string().min(1).max(60),
  reason: z.nativeEnum(ReportReason),
  detail: z.string().max(1000).optional().transform(v => (v ? zodSanitizeMultilineText(1000)(v) : undefined)),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.STRICT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many reports. Please try again later." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  try {
    await prisma.contentReport.create({
      data: {
        targetType: parsed.targetType,
        targetId: parsed.targetId,
        reason: parsed.reason,
        detail: parsed.detail,
        reporterId: await getSessionUserId(),
        reporterIp: createHash("sha256").update(ip + ":" + REPORT_SALT).digest("hex"),
      },
    })

    return NextResponse.json(
      { success: true, message: "Thanks — a moderator will take a look." },
      { status: 201 },
    )
  } catch (error) {
    console.error("[REPORTS] Failed to create report:", error)
    return NextResponse.json(
      { success: false, error: "Could not file that report. Please try again." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Verify against a running app**

```bash
npm run dev
```

```javascript
await fetch('/api/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ targetType: 'SUBMISSION', targetId: '<id>', reason: 'SPAM' })
}).then(r => r.json())
// Expected: 201 { success: true }
```

Confirm the row exists via `npm run db:studio` → `content_reports`, and that `reporterIp` is a hash, not an address.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/reports/route.ts
git commit -m "feat(moderation): add content report endpoint"
```

---

## Task 12: Tenor GIF proxy

**Files:**
- Create: `src/app/api/showcase/gifs/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `TENOR_API_KEY` env var.
- Produces: `GET /api/showcase/gifs?q=<query>` → `{ success: true, data: { results: Array<{ id: string; url: string; previewUrl: string; width: number; height: number; description: string }> } }`

The key stays server-side. A client-side Tenor call would ship the key to every visitor.

- [ ] **Step 1: Add the env var to `.env.example`**

```bash
# Tenor (GIF picker on the community showcase).
# Get a key at https://developers.google.com/tenor/guides/quickstart
# Requests are always sent with contentfilter=high.
TENOR_API_KEY=
```

- [ ] **Step 2: Write the route**

Create `src/app/api/showcase/gifs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"

/**
 * GET /api/showcase/gifs — proxy Tenor search.
 *
 * Server-side so the API key never reaches a browser. contentfilter=high is
 * hard-coded rather than passed through: it is a safety floor for a public
 * community surface, not a caller preference.
 */

const TENOR_ENDPOINT = "https://tenor.googleapis.com/v2/search"
const RESULT_LIMIT = 24

interface TenorMediaFormat {
  url: string
  dims: [number, number]
}

interface TenorResult {
  id: string
  content_description: string
  media_formats: Record<string, TenorMediaFormat | undefined>
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimits.READ)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many searches. Please slow down." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  // Members only: an open proxy would let anyone burn the key's quota.
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to search GIFs." }, { status: 401 })
  }

  const apiKey = process.env.TENOR_API_KEY?.trim()
  if (!apiKey) {
    console.error("[SHOWCASE] TENOR_API_KEY is not set — GIF picker disabled")
    return NextResponse.json(
      { success: false, error: "GIF search is unavailable right now." },
      { status: 503 },
    )
  }

  const query = request.nextUrl.searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json({ success: false, error: "Missing search term" }, { status: 400 })
  }

  const url = new URL(TENOR_ENDPOINT)
  url.searchParams.set("q", query.slice(0, 100))
  url.searchParams.set("key", apiKey)
  url.searchParams.set("limit", String(RESULT_LIMIT))
  url.searchParams.set("contentfilter", "high")
  url.searchParams.set("media_filter", "gif,tinygif")

  try {
    const response = await fetch(url, { next: { revalidate: 300 } })
    if (!response.ok) {
      console.error("[SHOWCASE] Tenor search failed:", response.status)
      return NextResponse.json(
        { success: false, error: "GIF search is unavailable right now." },
        { status: 502 },
      )
    }

    const payload = (await response.json()) as { results?: TenorResult[] }

    const results = (payload.results ?? []).flatMap((item) => {
      const gif = item.media_formats.gif
      const preview = item.media_formats.tinygif ?? gif
      if (!gif || !preview) return []
      return [{
        id: item.id,
        url: gif.url,
        previewUrl: preview.url,
        width: gif.dims[0],
        height: gif.dims[1],
        description: item.content_description,
      }]
    })

    return NextResponse.json({ success: true, data: { results } })
  } catch (error) {
    console.error("[SHOWCASE] Tenor request threw:", error)
    return NextResponse.json(
      { success: false, error: "GIF search is unavailable right now." },
      { status: 502 },
    )
  }
}
```

- [ ] **Step 3: Verify against a running app**

Set `TENOR_API_KEY` in `.env.local`, then signed in:

```javascript
await fetch('/api/showcase/gifs?q=it%20works').then(r => r.json())
// Expected: success true, results array with url/previewUrl/dims
```

Also confirm: signed out returns 401; unsetting the key returns 503, not a crash.

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/showcase/gifs/route.ts .env.example
git commit -m "feat(showcase): proxy Tenor GIF search server-side"
```

---

## Task 13: Showcase feed and detail pages

**Files:**
- Create: `src/app/showcase/page.tsx`
- Create: `src/app/showcase/[slug]/page.tsx`
- Create: `src/components/karibu/showcase/ShowcaseFeed.tsx`
- Create: `src/components/karibu/showcase/ShowcaseCard.tsx`
- Create: `src/components/karibu/showcase/ShowcaseDetail.tsx`
- Create: `src/components/karibu/showcase/ReactionRow.tsx`
- Create: `src/components/karibu/showcase/NeedsChips.tsx`
- Create: `src/components/karibu/showcase/BuiltWithPanel.tsx`
- Create: `src/components/karibu/showcase/MediaGallery.tsx`
- Create: `src/components/karibu/showcase/ReportButton.tsx`

**Interfaces:**
- Consumes: `getShowcasePosts`, `getShowcasePostBySlug`, `ShowcasePostView` (Task 7); `NEED_LABELS`, `REACTION_EMOJI` (Task 2); the react and report endpoints (Tasks 10, 11).
- Produces: the public `/showcase` and `/showcase/[slug]` routes.

Follow the existing `/community` pages as the structural model: a server page that resolves `searchParams` and delegates to a Karibu component. Read `src/app/community/page.tsx` and `src/components/karibu/KaribuCommunity.tsx` before starting, and match their conventions rather than inventing new ones.

**Design constraints for every component in this task:**
- Karibu tokens only: `bg-paper`, `bg-paper-card`, `text-ink`, `text-ink-soft`, `text-ink-muted`, `border-sand`, `text-clay`.
- Any dark panel uses `bg-[--panel-dark]` with `text-[--on-panel-dark]`. Never `bg-ink`.
- Media containers get `overflow-hidden` and an explicit aspect ratio so the feed does not reflow as images load.
- MP4 renders as `<video muted loop playsInline preload="metadata">` with a poster; it autoplays only when `prefers-reduced-motion` is not set.
- Every interactive element is keyboard-reachable with a visible `focus-visible` ring.

- [ ] **Step 1: Build the feed page**

Create `src/app/showcase/page.tsx`:

```typescript
import type { Metadata } from "next"
import { getShowcasePosts } from "@/lib/showcase/queries"
import { isShowcaseSort } from "@/lib/showcase/ranking"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { ShowcaseFeed } from "@/components/karibu/showcase/ShowcaseFeed"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Showcase | Claude Community Kenya",
  description:
    "What the Claude Community Kenya is building — projects, demos and works in progress from members across the country.",
  alternates: { canonical: "https://www.claudekenya.org/showcase" },
  openGraph: {
    title: "Showcase | Claude Community Kenya",
    description: "What the Claude Community Kenya is building.",
    url: "https://www.claudekenya.org/showcase",
    siteName: "Claude Community Kenya",
    type: "website",
  },
}

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawSort = typeof params.sort === "string" ? params.sort : "hot"
  const sort = isShowcaseSort(rawSort) ? rawSort : "hot"
  const eventId = typeof params.event === "string" ? params.event : undefined
  const need = typeof params.need === "string" ? params.need : undefined

  const { items, total } = await getShowcasePosts({ sort, eventId, need }).catch(() => ({
    items: [],
    total: 0,
  }))

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Showcase" }]} />
      <ShowcaseFeed
        items={items}
        total={total}
        activeSort={sort}
        activeEvent={eventId}
        activeNeed={need}
      />
    </>
  )
}
```

- [ ] **Step 2: Build the detail page**

Create `src/app/showcase/[slug]/page.tsx`:

```typescript
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getShowcasePostBySlug } from "@/lib/showcase/queries"
import { getCommunityCommentsBySlug } from "@/lib/data"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { ShowcaseDetail } from "@/components/karibu/showcase/ShowcaseDetail"

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getShowcasePostBySlug(slug)
  if (!post) return { title: "Not found | Claude Community Kenya" }

  return {
    title: `${post.title} | Showcase | Claude Community Kenya`,
    description: post.shortDescription,
    alternates: { canonical: `https://www.claudekenya.org/showcase/${slug}` },
    openGraph: {
      title: post.title,
      description: post.shortDescription,
      url: `https://www.claudekenya.org/showcase/${slug}`,
      type: "article",
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl }] } : {}),
    },
  }
}

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getShowcasePostBySlug(slug)
  if (!post) notFound()

  const comments = await getCommunityCommentsBySlug(slug).catch(() => [])

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Showcase", url: "/showcase" },
          { name: post.title },
        ]}
      />
      <ShowcaseDetail post={post} comments={comments} />
    </>
  )
}
```

- [ ] **Step 3: Build `ReactionRow`**

Create `src/components/karibu/showcase/ReactionRow.tsx`:

```typescript
"use client"

import { useState } from "react"
import { REACTION_EMOJI } from "@/lib/showcase/constants"
import { cn } from "@/lib/utils"

interface ReactionRowProps {
  slug: string
  initialCounts: Record<string, number>
  initialMine: string[]
  signedIn: boolean
}

/**
 * The five-emoji reaction row.
 *
 * Optimistic: the count moves the moment you click, and rolls back if the
 * request fails. A reaction that lags a round-trip feels broken even when it
 * works.
 */
export function ReactionRow({ slug, initialCounts, initialMine, signedIn }: ReactionRowProps) {
  const [counts, setCounts] = useState(initialCounts)
  const [mine, setMine] = useState<string[]>(initialMine)
  const [pending, setPending] = useState<string | null>(null)

  async function toggle(emoji: string) {
    if (!signedIn || pending) return

    const had = mine.includes(emoji)
    const previousCounts = counts
    const previousMine = mine

    setPending(emoji)
    setCounts({ ...counts, [emoji]: Math.max(0, (counts[emoji] ?? 0) + (had ? -1 : 1)) })
    setMine(had ? mine.filter(e => e !== emoji) : [...mine, emoji])

    try {
      const response = await fetch(`/api/showcase/${slug}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Failed")
      setCounts(payload.data.reactionCounts)
      setMine(payload.data.mine)
    } catch {
      setCounts(previousCounts)
      setMine(previousMine)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Reactions">
      {REACTION_EMOJI.map((emoji) => {
        const count = counts[emoji] ?? 0
        const isMine = mine.includes(emoji)
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={!signedIn}
            aria-pressed={isMine}
            aria-label={`${emoji} reaction, ${count} so far`}
            title={signedIn ? undefined : "Sign in to react"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
              "transition-colors focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-clay focus-visible:ring-offset-2",
              isMine
                ? "border-clay bg-clay/10 text-clay"
                : "border-sand bg-paper-card text-ink-soft hover:border-clay/50",
              !signedIn && "cursor-not-allowed opacity-60",
            )}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="tabular-nums">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Build the remaining presentational components**

`NeedsChips.tsx` maps `needs` through `NEED_LABELS` into filter links pointing at `/showcase?need=<key>`. `BuiltWithPanel.tsx` renders the models / skills / MCPs lists and the optional `tokensPerRun`, omitting any empty group entirely rather than showing an empty heading. `MediaGallery.tsx` renders the `media` array — images as `next/image` with width and height from the descriptor, gif and mp4 in a fixed-aspect container. `ReportButton.tsx` opens a small reason menu and POSTs to `/api/reports`.

`ShowcaseCard.tsx` composes: cover image, title, short description, event provenance line when `eventName` is set, needs chips, upvote count, comment count, and a compact reaction summary. `ShowcaseFeed.tsx` renders the sort tabs (`hot` / `recent` / `popular` / `needs-help`), the active filter chips, and the card grid, with an explicit empty state. `ShowcaseDetail.tsx` composes the full post plus `MediaGallery`, `BuiltWithPanel`, `ReactionRow`, the existing `CommentForm` and `CommentList` from `src/components/community/`, and `ReportButton`.

- [ ] **Step 5: Verify in a browser at three widths**

```bash
npm run dev
```

Load `/showcase` at 375px, 768px and 1440px. Check each: no horizontal scroll on the body; cards do not reflow as images load; every sort tab changes the order; the empty state renders when a filter matches nothing. Then load a post detail page and tab through it with the keyboard — every reaction button, link and the report control must take a visible focus ring in order.

- [ ] **Step 6: Verify both themes**

Toggle the OS between light and dark and reload `/showcase`. Confirm no element becomes low-contrast, and specifically that no dark panel is using `bg-ink`. Run the browser devtools contrast check on the card title, the muted metadata line, and the reaction pill — all must be at least 4.5:1.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/showcase src/components/karibu/showcase
git commit -m "feat(showcase): add public showcase feed and detail pages"
```

---

## Task 14: The composer

**Files:**
- Create: `src/app/showcase/submit/page.tsx`
- Create: `src/app/showcase/submit/layout.tsx`
- Create: `src/components/karibu/showcase/ShowcaseComposer.tsx`
- Create: `src/components/karibu/showcase/MediaUploader.tsx`
- Create: `src/components/karibu/showcase/GifPicker.tsx`
- Create: `src/components/karibu/showcase/EmojiPicker.tsx`

**Interfaces:**
- Consumes: `/api/showcase` (Task 9), `/api/showcase/media/presign` and `/finalize` (Task 8), `/api/showcase/gifs` (Task 12), `NEEDS_OPTIONS` / `NEED_LABELS` (Task 2).
- Produces: the `/showcase/submit` route.

Read `src/app/community/submit/page.tsx` first and match its form conventions, CSRF handling and error display rather than inventing a second pattern.

- [ ] **Step 1: Build `MediaUploader`**

Three-step client flow per file, which must be implemented in this order:

1. POST the file list to `/api/showcase/media/presign`, receiving `{ uploadId, uploadUrl, key }` per file.
2. `PUT` each file directly to its `uploadUrl` with the matching `Content-Type` header. Show per-file progress; a failed PUT removes just that file, not the batch.
3. POST each `key` to `/api/showcase/media/finalize` and keep the returned `MediaDescriptor` in form state.

Client-side pre-checks (count ≤ 5, size against the limits) are a courtesy that avoids a wasted round trip. They are not the enforcement — the server re-checks everything, and the client checks must never be the only guard.

- [ ] **Step 2: Build `EmojiPicker`**

A small popover listing common emoji grouped by category, inserting the character at the textarea's cursor position. No dependency needed — a static array of characters is enough, and it avoids shipping a picker library for this. Must be keyboard-navigable with arrow keys and dismissable with Escape.

- [ ] **Step 3: Build `GifPicker`**

A search box that debounces at 400ms and calls `/api/showcase/gifs?q=`. Renders `previewUrl` thumbnails in a grid; selecting one appends a `MediaDescriptor` with `kind: "gif"`, the Tenor `url`, and its dimensions. The Tenor attribution badge must be visible in the picker whenever results are shown — this is a condition of their terms, not a nicety. Handle the 503 (key missing) and 502 (Tenor down) cases with a plain message; the composer must stay usable with the GIF picker unavailable.

- [ ] **Step 4: Build `ShowcaseComposer`**

Fields: title, short description, full description (with `EmojiPicker` and `GifPicker` attached), tags, project URL, repo URL, cover image, media, linked event (a select populated from upcoming and past events), `needs` (multi-select chips from `NEEDS_OPTIONS`), and `builtWith` (three tag inputs plus an optional numeric tokens field).

On submit, POST to `/api/showcase` and redirect to `/showcase/<slug>` on success. Field-level errors come back in `details` — render them against the right inputs, matching how `community/submit` does it.

Signed-out visitors get a sign-in prompt rather than the form. Signed-in but unverified members get a "verify your email" state with a resend link.

- [ ] **Step 5: Verify the whole flow end to end**

```bash
npm run dev
```

Signed in as a verified member, publish a real post through the UI: a cover image, one screenshot, one MP4 demo, a linked event, two needs, and `builtWith` filled in. It must land on `/showcase/<slug>` with everything rendered. Then confirm each guard by trying it: six files (blocked), a 20MB mp4 (blocked), a `.txt` renamed to `.png` (blocked at finalize with a readable message).

- [ ] **Step 6: Verify the signed-out and unverified states**

In a private window, load `/showcase/submit` — expect the sign-in prompt, not the form. Then, with a member whose `emailVerified` is false (set it in Prisma Studio), expect the verify-email state.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/showcase/submit src/components/karibu/showcase
git commit -m "feat(showcase): add showcase composer with media, emoji and GIF support"
```

---

## Task 15: Admin moderation for showcase and reports

**Files:**
- Modify: `src/app/admin/community/page.tsx`
- Create: `src/app/admin/reports/page.tsx`
- Create: `src/app/api/admin/reports/[id]/route.ts`
- Modify: `src/lib/rbac.ts`
- Modify: `src/components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `checkApiPermission` from `@/lib/rbac`; `ContentReport` (Task 4).
- Produces: `PATCH /api/admin/reports/[id]` with `{ status: "ACTIONED" | "DISMISSED" }`.

These surfaces are **Terminal Noir**, not Karibu — they live under `/admin`. Read an existing admin page such as `src/app/admin/community/page.tsx` and match it exactly.

- [ ] **Step 1: Add the `reports` resource to RBAC**

In `src/lib/rbac.ts`, add `"reports"` to the `AdminResource` union, then add a `reports` entry to every role in `rolePermissions`. `SUPER_ADMIN`, `ADMIN` and `MODERATOR` get `["view", "edit", "approve"]`; `MEMBER` gets `[]`. Omitting a role from the record is a type error, so the compiler will catch a miss.

- [ ] **Step 2: Show showcase posts in the community admin page**

The existing admin community list has no type filter, so showcase posts will already appear once they exist. Add a type filter control including SHOWCASE so a moderator can isolate them, and render the new fields — cover thumbnail, linked event, needs — in the row detail.

- [ ] **Step 3: Build the reports queue**

Create `src/app/admin/reports/page.tsx`: a table of `OPEN` reports newest first, each row showing target type, a link to the reported content, the reason, the detail, and the reporter (name when signed in, "anonymous" otherwise). Two actions per row: "Actioned" and "Dismissed".

- [ ] **Step 4: Build the resolve endpoint**

Create `src/app/api/admin/reports/[id]/route.ts`. It must call `withCsrfProtection`, then `checkApiPermission("reports", "edit")`, set `status`, `reviewedBy` and `reviewedAt`, and write an `AuditLog` row — every existing admin moderation action does, and a moderation trail with a gap in it is worse than none.

- [ ] **Step 5: Add the sidebar link**

Add "Reports" to `AdminSidebar`, gated on the same `reports` permission, with an open-count badge.

- [ ] **Step 6: Verify as each role**

```bash
npm run dev
```

Sign in as an ADMIN: `/admin/reports` loads, and resolving a report moves it out of the open list. Sign in as a MEMBER: `/admin/reports` must be refused, and `PATCH /api/admin/reports/<id>` must return 403, not 200. Confirm the `audit_logs` row exists after a resolve.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/rbac.ts src/app/admin/reports src/app/api/admin/reports src/app/admin/community src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): add reports queue and showcase moderation"
```

---

## Task 16: Verification script and release checks

**Files:**
- Create: `scripts/verify-showcase.ts`
- Modify: `package.json` (add `verify:showcase`)
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `npm run verify:showcase`.

This follows the repo's own convention — `scripts/verify-*.ts` run through `tsx` — for the DB-level assertions that Vitest cannot make without a live database.

- [ ] **Step 1: Write the verification script**

Create `scripts/verify-showcase.ts`, modelled on the existing `scripts/verify-submissions.ts`. It must assert, printing a pass/fail line for each:

1. Every `CommunitySubmission` with `type: SHOWCASE` has a non-null `lastActivityAt`.
2. No `SHOWCASE` row is returned by `getCommunitySubmissions()`.
3. Every `community_upvotes` row has a non-null `voterKey`, and no row has a `voterKey` of exactly `"ip:"` (which would mean a null `ipHash` was concatenated).
4. Every `reactionCounts` value on a showcase post matches a live `groupBy` count over `showcase_reactions` for that post — catching denormalisation drift.
5. Every `media` entry on every showcase post parses as a valid `MediaDescriptor` with a `kind` of `image`, `gif` or `mp4`.

Exit non-zero if any assertion fails.

- [ ] **Step 2: Add the script to `package.json`**

```json
"verify:showcase": "tsx scripts/verify-showcase.ts"
```

- [ ] **Step 3: Add showcase posts to the sitemap**

In `src/app/sitemap.ts`, add `/showcase` and every approved showcase post's `/showcase/<slug>`, following exactly how the file already emits community and blog entries.

- [ ] **Step 4: Run every gate and record the output**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run verify:showcase
```

All five must pass. Paste the actual output when reporting completion — a claim of "all green" without the output does not count.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-showcase.ts package.json src/app/sitemap.ts
git commit -m "test(showcase): add showcase verification script and sitemap entries"
```

---

## Deferred to the Phase 2 plan

Not in this plan, by design — they are the retention loop and get their own spec-derived plan:

- `ShowcaseUpdate` model, update composer, and the build-log timeline
- `ShowcaseFollow` and the follow button
- `lastActivityAt` moving on each update (the column ships here; only Phase 2 writes to it after creation)
- The weekly Resend digest, its Vercel cron, `DigestLog`, and unsubscribe tokens

**Blocking question for Phase 2, per the spec:** the digest needs a named owner before it ships. Do not start Phase 2 without one.

## Known follow-ups this plan creates

- **Orphaned pending media.** Objects under `showcase/pending/<userId>/` whose post was never created bill forever. A sweep script deleting pending objects older than 24 hours is worth adding once the composer sees real use.
- **GIF weight.** Phase 1 accepts GIFs as-is at 15 MB. The spec's revisit trigger is >30% of demo media being GIF, or 20 GB/month R2 egress on the `showcase/` prefix. Check this a month after launch.
