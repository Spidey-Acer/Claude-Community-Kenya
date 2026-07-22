# Impact Lab Team Matching — Implementation Spec / Prompt

**Status:** Ready to execute. Paste the "Implementation Prompt" section below into Claude Code
(or run it via the Claude API) to build the feature in this repo.

**Deadline context:** Impact Lab / AI Mashinani runs **25–26 July 2026** (see
`prisma/events-backfill.ts`). Teams have already applied; matching must be usable before the event.

**Provenance:** Design informed by an audit of
[best-ed/HackMatch-AI](https://github.com/best-ed/HackMatch-AI) (2026-07-21).
That repo has **no LICENSE file** and `"private": true` in package.json — all rights reserved by
default. **Do NOT copy code from it.** This spec describes the concepts (which are not
copyrightable) for a clean reimplementation in our own stack, or obtain written permission from
the repo owner first.

---

## What HackMatch-AI does (audit summary)

- **Deterministic matcher, AI explains only.** Teams are assigned by a pure algorithm; an
  optional LLM call explains the already-final assignments and can never change them.
- Algorithm pipeline: validate → normalize roles/skills → exclude non-consenting →
  honor blocked-teammate + locked-team constraints → seed teams with scarce/high-impact roles →
  distribute advanced participants → greedy fill by marginal contribution score →
  deterministic pairwise swap optimization → per-team 0–100 score breakdown.
- Score dimensions (weighted): role coverage, skill balance, experience balance, interest
  alignment, availability overlap, participant preference satisfaction, minus constraint
  penalties.
- Organizer features: cohorts, settings presets, locked teams, saved runs (frozen snapshots),
  mark-final, CSV import/export, health checks.
- Weaknesses we will NOT inherit: localStorage persistence (data trapped in one browser),
  env-gated admin auth that is **open by default**, OpenAI-only explanation layer.

## Feasibility verdict

**Yes — port is feasible.** The matching engine is ~1,450 lines of dependency-free TypeScript
concepts that map cleanly onto our stack. Our repo already has the hard parts HackMatch lacks:
real Postgres/Prisma persistence, NextAuth-protected admin, RBAC, rate limiting, audit logging.
Lean scope below is 1–2 focused days.

## Open decision (confirm with Peter before running)

**Where does participant data come from?**
- **Default (lean):** CSV import into admin from wherever applications live today
  (Luma export / Google Form sheet). Ship this first.
- **Stretch:** public registration form at `/impact-lab/register` in the Karibu design.
  Only if time remains before the 25th.

---

## Implementation Prompt

> Copy everything below into Claude Code, running in the Claude-Community-Kenya repo.

You are implementing **Impact Lab team matching** for claudekenya.org (this repo: Next.js 16
App Router, TypeScript strict, Prisma 7 + PostgreSQL, NextAuth v5, Tailwind v4, Upstash rate
limiting). Follow the repo's CLAUDE.md conventions. Do not copy code from any external repo —
implement from this spec. Plan first, then execute.

### 1. Data model (Prisma — use `npm run db:migrate`, never reset)

Add two models (+ enums), following existing schema conventions:

- `ImpactLabParticipant`: id, cohort (String, default "impact-lab-2026-07"), fullName, email
  (unique per cohort), phone?, institution?, experienceLevel (enum BEGINNER/INTERMEDIATE/ADVANCED
  — reuse existing `Experience` enum if compatible), primaryRole (String), secondaryRoles
  String[], technicalSkills String[], interests String[], availability String[],
  projectIdeas? (Text), preferredTeammates String[] (emails), blockedTeammates String[]
  (emails, never shown publicly), consentToMatch Boolean @default(false), consentToShareContact
  Boolean @default(false), createdAt/updatedAt. Index on (cohort).
- `ImpactLabMatchRun`: id, cohort, name, notes?, isFinal Boolean @default(false),
  settings Json, result Json (teams + score breakdowns + warnings + unassigned),
  participantsSnapshot Json, createdBy (relation to User), createdAt. Only one run per cohort
  may be `isFinal` — enforce in the API layer.

### 2. Matching engine — `src/lib/matching/` (pure, deterministic, zero deps)

Modules: `types.ts`, `normalization.ts`, `constraints.ts`, `scoring.ts`, `algorithm.ts`,
`optimization.ts`, `explanations.ts` (deterministic fallback). Rules:

- **Determinism is a hard requirement:** no `Math.random`, no `Date.now` inside the engine;
  all iteration orders sorted (by id as final tiebreaker). Same input → identical output.
- Settings type: desiredTeamSize (default 4), minTeamSize 3, maxTeamSize 5, numberOfTeams?,
  allowUnassignedParticipants, requireBuilder, requirePresenter, preventBeginnerOnlyTeams,
  distributeAdvancedParticipants, lockedTeams?, and weights for: roleCoverage (2),
  skillBalance (1.5), experienceBalance (1.4), interestAlignment (1), availabilityOverlap (1),
  participantPreferences (0.8).
- Normalization: lowercase/trim roles, skills, interests; map synonyms to canonical role slugs
  (builder/developer, designer, presenter/pitcher, data, product).
- Hard constraints: consentToMatch required to be matched; blockedTeammates never share a team;
  locked teams pass through untouched; team size within [min, max].
- Algorithm: (a) compute target team count = ceil(eligible / desiredTeamSize) unless
  numberOfTeams set; (b) seed one scarce/high-impact-role participant per team (scarcity =
  1/roleCount, prioritize presenter > designer > data > product > builder, weight experience);
  (c) if distributeAdvancedParticipants, place advanced participants round-robin by best
  marginal contribution; (d) fill everyone else greedily into the team where their **marginal
  score contribution** (score-with minus score-without, minus a size penalty, plus a bonus for
  preferred teammates already present) is highest; (e) run deterministic pairwise swap passes:
  try swapping members between team pairs, keep a swap only if total score strictly improves,
  repeat until no improvement or max 3 passes.
- Scoring (0–100 per team): weighted sum of the six dimensions, minus penalties (beginner-only
  team, missing builder/presenter when required, size violations). Return a full breakdown
  object per team — the UI must show WHY a team scored what it did.
- `explanations.ts`: deterministic text summaries (strengths, gaps, suggested internal roles)
  built from the score breakdown — used as fallback when the AI layer is off or fails.

### 3. Claude API explanation layer (env-gated, never assigns)

- `src/lib/matching/ai-explanations.ts` + route `POST /api/admin/impact-lab/explain`.
- Server-side only. Use `ANTHROPIC_API_KEY` env var; model `claude-sonnet-5` via the Messages
  API with **tool use / structured output** enforcing a strict schema: per team — summary,
  strengths[], weaknesses[], suggestedProjectDirection, suggestedInternalRoles (participantId →
  role), warnings[].
- System instruction: "Teams were already assigned by a deterministic algorithm. Explain the
  assignments; never propose changing membership; only reference supplied participants."
- Validate the response: drop explanations for unknown teamIds; role suggestions must map to
  participants actually on that team; any invalid/missing team falls back to the deterministic
  explanation. On any API error, return fallback explanations with a warning — never fail the
  page.
- Send the model only matching-relevant fields (names, roles, skills, levels, availability) —
  no phone numbers, no blockedTeammates.
- Protect the route with existing admin auth + `src/lib/rate-limit` + write an
  `src/lib/audit-log` entry per run.

### 4. Admin UI — `/admin/impact-lab` (follow existing admin panel patterns)

- **Participants tab:** table (name, role, level, skills, consent), CSV import with column
  mapping + preview + row-level validation errors, inline edit, delete. CSV export.
- **Matching tab:** settings form (sizes, toggles, weights), Generate button, results as team
  cards with score breakdown bars, per-team lock toggle, Regenerate (respects locks), warnings
  list, unassigned list.
- **Runs tab:** save current result as named run, list runs, view snapshot, mark one as Final
  (confirm dialog; unmarks any previous final), export final teams CSV (team, member names,
  emails only if consentToShareContact).
- All mutations behind existing CSRF + admin session checks; use existing UI components
  (`src/components/admin/`, `src/components/ui/`).

### 5. Non-negotiables

- `npm run build && npx tsc --noEmit` must pass clean before every commit.
- Conventional commits, one concern per commit, on a feature branch (e.g.
  `feat/impact-lab-matching`).
- No `any`, no console.log, no magic numbers (weights/defaults as named constants).
- Unit-test the engine's pure functions if test infra exists; otherwise add a
  `scripts/verify-matching.ts` script that runs the engine on fixture data and asserts
  determinism (two runs → deep-equal results) and constraint compliance.
- YAGNI: no cohort archive/handoff/backup features from HackMatch — CSV import, match,
  explain, save runs, export. That's the MVP for the 25th.
