# Impact Lab project submissions — design

**Date:** 2026-07-25
**Status:** approved, ready for implementation planning
**Context:** Impact Lab / AI Mashinani hackathon (25–26 July 2026). Teams are matched
and published; they now need to submit what they built, and organisers need to download
every submission for judging.

## Goal

A team submits one project entry from their dashboard. Organisers see who has and hasn't
submitted, and download everything as a CSV for judging.

## Decisions made during brainstorming

| Decision | Choice | Why |
|---|---|---|
| Timing | Live for this event | Submissions are due the morning after the build. |
| Files | **Links only** — no uploads | Storage is a public bucket whose production status is unverified (`docs/2026-07-18-backend-migration-and-gap-audit.md:335` — the real key "lives only in Vercel"; the storage swap is still pending), and Vercel caps request bodies at ~4.5MB, below a real slide deck. Uploading on venue wifi at 6am is the most fragile step available; links delete it entirely. Judges click through identically. |
| Ownership | One submission per team, **any member may edit** until close | A sleeping teammate must never block a team. Records who created and who last edited. |
| Closing | **Fixed deadline timestamp**, editable by an organiser | Peter's call. Editability is the mitigation for demos slipping — change a field, not the production database. |
| Fields | Core + demo/video links + works-vs-mocked + how-you-used-Claude + track/problem | All four optional groups were chosen. |
| Review status | Reuse `ApplicationStatus` | Three submission-shaped models already use it; don't mint a fourth enum. |
| Arrays | Native Postgres `String[]` if any are added later | Impact Lab convention (`ImpactLabParticipant`), not the older `Json` style. |

## Constraints discovered by audit

These shape the implementation and must not be re-litigated during coding.

1. **There is no team entity in the database.** Teams exist only inside
   `ImpactLabMatchRun.result` JSON (`result.teams[].id/.name/.memberIds`), guarded by
   `extractFrozenTeams()` in `src/lib/impact-lab/member.ts`. A submission therefore keys on
   `(runId, teamId)`; `runId` can foreign-key the run, `teamId` cannot foreign-key anything.
2. **The member team API returns no team identifier** — and this design deliberately keeps it
   that way. `TeamRevealView` stays `{ teamName, members, summary, strengths,
   projectDirection }`. Both submission routes resolve the caller's run and team **server-side**
   from their session email, so the client never sends `runId` or `teamId` and therefore cannot
   submit on another team's behalf. No change to the team route is needed; the audit's
   suggested prerequisite is avoided rather than implemented.
3. **Storage is public-read only** and there is no signed-URL code path in the repo. This is
   the direct reason uploads are out of scope.
4. **`toCsv(headers, rows)` in `src/lib/impact-lab/csv.ts` is the only CSV builder** and it
   already escapes formula-injection prefixes. Reuse it; do not write another.
5. **Member API responses are flat** (`{ success, status, team }`), not the admin
   `{ success, data }` envelope. The member fetch idiom lives in
   `src/app/dashboard/impact-lab/ImpactLabClient.tsx`.
6. **The `revealed` phase early-returns** `<TeamReveal team={team} />`, so the submission UI
   goes inside `TeamReveal`, not appended to the client state machine.
7. **Route order for member writes** is CSRF → rate limit → auth → validation, per
   `src/app/api/impact-lab/profile/route.ts`.
8. **`zodSanitizeUrl` returns `""` rather than throwing** on a rejected scheme, so URL fields
   need an explicit `.refine` to actually reject bad input.

## Data model

```prisma
model ImpactLabSubmission {
  id                String   @id @default(cuid())
  cohort            String
  runId             String            // final run the teams were published from
  teamId            String            // "team-12" within that run's JSON — cannot FK
  teamName          String            // denormalised so exports stay readable
  projectName       String
  pitch             String            // one line
  description       String   @db.Text
  worksVsMocked     String   @db.Text // what actually runs vs what is stubbed
  claudeUsage       String   @db.Text // how the team used Claude
  track             String
  problemTackled    String
  repoUrl           String
  demoUrl           String?
  videoUrl          String?
  slidesUrl         String?           // link to a deck, never an uploaded file
  screenshotUrl     String?
  status            ApplicationStatus @default(PENDING)
  createdByEmail    String
  lastEditedByEmail String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  run ImpactLabMatchRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@unique([runId, teamId])
  @@index([cohort, status])
  @@map("impact_lab_submissions")
}
```

Plus, on `ImpactLabMatchRun`:

```prisma
  submissionsCloseAt DateTime?   // submission window for the teams this run published
  submissions        ImpactLabSubmission[]
```

The deadline lives on the run, not in `SiteSettings`: one final run is one published set of
teams, therefore one submission window. It also keeps the detachment caveat below coherent —
a new final run brings its own window.

Migration is additive (new table, two run columns) and safe to apply ahead of the code deploy,
following the pattern used for `explanations` and the volunteer roles.

## API surface

### Member

Both routes gate on `checkMemberAccess()` (session + the `REQUIRE_EMAIL_VERIFICATION` flag,
currently off).

**`GET /api/impact-lab/submission`**

Resolves the caller's participant row, the latest final run, and their team within it.

```ts
{ success: true, status: "no_team" | "open" | "closed",
  teamName?: string, closeAt?: string, submission?: SubmissionView }

// Everything the form needs and nothing else — no ids, no other team's data.
interface SubmissionView {
  projectName: string
  pitch: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  track: string
  problemTackled: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
  screenshotUrl: string | null
  lastEditedByName: string   // teammate's display name, resolved from the cohort
  updatedAt: string
}
```

- `no_team` — not registered, no final run, or unassigned in that run.
- `closed` — `submissionsCloseAt` is set and in the past. Returns any existing submission
  read-only.
- `open` — editable. `submission` is absent until the team saves once.

**`PUT /api/impact-lab/submission`**

CSRF → `RateLimits.FORM` (10/min, because this is editable, not one-shot) → `checkMemberAccess`
→ zod. Upserts on `(runId, teamId)`.

- 403 when unassigned (`code: "NO_TEAM"`).
- 403 when past `submissionsCloseAt` (`code: "SUBMISSIONS_CLOSED"`).
- Sets `createdByEmail` on insert; always sets `lastEditedByEmail` to the caller.
- `teamName`, `runId`, `teamId`, `cohort` come from the server's own lookup — never from the
  client.

Validation: `projectName` ≤120, `pitch` ≤200, `description`/`worksVsMocked`/`claudeUsage`
≤2000 via `zodSanitizeMultilineText`, `track` ≤80, `problemTackled` ≤300, all URLs through
`zodSanitizeUrl` plus a `.refine(v => v !== "")` so a rejected scheme fails loudly.
`repoUrl` is required; the other four URLs are optional.

### Admin

All gate on `checkApiPermission("impact-lab", …)`. `"impact-lab"` is already a registered
resource, so no RBAC change.

- **`GET /api/admin/impact-lab/submissions?cohort=`** (`view`) — every submission for the
  cohort's final run, plus `missing: { teamId, teamName, members: string[] }[]` for teams that
  haven't submitted. The missing list is derived from the run JSON, so it costs one query.
- **`GET /api/admin/impact-lab/submissions/export?cohort=`** (`view`) — CSV via `toCsv`, one
  row per team, `Content-Type: text/csv; charset=utf-8` and the same
  `Content-Disposition` idiom as the participants export. Member emails follow the existing
  consent rule (included only where the live row has `consentToShareContact`); member names
  always included.
- **`PATCH /api/admin/impact-lab/submissions/[id]`** (`edit`) — `status` only.
- **`PATCH /api/admin/impact-lab/runs/[id]`** (`edit`) — extended to accept
  `submissionsCloseAt` (ISO string or null).

## Participant experience

Inside `src/app/dashboard/impact-lab/TeamReveal.tsx`, below the team, a **Submit your project**
section:

- **Open:** countdown to `closeAt`, the form pre-filled with whatever a teammate already saved,
  and a line reading `Last saved by Brian · 05:47`. `track` and `problemTackled` default from
  the participant's registration answers so most teams only confirm them.
- **Saved:** inline confirmation; the form stays editable.
- **Closed:** read-only summary of what was submitted, with a note to speak to an organiser.
- **Unassigned:** a short explanation and a pointer to find an organiser.

Follows the existing `TeamReveal` visual language (Terminal Noir tokens, `framer-motion`
gated on `useReducedMotion`), uses `csrfHeaders()` from `@/lib/csrf-client` — not the
hand-rolled token fetch in `MatchProfileForm`, which is a pattern to avoid.

## Admin experience

A fourth tab in `ImpactLabDashboard.tsx` — `type Tab` union, the `TABS` array, and one
conditional render, matching the three existing tabs (hardcoded hex, not theme tokens).

**Submissions tab** contains:

1. A header count — `18 of 32 teams submitted` — and the deadline field (datetime input,
   saved through the run PATCH).
2. **Download CSV** as a plain `<a href>`, matching how the other two exports are triggered.
3. The submissions table: team, project name, pitch, links, last edited by, status.
   Row expands to the full text answers.
4. **Not yet submitted** — team name plus member names, so organisers can chase in the room.
   This is the highest-value element on the page at 6am.

## Known limitation, deliberately accepted

A submission attaches to the run that was final when it was written. **If a new run is marked
final after submissions have started, existing submissions detach from the newly-published
teams.** Re-keying them automatically would be guesswork (team ids are positional and would
silently reassign someone's work), so instead: the Submissions tab warns prominently when the
cohort's final run id differs from the `runId` on existing submissions. Surfacing it beats
silently corrupting it.

## Error handling

- No final run yet → member sees `no_team` with a "teams aren't published yet" message.
- Malformed run JSON → `extractFrozenTeams` returns null → treated as no final run, never a
  500 (existing convention).
- Deadline unset (`null`) → submissions are open indefinitely; the UI shows "no deadline set"
  rather than a broken countdown.
- Duplicate save race between two teammates → the `@@unique([runId, teamId])` constraint plus
  upsert makes last-write-wins; P2002 is impossible through the upsert path but is caught and
  returned as 409 if it surfaces.
- Rate limit exceeded → 429 with the limiter's headers, as elsewhere.

## Verification

Gates: `npx tsc --noEmit`, `npx eslint` on touched files, `npm run build`. The matching
engine's `verify:matching` is unaffected but must still pass.

Manual checklist (against a preview deployment, with two accounts on the same team):

1. Member A saves a submission → row created, `createdByEmail` = A.
2. Member B on the same team loads it pre-filled, edits, saves → still one row,
   `lastEditedByEmail` = B.
3. Admin tab shows `1 of N submitted` and lists the other teams under "Not yet submitted".
4. Set `submissionsCloseAt` in the past → member sees read-only; `PUT` returns 403
   `SUBMISSIONS_CLOSED`.
5. Submit a pitch of `=SUM(A1:A9)` → the exported CSV opens in Sheets as text, not a formula.
6. A participant with no team sees the unassigned message and cannot `PUT`.
7. Unverified/unauthenticated request → 401/403 from `checkMemberAccess`.

## Out of scope

- File uploads (revisit once storage moves off Supabase per the migration doc).
- Judge scoring, per-judge scores, leaderboards.
- A public showcase page of submissions or winners.
- Notifying participants by email about submissions — the quota is spent; the dashboard and
  the Luma announcement carry it.
