# Community Showcase — design

**Date:** 2026-08-21
**Status:** Approved (extend `CommunitySubmission`; ship in two phases)
**Scope of this spec:** the full showcase feature. Phase 1 is specified to
implementation detail. Phase 2 (build-log threads, follow, digest) is specified
at the same level because it was explicitly approved, but is sequenced second
and is independently shippable.

## Why

Community members have no way to show the room what they are building. The
three surfaces that half-do it each miss something different:

- `/community` accepts member submissions with comments, upvotes, moderation
  and detail pages — but only for four resource types (MCP, prompt, workflow,
  tool), and it has no media field at all.
- `/blog` is database-backed with a real editor, but authorship is admin-only.
  A member cannot write an article.
- `/projects` is a separate model with no comments, no upvotes, and a submission
  flow that terminates in an admin inbox rather than a public page.

So a member who built something and wants to show it, explain it, and get
reactions has to pick the least-wrong of three surfaces, and cannot post a
screenshot on any of them.

The feature is not a new system. It is `/community`'s existing machinery —
slugs, moderation, comments, upvotes, admin queue, OG images — extended with
media, richer authorship, and four things no general-purpose showcase site can
copy.

### The wedge

A Kenyan Claude community does not win by being a worse Product Hunt. Four
differentiators, all approved:

1. **Event-linked provenance.** A post attaches to a real CCK `Event`. The feed
   filters to "built at Impact Lab 2026"; the event page shows what came out of
   it. This uses data the platform already holds and no external site has.
2. **Build-log threads.** A post is a living thread with dated updates, not a
   one-shot launch. The feed sorts by recent activity, so the reward goes to
   people who keep going.
3. **Claude-native metadata.** Structured fields for what these posts actually
   are — which models, which skills, which MCP servers, roughly what a run
   costs. Makes the corpus searchable in ways a generic feed cannot be.
4. **Ask-for-help signal.** Each post declares what it needs: testers, an
   Android dev, a designer, an intro. A showcase that is also a matching surface.

## Goals

1. A verified member can publish a showcase post with images, a demo GIF or
   video, tags, an optional linked event, what it was built with, and what it
   needs — and it appears publicly without waiting on a moderator.
2. Other members react, comment, and upvote without a moderation queue standing
   between them and the conversation.
3. Two members behind the same NAT can both upvote the same post.
4. The author posts dated updates to the same thread; followers receive a
   weekly digest of what moved.
5. Nothing about `/community`'s four existing resource types changes behaviour.

## Non-goals

- Migrating `Project` or `BlogPost` into the showcase. `potwAt` is anchored to
  `Project` and `/blog/[slug]` URLs are already indexed by search engines.
  Consolidation is a later, separate decision.
- Direct messaging between members. "Needs" surfaces intent; the conversation
  happens in comments or off-platform.
- Real-time notification (websockets, in-app bell). The digest is email, weekly.

## Architecture

### Surface

New route `/showcase`, backed by the existing `CommunitySubmission` model
filtered to `type: SHOWCASE`. `/community` continues to serve MCP, PROMPT,
WORKFLOW and TOOL and its queries gain an explicit type filter so showcase posts
never leak into it.

Shared, not duplicated: the `[slug]` detail page component family, the OG image
route, the admin moderation queue at `/admin/community`, comment and upvote API
routes, and `CommunityFilters`.

Public pages use **Karibu** (`src/components/karibu/`), not Terminal Noir. Dark
panels use the `--panel-dark` / `--on-panel-dark` / `--on-panel-dark-muted`
trio. Never `bg-ink` — that is the bug that put the footer at 1.59:1 contrast.

### Data model

**`CommunityResourceType`** gains `SHOWCASE`.

**`CommunitySubmission`** gains:

| Field | Type | Purpose |
|---|---|---|
| `coverImageUrl` | `String?` | Feed card image and OG image source |
| `media` | `Json?` | `[{key,url,width,height,kind:'image'\|'gif'\|'mp4',posterUrl?}]`, max 5 |
| `eventId` | `String?` | FK to `Event`, `onDelete: SetNull` — provenance |
| `needs` | `Json?` | `string[]` from a fixed vocabulary (see below) |
| `builtWith` | `Json?` | `{models:string[],skills:string[],mcps:string[],tokensPerRun?:number}` |
| `lastActivityAt` | `DateTime` | Feed ordering; set on create and on each update |
| `followerCount` | `Int @default(0)` | Denormalised, maintained with the follow row |
| `reactionCounts` | `Json?` | Denormalised counts per emoji for feed cards |

Indexes: `@@index([type, status, lastActivityAt])` for the feed,
`@@index([eventId])` for the event rollup.

**`needs` vocabulary** (fixed, rendered as chips, filterable):
`testers`, `co-founder`, `frontend-dev`, `backend-dev`, `mobile-dev`,
`designer`, `data`, `intro`, `funding`, `feedback`.

**New models:**

```prisma
model ShowcaseUpdate {
  id           String   @id @default(cuid())
  submissionId String
  authorId     String
  body         String   @db.Text
  media        Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  submission CommunitySubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  author     User                @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([submissionId, createdAt])
  @@map("showcase_updates")
}

model ShowcaseFollow {
  id           String   @id @default(cuid())
  submissionId String
  userId       String
  createdAt    DateTime @default(now())

  submission CommunitySubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([submissionId, userId])
  @@index([userId])
  @@map("showcase_follows")
}

/// Reactions are members-only, so `userId` is required — unlike CommunityUpvote,
/// which keeps an anonymous path and therefore needs the `voterKey` scheme.
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

model ContentReport {
  id         String        @id @default(cuid())
  targetType ReportTarget
  targetId   String
  reporterId String?
  reporterIp String?
  reason     ReportReason
  detail     String?       @db.Text
  status     ReportStatus  @default(OPEN)
  reviewedBy String?
  reviewedAt DateTime?
  createdAt  DateTime      @default(now())

  @@index([status, createdAt])
  @@index([targetType, targetId])
  @@map("content_reports")
}

model DigestLog {
  id          String   @id @default(cuid())
  userId      String
  sentAt      DateTime @default(now())
  /// Newest ShowcaseUpdate.createdAt included in this send. The next send
  /// starts strictly after this, so a failed or retried run cannot duplicate.
  throughAt   DateTime
  updateCount Int

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, sentAt])
  @@map("digest_logs")
}
```

`User` gains: `showcaseUpdates`, `showcaseFollows`, `digestLogs` relations, and
`digestUnsubscribedAt DateTime?` plus `unsubscribeToken String? @unique`.

### The upvote migration

`CommunityUpvote` is currently `@@unique([submissionId, ipHash])`. On Kenyan
carrier-grade NAT and shared office wifi, distinct real members resolve to one
`ipHash` and silently block each other from voting. This is a correctness bug
today, not only a showcase concern.

The fix that avoids a partial unique index (which Prisma cannot express
natively): collapse identity into a single `voterKey` column.

```
voterKey = signed in ? `u:${userId}` : `ip:${ipHash}`
@@unique([submissionId, voterKey])
```

Migration sequence, one migration:

1. Add `voterKey String?`.
2. Backfill `voterKey = 'ip:' || "ipHash"` for every existing row.
3. Make `voterKey` required; drop the old unique on `(submissionId, ipHash)`;
   add the unique on `(submissionId, voterKey)`.
4. Keep `ipHash` as a nullable column for abuse forensics; stop reading it for
   uniqueness.

Steps 2 and 3 are in the same migration so no window exists in which a signed-in
user can double-vote.

### Comments

`CommunityComment` gains `userId String?` (FK to `User`, `onDelete: SetNull`).

Publication rule, enforced server-side in the comment route, never client-side:

| Author | Status on create |
|---|---|
| Signed-in, `emailVerified: true` | `APPROVED` — live immediately |
| Signed-in, unverified | `PENDING` |
| Anonymous | `PENDING` |

The existing admin queue keeps working; it simply receives fewer items. Every
comment gains a report affordance.

### Media pipeline

New route `POST /api/showcase/media/presign`, modeled on
`src/app/api/admin/photos/presign/route.ts` and reusing `src/lib/gallery/r2.ts`.
Differences from the admin route: authorization is "verified MEMBER" rather than
an admin permission check, and the limits are tighter.

Constraints, all enforced server-side:

- Verified member session required; CSRF; rate limited (reuse `RateLimits`).
- Max 5 media per submission, max 5 per update.
- Images: jpg / png / webp, at most 5 MB each.
- Demo: mp4 at most 15 MB, or gif at most 15 MB.
- Content type is determined by **magic-byte sniff on finalize**, not by the
  client-declared MIME type or the file extension.
- EXIF stripped on the derivative pass (`src/lib/gallery/derivatives.ts`).
- Object keys are namespaced `showcase/<submissionId>/<cuid>.<ext>` so orphan
  cleanup is a prefix scan.

**Open decision — GIF transcoding.** A screen-recorded GIF is the best format
for showing a thing working and the worst format for weight (an 8 MB GIF is
roughly a 600 KB MP4). Vercel functions cannot run ffmpeg comfortably. Three
options were considered: client-side `ffmpeg.wasm` (~25 MB download and slow on
low-end Android, which describes most of this audience), a transcode worker on
the existing VPS, or accepting GIFs as-is under a hard cap.

**Decision for Phase 1: accept GIFs as-is at 15 MB or under**, render them in a
lazy container, and recommend MP4 in the upload UI copy.
**Revisit trigger:** if GIF uploads exceed 30% of demo media, or R2 egress for
the `showcase/` prefix passes 20 GB/month, move transcoding to the VPS worker.
This is recorded so the next session does not re-litigate it from scratch.

### Reactions, emoji, GIFs

**Reactions** are a fixed set of five emoji, one `ShowcaseReaction` row per
(post, voter, emoji), toggled. Counts are denormalised onto `reactionCounts`
for feed cards and recomputed on write. Upvote remains the single ranking
number so the feed does not get muddy; reactions are texture.

**Emoji in text** are stored as Unicode in the existing `@db.Text` columns.
Postgres handles this natively.

> **Must be verified before the picker ships.** Comment and update bodies pass
> through `zodSanitizeString` in `src/lib/input-sanitization.ts`. If that
> function strips or mangles non-ASCII, emoji will vanish with no error. A unit
> test asserting an emoji-bearing string round-trips is a required task, and it
> comes *before* the picker UI, not after.

**GIF picker** hotlinks Tenor. No bytes stored, no egress cost. Requirements:
`TENOR_API_KEY` in env, `contentfilter=high` on every request, the Tenor
attribution badge rendered per their terms, and the chosen GIF persisted as a
URL plus dimensions (never proxied). A picked GIF is a distinct media kind from
an uploaded one so a future Tenor outage degrades visibly rather than corrupting
posts.

### Feed and ranking

Default sort is a hot score, computed in the query:

```
score = (upvoteCount + 1) / pow(hours_since(lastActivityAt) + 2, 1.5)
```

`lastActivityAt` rather than `createdAt` is what makes build-log threads pay off:
posting a real update lifts the post back up the feed.

Alternate sorts: newest, most upvoted, "needs help" (posts with a non-empty
`needs`). Filters: linked event, `needs` chip, `builtWith` facet, tag.

### Follow and weekly digest (Phase 2)

- Follow toggles a `ShowcaseFollow` row and adjusts `followerCount` in the same
  transaction. Authors auto-follow their own post.
- Vercel cron, Fridays 09:00 EAT (`0 6 * * 5` UTC), hits an internal route
  guarded by a shared secret header.
- For each user with follows and `digestUnsubscribedAt: null`: gather
  `ShowcaseUpdate` rows on followed posts created after the last `DigestLog`
  `throughAt`. Skip users with zero. Send via Resend. Write a `DigestLog` row in
  the same transaction as the send acknowledgement.
- Every digest email carries a one-click unsubscribe using `unsubscribeToken`,
  served by a `GET` route that requires no session.
- Cap at 15 updates per email with an "and N more" link.

**Operational note:** this is the one part of the feature with a recurring
failure mode (a cron that silently stops, a Resend bounce spike). It needs a
named owner before it ships. If no owner exists, ship Phase 1 and hold Phase 2.

## Security and abuse

| Surface | Control |
|---|---|
| Post / update / comment | Verified member session; CSRF; rate limited per route |
| Media presign | Verified member; magic-byte sniff on finalize; hard size and count caps; EXIF stripped |
| Upvotes | `voterKey` uniqueness; anonymous path retained and rate limited |
| Reactions | Members-only, keyed on `userId`; no anonymous path |
| GIF picker | Tenor `contentfilter=high`; URL allowlist on the stored host |
| Text fields | Existing `zodSanitizeString` (with the emoji round-trip test above) |
| Rendering | Post bodies render as sanitised markdown — no raw HTML, no embedded script |
| Reports | Any authenticated or anonymous viewer can report; lands in `/admin/community` |
| Admin actions | Existing `checkApiPermission` on the `community` resource; every moderation action writes an `AuditLog` row |

Anonymous users can read, upvote, and report. They cannot post, update, react
with emoji, follow, or comment without moderation.

## Testing

- **Unit:** hot-score ranking; `voterKey` derivation; `zodSanitizeString` emoji
  round-trip; media validation (each reject path: oversize, wrong magic bytes,
  count over cap); digest window selection given a prior `DigestLog`.
- **Integration (route-level):** comment status matrix (verified / unverified /
  anonymous); upvote idempotency for the same user across two IPs and for two
  users behind one IP; presign refuses a non-member; report creates a queue row.
- **Migration:** a test asserting existing `community_upvotes` rows survive the
  `voterKey` backfill with no row loss and no duplicate-key failure.
- **End-to-end:** publish a post with a cover image and an MP4 demo, react,
  comment while signed in and see it live, post an update, confirm the post
  climbs the feed. Run against a real browser, not only unit tests.
- **Accessibility:** the reaction row is keyboard-operable with visible focus;
  every media element has alt text or an explicit empty alt; the feed cards meet
  4.5:1 in both light and dark Karibu themes.

## Phasing

**Phase 1 — the showcase works.** `SHOWCASE` type, media upload, cover image,
event link, `needs`, `builtWith`, reactions, emoji in text, GIF picker, member
comments, the `voterKey` migration, `/showcase` feed and detail, admin
moderation and reports.

**Phase 2 — the retention loop.** `ShowcaseUpdate` timeline and composer,
follow, `lastActivityAt` feed lift, the weekly Resend digest, unsubscribe.

Phase 1 is a complete product on its own and is the shippable unit. Phase 2 is
additive: no Phase 1 schema is rewritten to accommodate it, which is why
`lastActivityAt` and `followerCount` are added in Phase 1 even though only
Phase 2 moves them.

## Open items carried into the plan

1. GIF transcoding — decided for Phase 1 (accept as-is, 15 MB cap) with an
   explicit revisit trigger. Not a blocker.
2. Digest ownership — needs a named human before Phase 2 ships.
3. `TENOR_API_KEY` must be provisioned and added to `.env.example` and Vercel
   before the GIF picker task starts.
