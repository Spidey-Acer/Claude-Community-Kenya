# Claude Community Kenya — Final Touches Audit

**Date:** 2026-05-12
**Branch:** `development`
**Site:** https://claudekenya.org
**Scope:** Security, performance, accessibility, SEO, code quality, RBAC, data integrity, UI

Companion document: `UI_ISSUES.md` (visible UI/UX findings from screenshot review).

---

## Executive summary

- All 27 admin API routes correctly use `checkApiPermission` via RBAC, but **zero admin mutation routes carry CSRF tokens** — every state-changing admin endpoint is vulnerable to CSRF from a malicious site while an admin is logged in.
- `DemoRequest.eventId` is a plain `String` with **no Prisma relation to `Event`** — deleting an event leaves orphan demo requests, no FK constraint.
- Three debug-level `console.log` lines in `src/auth.ts` write the login email and bcrypt result to production logs on every authentication attempt.
- `getProjects()` and `getFeaturedProjects()` in `src/lib/data.ts` are **identical functions** — DRY violation that will drift.
- The admin upload endpoint accepts a caller-controlled `folder` parameter with no allowlist.

---

## Critical issues (block production)

### 1. CSRF protection absent on all admin mutation routes
**Files:** `src/app/api/admin/**/*.ts` — every POST / PATCH / DELETE handler
**Confidence:** 95

Every admin mutation (blog create/edit/delete, event CRUD, user management, demo approval, community moderation, etc.) calls `checkApiPermission` which verifies the JWT session but **does not verify a CSRF token**. Public routes (`/api/contact`, `/api/join`, etc.) correctly call `withCsrfProtection(request)` first. Admin routes skip it entirely.

**Risk:** If an admin is authenticated and visits a malicious page, that page can POST to `/api/admin/blog` (delete posts) or `/api/admin/settings/users/[id]` (reset password) from the browser. Session cookie is sent automatically. Attack surface: 27 files.

**Fix:** Apply `withCsrfProtection` at the top of every admin mutation handler, identical to `src/app/api/contact/route.ts:17`. Admin frontend already fetches these routes — add the `x-csrf-token` header on the admin client.

---

### 2. Upload endpoint accepts unvalidated `folder` parameter
**File:** `src/app/api/admin/upload/route.ts:14`
**Confidence:** 90

```ts
const folder = (formData.get("folder") as string) || "events";
```

Caller controls the storage path prefix. `folder` flows unsanitized into `uploadImage(buffer, safeName, file.type, folder)` → `path = \`${folder}/${Date.now()}-${fileName}\``. A compromised admin can pollute or overwrite bucket prefixes.

**Fix:**
```ts
const ALLOWED_FOLDERS = new Set(["events", "blog", "team", "community"]);
const rawFolder = formData.get("folder") as string;
const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "events";
```

---

### 3. Missing FK constraint on `DemoRequest.eventId`
**File:** `prisma/schema.prisma:237`
**Confidence:** 92

`eventId` is `String` with no `@relation` to `Event`. Deleting an event leaves `DemoRequest` rows pointing at a vanished event. PostgreSQL has no FK enforcing referential integrity.

**Fix:**
```prisma
// in DemoRequest model
event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

// in Event model
demoRequests DemoRequest[]
```
Then `npm run db:migrate`.

---

### 4. Debug `console.log` exposes auth email + result in production
**File:** `src/auth.ts:36-47`
**Confidence:** 88

```ts
console.log("[auth] Attempting login for:", email)              // line 36
console.log("[auth] User lookup result:", user ? "found" : "not found")  // line 42
console.log("[auth] Password match:", passwordMatch)            // line 47
```

Login email written to Vercel logs on every sign-in. Password match boolean also logged. Flagged as an Anti-Pattern in `CLAUDE.md`. Leaks PII to any log aggregator.

**Fix:** Remove lines 36, 39, 42, 47.

---

## High-priority issues (next milestone)

### 5. `change-password` route missing CSRF protection
**File:** `src/app/api/admin/settings/change-password/route.ts:13`
**Confidence:** 85

Uses `auth()` session check only. `/api/forgot-password`, `/api/reset-password`, `/api/signup` all wrap with `withCsrfProtection` — this one doesn't.

**Fix:** Add at the top of `POST`:
```ts
const csrfError = withCsrfProtection(request);
if (csrfError) return csrfError;
```

---

### 6. `getProjects` and `getFeaturedProjects` are identical
**File:** `src/lib/data.ts:247-261`
**Confidence:** 100

Both run `findMany({ where: { featured: true } })`. Direct DRY violation per Iron Laws.

**Fix:** Delete `getFeaturedProjects`. Update callers (`src/lib/chat/community-context.ts:7,19`, `src/app/page.tsx:4,37`) to use `getProjects()`.

---

### 7. `BlogPost` missing composite index
**File:** `prisma/schema.prisma:298-318`
**Confidence:** 85

`getBlogPosts()` queries `WHERE status = 'PUBLISHED' ORDER BY publishedAt DESC` with no `(status, publishedAt)` index. Sequential scan as blog grows.

**Fix:**
```prisma
@@index([status, publishedAt])
```

---

### 8. `ContactMessage` missing index on `status`
**File:** `prisma/schema.prisma:363-376`
**Confidence:** 82

Admin contact page filters by status with no index.

**Fix:**
```prisma
@@index([status])
@@index([createdAt])
```

---

### 9. `CSRF_SECRET` fallback re-randomises on every cold start
**File:** `src/lib/csrf.ts:5`
**Confidence:** 88

```ts
const secret = process.env.CSRF_SECRET || crypto.randomUUID();
```

On Vercel, each cold-start generates a new secret. Tokens minted before a cold-start fail after one. `.env.example` documents `CSRF_SECRET` but nothing throws at startup if it is missing in production.

**Fix:**
```ts
if (process.env.NODE_ENV === "production" && !process.env.CSRF_SECRET) {
  throw new Error("CSRF_SECRET environment variable is required in production.");
}
```

---

## Medium-priority issues (polish)

### 10. Blog view-count double-increments
**File:** `src/lib/data.ts:243`, callers `src/app/blog/[slug]/page.tsx:28,258`
**Confidence:** 80

```ts
prisma.blogPost.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});
```

`getBlogPostBySlug` runs in both `generateMetadata` and the page component → counts twice per view. The `.catch(() => {})` silently drops errors.

**Fix:** Move the increment to a dedicated `/api/blog/[slug]/view` POST called client-side on mount, or add an `incrementViews?: boolean` flag and only set it in the page component.

---

### 11. `PersonaSelectorModal` has no focus trap
**File:** `src/components/persona/PersonaSelectorModal.tsx`
**Confidence:** 82

Sets `role="dialog" aria-modal="true"` but doesn't trap focus. Tab escapes to background content. `KaribuModal.tsx:32-37` does this correctly — mirror that pattern.

---

### 12. `CRON_SECRET` blank in `.env.example` — purge route unguarded if unset
**File:** `.env.example:43`, `src/app/api/cron/purge-conversations/route.ts:13`
**Confidence:** 82

If `CRON_SECRET` is empty, `auth !== "Bearer "` evaluates true for any unauthenticated GET — i.e. anyone can purge conversation data.

**Fix:** Set a documented placeholder in `.env.example` (`CRON_SECRET="your-cron-secret-here"`) and add a production startup guard inside the route.

---

## UI issues (also see `UI_ISSUES.md`)

### 13. `--text-dim` on `--bg-primary` fails WCAG AA
**File:** `src/app/globals.css`
**Confidence:** 80

`#4a4a4a` on `#0a0a0a` ≈ 3.0:1 (needs 4.5:1). Used on stats labels, secondary descriptions, form hints across the site.

**Fix:** Raise `--text-dim` to ≥ `#767676` (~4.6:1) and re-check with a contrast tool.

---

### 14. `TeamMemberCard` uses inline `style` for hover
**File:** `src/components/sections/TeamMemberCard.tsx:32-39`
**Confidence:** 80

Hover applies via `onMouseEnter`/`onMouseLeave` `style` mutations. Violates "no inline styles" rule in `CLAUDE.md`.

**Fix:** Use Tailwind hover utilities — e.g. `border-[#2a2a28] hover:border-[#3a3a37] hover:shadow-lg hover:shadow-black/30 transition-all duration-300`.

---

## File-by-file appendix

| # | File | Line(s) | Finding |
|---|------|---------|---------|
| 1 | `src/app/api/admin/**/*.ts` | all PATCH/POST/DELETE | No CSRF on admin mutations |
| 2 | `src/app/api/admin/upload/route.ts` | 14, 44 | Unvalidated `folder` param |
| 3 | `prisma/schema.prisma` | 237, 253-257 | `DemoRequest.eventId` has no FK |
| 4 | `src/auth.ts` | 36, 39, 42, 47 | Debug `console.log` in auth |
| 5 | `src/app/api/admin/settings/change-password/route.ts` | 13 | Missing CSRF |
| 6 | `src/lib/data.ts` | 247-261 | `getProjects` === `getFeaturedProjects` |
| 7 | `prisma/schema.prisma` | 298-318 | Missing `@@index([status, publishedAt])` on BlogPost |
| 8 | `prisma/schema.prisma` | 363-376 | Missing index on ContactMessage |
| 9 | `src/lib/csrf.ts` | 5 | Random fallback after cold start |
| 10 | `src/lib/data.ts` | 239-245 | Double view-count increment |
| 11 | `src/components/persona/PersonaSelectorModal.tsx` | entire | No focus trap |
| 12 | `.env.example` | 43 | `CRON_SECRET` empty |
| 13 | `src/app/globals.css` | `--text-dim` | Contrast 3.0:1, below WCAG AA |
| 14 | `src/components/sections/TeamMemberCard.tsx` | 32-39 | Inline `style` mutations |

---

## Action checklist

**Critical — do before any public admin access:**

- [ ] Add `withCsrfProtection(request)` to all admin mutation handlers (~28 functions across 27 files in `src/app/api/admin/`)
- [ ] Add `folder` allowlist to `src/app/api/admin/upload/route.ts:14`
- [ ] Add FK relation + cascade for `DemoRequest → Event` in `prisma/schema.prisma` + migrate
- [ ] Remove 4 debug `console.log` lines from `src/auth.ts:36,39,42,47`

**High — before next milestone:**

- [ ] Add `withCsrfProtection` to `src/app/api/admin/settings/change-password/route.ts`
- [ ] Delete `getFeaturedProjects` in `src/lib/data.ts`; update 3 callers
- [ ] Add `@@index([status, publishedAt])` on `BlogPost`
- [ ] Add `@@index([status])` + `@@index([createdAt])` on `ContactMessage`
- [ ] Add production startup guard in `src/lib/csrf.ts`
- [ ] Set `CRON_SECRET` placeholder in `.env.example` + production guard in cron route

**Medium — polish pass:**

- [ ] Fix double view-count increment in `getBlogPostBySlug`
- [ ] Add focus trap to `PersonaSelectorModal`

**UI — before design sign-off (see also `UI_ISSUES.md`):**

- [ ] Raise `--text-dim` to ≥ `#767676` for WCAG AA
- [ ] Replace inline `style` hover mutations in `TeamMemberCard.tsx` with Tailwind hover utilities
- [ ] Address the open UI items in `UI_ISSUES.md` (dashboard role formatting, navbar aria-label, chat textarea auto-resize, footer emoji icons, etc.)
