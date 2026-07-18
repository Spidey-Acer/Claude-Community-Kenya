# Backend Migration + Pending-Work Audit — 2026-07-18

Audit of open items across specs, docs, code, git, and session history, plus the
scoped surface for migrating off Supabase to a self-hosted VPS.

**Status: audit only. No migration or cutover has been performed.**

---

## 0. P0 INCIDENT — production has been down for ~18 days

This is not a "we should migrate soon" situation. The Supabase project is already
unreachable and **claudekenya.org has been failing in production since 2026-06-30**.

Hard evidence from Vercel runtime errors (project `claude-community-kenya`, last 7d):

```
Error [DriverAdapterError]: (ENOTFOUND) tenant/user postgres.wqjtoljjntwvtxfbyfgw not found
count=91   users=54   first=2026-06-30T18:41Z   last=2026-07-18T08:58Z
routes=/blog/[slug], /team/[slug], /events/[slug], /community/[slug]
```

Corroborating signals:

- Local `DATABASE_URL` → `(ENOTFOUND) tenant/user postgres.wqjtoljjntwvtxfbyfgw not found`
- Local `DIRECT_URL` → `getaddrinfo ENOTFOUND db.wqjtoljjntwvtxfbyfgw.supabase.co`
  (NXDOMAIN — Supabase withdraws DNS for paused/deleted projects; a wrong password
  would return an auth error, not NXDOMAIN)
- Live `/events` → "No events in this filter yet." · `/blog` → "No posts yet" ·
  `/team` → empty · home stats showing the documented empty-DB fallback ("Growing"/"Kenya")
- 252 Server Component render failures + 84 `/500.html` ENOENT errors, 54 users affected

**Real data existed and is currently inaccessible.** Error payloads name actual
rows: `/blog/what-is-claude-community-kenya`, `/blog/getting-started-with-claude-code`,
`/events/mombasa-ai-career-talk`, plus `/community/[slug]` posts and `/team/[slug]`.

Timeline note: the outage began 2026-06-30, ~8 days *before* the "we couldn't afford
Supabase anymore" note on 2026-07-08 — consistent with non-payment → project
paused/deleted, not a deliberate teardown.

### The one question that branches everything

Open the Supabase dashboard and determine whether the project is **paused** or **deleted**:

| State | Consequence |
|---|---|
| **Paused** | Restore it, `pg_dump` **immediately**, then migrate at leisure. Data preserved. |
| **Deleted** | Rebuild via `prisma migrate deploy` + `prisma db seed`. Editorial content returns; **user-generated content does not** — see the split below. |

### What is actually at risk (verified against `prisma/seed.ts`)

**Recoverable — `prisma/seed.ts` recreates these inline:** admin user, events,
meetup photos, blog posts, projects, team member. Plus `src/data/` holds faq,
resources, and persona content. Editorial content survives a full rebuild.

**Unrecoverable if the project is deleted — DB-only, user-generated, no backup:**

- Join / speaker / volunteer applications
- Community submissions, comments, upvotes
- Demo requests, contact messages, newsletter subscribers
- Any events/blog posts created through the admin panel *after* the last seed
- Uploaded images in bucket `cck-bucket` (posters, avatars, meetup photos)

Safe either way: `public/images/community/*.webp` are committed to git.

So the stakes are narrower than "everything is gone" — but the community's actual
submissions are exactly the part with no fallback.

**Do not redeploy or rotate env vars before dumping** — if the project is restorable,
the dump is the only chance to preserve the data.

---

## 1. Supabase → VPS migration surface (verified)

Good news: the coupling is shallow. Only `@supabase/supabase-js` is Supabase-specific.
Upstash Redis (rate limiting) and Resend (email) are independent and unaffected.
Auth is NextAuth credentials — **no Supabase Auth**, no RLS, no edge functions, no
Supabase-specific SQL.

### 1a. Database (Postgres via Prisma 7, 17 models, 12 migrations)

The datasource is injected purely from env at `prisma.config.ts:11-15`, so the
cutover is genuinely just repointing two variables.

- [ ] Stand up Postgres on the VPS (version-match Supabase's major version)
- [ ] `pg_dump` from Supabase **if restorable** — else `prisma migrate deploy` + reseed
- [ ] Repoint `DATABASE_URL` + `DIRECT_URL` in local `.env`, `.env.local`, and
      **all three Vercel environments** (production, preview, development)
- [ ] Decide pooling: PgBouncer replaces Supabase's pooler if you keep the
      transaction-mode/`DIRECT_URL` split. Serverless Vercel functions make some
      pooling necessary — this is not optional at Vercel's concurrency.
- [ ] TLS on the Postgres listener + firewall to Vercel egress (or a tunnel)
- [ ] Automated backups (`pg_dump` cron → offsite). This is now your job, not Supabase's.

### 1b. Storage (small — clean swap)

- `src/lib/supabase.ts` — `uploadImage()` / `deleteImage()`, bucket `cck-bucket`
- `src/app/api/admin/upload/route.ts:44`
- `src/app/api/admin/photos/upload/route.ts:54`
- `src/app/api/admin/photos/[id]/route.ts:81`
- `next.config.ts` — `remotePatterns` → `*.supabase.co` (plus a stale
  `images.unsplash.com` seed-placeholder entry to remove)

Recommendation: **VPS local disk behind a served path, not MinIO.** Current volume is
a handful of event photos; self-hosted S3 semantics is YAGNI until upload volume
justifies it. Keeping the `uploadImage`/`deleteImage` interface means only the two
function bodies change.

### 1c. Stored absolute URLs — the migration trap

These columns hold **absolute Supabase URLs** that break the moment the bucket dies:

| Model field | schema.prisma |
|---|---|
| `imageUrl` | :119 |
| `posterUrl` | :287 |
| `photosUrl` | :288 |
| `Photo.url` | :311 |
| `avatar` | :403 |
| `url` | :516 |

Cutover needs a rewrite pass over these. Storing **relative paths** going forward
would prevent a repeat of this on the next host move.

---

## 2. Biggest non-incident gap — finished work never landed on `main`

**`redesign/karibu-darkmode` is 16 commits ahead of `main` with no open PR.**

It contains two completed features: adaptive dark mode (issue #33, `2841d48`) and
the **entire motion layer** (15 commits, P0–P3, merged via PR #37 into
`karibu-darkmode` — not into `main`).

There are **zero open issues and zero open PRs** on the repo, so this has no
tracking artifact at all.

Also: this machine's local `redesign/karibu-motion` is **14 commits behind its own
remote**. The motion layer was implemented on another machine after the spec was
written here. **`git pull` before touching motion code** or you will re-implement
finished work.

---

## 3. Security — open and critical

- [ ] **CSRF missing on 21 of 22 admin mutation routes.** 31 admin route files exist;
      22 export a `POST`/`PUT`/`PATCH`/`DELETE` handler, and only
      `src/app/api/admin/settings/change-password/route.ts` calls `withCsrfProtection`.
      (GET-only routes need no CSRF, so the exposure is those 21 mutation routes.)
      RBAC (`checkApiPermission`) is present everywhere, which limits but does not
      eliminate this — CSRF rides an already-authenticated admin session.
- [ ] **Upload `folder` param has no allowlist** — `src/app/api/admin/upload/route.ts:14`:
      `const folder = (formData.get("folder") as string) || "events"`. Arbitrary
      path control into the bucket. Fix while rewriting storage (§1b) — same code.

Already fixed (verified, no action): `DemoRequest.eventId` FK, `console.log` removed
from `auth.ts`, `CSRF_SECRET` prod guard, `CRON_SECRET` guard, Blog/Contact indexes.
Also resolved historically: PR #31 admin PII leak (merged 2026-05-22).

---

## 4. Open decisions blocking a clean merge

Both are flagged in code/spec as needing sign-off, both still unresolved:

- [ ] **Testimonial names** — `src/components/karibu/KaribuTestimonials.tsx:3-10`
      carries an explicit "pending his sign-off before merge... Do not treat as
      final copy" comment (Billy Mwangi surname, Samuel surname, "Toili"/"Tuigoin").
      These are real named people on the homepage.
- [ ] **`/join` application form** — the redesign reframed `/join` as WhatsApp-first,
      leaving `JoinSwitcher`/`ProJoinContent`/JoinApplication dormant but not deleted.
      Should the form come back?

---

## 5. Karibu conversion gaps (deliberate deferral, not bugs)

`isKaribu` in `ConditionalLayout.tsx:38-54` is **exact-match, not prefix-match**, so
nested routes fall back to Terminal Noir chrome:

- All 7 Resources sub-pages (`/resources/getting-started`, `/claude-code`,
  `/workflows`, `/courses`, `/api-guide`, `/production-guide`, `/links`)
- `/community/[slug]`, `/community/submit`, `/blog/[slug]`, `/newsletter/[slug]`
- Never listed: `/account`, `/chat`, `/code-of-conduct`, `/dashboard`,
  `/forgot-password`, `/login`, `/merch`, `/reset-password`, `/signup`, `/verify-email`
- `/admin/*` intentionally excluded (own chrome)

Matches the motion spec §9 "out of scope" list — accurate, known, deferred.

---

## 6. Smaller open items

- [ ] `getFeaturedProjects` duplicates `getProjects` in `src/lib/data.ts` (3 call sites) — DRY
- [ ] Blog view-count double-increment (`getBlogPostBySlug` called in both `generateMetadata` and page body)
- [ ] `PersonaSelectorModal.tsx` — `role="dialog"` with no focus trap
- [ ] `opengraph-image` route handlers for `/events/[slug]`, `/community/[slug]`,
      `/blog/[slug]` don't return a Response on all branches (20 prod errors) —
      likely a downstream symptom of the DB outage
- [ ] Missing `/500.html` — 84 prod errors; the error page itself fails to render
- [ ] `TerminalApplication.tsx` — 1,356 lines, flagged in CLAUDE.md as needing refactor
- [ ] `UI_ISSUES.md` (2026-05-12) items — no fix-pass evidence; needs per-item recheck
- [ ] 20+ `eslint-disable` lines with no issue reference (mostly `react-hooks/set-state-in-effect`)

No `TODO`/`FIXME`/`XXX`/`@ts-expect-error` markers anywhere in `src/`.

---

## 7. Doc-debt (stale, safe to archive)

- `docs/RELEASE_NOTES.md` — Feb 2026, Terminal Noir era, stale "Phase 4" checklist
- `DEMO-CHEATSHEET.md` — references deleted `PersonaProvider.tsx` (now `SkinContext`)
- `docs/superpowers/plans/2026-05-10-karibu-onboarding.md` — 119 unchecked boxes but
  **all files verified to exist and be wired**; stale tracking, not real gaps
- `origin/claude/audit-homepage-wFsk2` (2026-03-03) — `AUDIT-REPORT.md` (126 issues)
  predates the Karibu redesign; `FEATURE-PLAN.md` proposes adopting Supabase back
  when the site was static, superseded by the Prisma+NextAuth build. **Archive both.**

---

## Recommended order

1. **Determine Supabase project state (paused vs deleted).** Everything branches here.
2. If paused: **restore → `pg_dump` immediately → store the dump offsite.**
3. Stand up VPS Postgres, restore, repoint env in local + all Vercel envs. Production recovers.
4. Storage swap (§1b) + upload `folder` allowlist (§3) — same code, do together.
5. URL rewrite pass over the six columns in §1c; switch to relative paths.
6. Open PR `redesign/karibu-darkmode` → `main` (dark mode + motion layer).
7. CSRF sweep across the 21 unprotected admin mutation routes.
8. Sign-offs (§4), then the deferred conversions (§5).
