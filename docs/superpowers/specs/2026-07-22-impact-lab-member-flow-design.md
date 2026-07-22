# Impact Lab member flow — design spec

**Date:** 2026-07-22 · **Deadline:** build complete 2026-07-23 (event 2026-07-25/26, 120 confirmed)
**Approach:** A — member-gated matching profile (approved by Peter)

## Goal

Participants who registered on Luma create accounts on claudekenya.org (existing `/signup`),
complete a 2-minute hackathon matching profile from their dashboard, and — once teams are
finalized — see their own team on the dashboard. Admin imports the Luma CSV, runs the
matcher, and marks a run final (all already shipped in PR #46).

## Non-goals (v2, next hackathon)

- Self-serve partner browsing / team formation UI. The engine's `preferredTeammates` /
  `blockedTeammates` fields, captured in the profile form, cover partner preference.
- WhatsApp Business API integration. Comms go via a plain WhatsApp group, manually.
- Public (unauthenticated) profile form.

## Flow

1. Admin imports Luma CSV → `ImpactLabParticipant` rows (name + email, cohort default).
2. WhatsApp blast: "create your account with the SAME email you used on Luma, complete
   your hackathon profile" → link to `/dashboard/impact-lab`.
3. Member logs in → dashboard shows an **Impact Lab card** (status-aware).
4. `/dashboard/impact-lab`: profile form (only if a participant row matches their email).
5. Friday 6pm EAT: deadline. Admin runs match, reviews, marks run **final**.
6. After final run exists: `/dashboard/impact-lab` switches to **team reveal** view.

## New surface

### API (member-authenticated, NOT admin RBAC)

- `src/app/api/impact-lab/profile/route.ts`
  - `GET` — own participant row for the active cohort, matched by
    `session.user.email` (lowercased). Not found → `{ registered: false }` (200).
  - `PUT` — update own row. **Only if the row already exists** (no self-registration
    into the cohort — walk-ins are added by admins). Editable fields: `fullName`,
    roles, skills, experience level, project interests, availability,
    `preferredTeammates`, `blockedTeammates`, `consentToMatch`,
    `consentToShareContact`. NOT editable: `email`, `cohort`, any team-lock fields.
    Validate with the existing zod participant draft schema (subset), reusing
    `src/lib/impact-lab/participant-schema.ts` sanitizers.
- `src/app/api/impact-lab/team/route.ts`
  - `GET` — latest run for the active cohort where `isFinal = true`; locate the team
    containing the caller's participant id inside the frozen `result` JSON. Returns
    team name, members (fullName, roles, suggested internal roles), strengths,
    project direction, and teammate contact info **only for teammates with
    `consentToShareContact = true`**. No final run → `{ status: "pending" }`.
    **Do not return the numeric team score** — show strengths/direction only.

### UI

- `src/app/dashboard/impact-lab/page.tsx` + client components. Single page, four states:
  1. **Not registered** — friendly "we couldn't find a hackathon registration under
     {email}" + note to use the Luma email or contact organizers (Discord/WhatsApp links).
  2. **Profile form** — pre-filled from the imported row; save button; completion state.
  3. **Waiting** — profile saved, teams not final: "Teams drop Saturday morning."
  4. **Team reveal** — teammates, roles, suggested internal role per member, strengths,
     suggested project direction, teammate contacts (consent-gated).
- Dashboard card on `/dashboard/page.tsx` linking to the page, showing the same state.
- UI must match existing dashboard component patterns/design tokens exactly.

## Security & rules

- Session required on both routes (same helper pattern as existing member/dashboard APIs —
  scout and mirror exactly, including CSRF handling on mutations if the dashboard
  profile editor uses it).
- **Require verified email** (`emailVerified`) before showing/accepting the hackathon
  profile — otherwise an unverified account could claim someone else's Luma email.
  Reuse the existing `VerifyEmailBanner` flow to prompt.
- Rate-limit the PUT (existing `rateLimit` util, standard bucket).
- Email matching is case-insensitive on both sides.
- All strings sanitized via existing zod sanitizers; arrays length-capped per the
  existing participant schema.

## Constants

- Active cohort: reuse the cohort default/constant from `src/lib/impact-lab/`
  (scout confirms the exact export; do not hardcode a second copy).

## Testing / verification

- `npx tsc --noEmit` clean, `npm run verify:matching` still green, `eslint` clean on
  new files. Build compiles (local full build breaks on missing Supabase env in an
  unrelated pre-existing route — not a gate).
- Review pass: guard parity on the two new routes vs existing member API baseline;
  correctness of team extraction from the frozen run JSON; consent gating on contacts.
