# 12 — Admin UI

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

`/admin/impact-lab` is where organisers actually run the matcher. It follows the
repo's admin conventions: a server page (`page.tsx`) renders `AdminHeader` and a
client dashboard; all data flows through the API routes over `fetch`, gated by
the same session + CSRF the rest of the admin panel uses.

## Server page, client dashboard

`page.tsx` is a thin server component (`force-dynamic`) that passes the cohort to
`ImpactLabDashboard`, a client component holding the tab state. This is the same
split every admin page in the repo uses — server for the shell, client for
interactivity — so the new pages sit naturally alongside the existing ones.

## Four tabs, four jobs

- **Participants** — the roster. Table, add form, resilient CSV import (parsed
  and column-mapped in the browser, then posted as drafts), and CSV export.
- **Matching** — the workbench. A settings form (sizes + toggles), a Generate
  button, results as team cards, an Explain-with-Claude button, and a Save-run
  field.
- **Runs** — the archive. Saved runs with mark-final, export-teams, and delete.
- **Submissions** — judging day. Shows `N / teamCount` teams submitted, an
  editable submissions-close deadline, the list of teams that haven't
  submitted yet (with member names, for chasing in the room), a per-submission
  status dropdown, an expandable detail view of each team's write-up, and a
  Download CSV button for the judging sheet. A submission left over from an
  earlier final run is labelled "stale" and excluded from both the count and
  the export — see [14-submissions](./14-submissions.md) for why marking a new
  run final detaches previously-filed submissions.

## The team card renders the score breakdown directly

Each team card shows the total, the members (with the AI's suggested internal role
when available), and a **bar per scoring dimension** — the `raw` value straight
from the engine's `ScoreBreakdown`. Penalties render in red with their reason.
This is the payoff of making the score breakdown a structured object back in
[05-scoring](./05-scoring.md): the UI doesn't recompute or guess anything, it just
draws what the engine already explained.

## AI explanations layer onto the same cards

"Explain with Claude" calls `/explain` and merges the returned `TeamExplanation`s
into the cards by `teamId` — the summary, project direction, and per-member role
suggestions appear in place. When a team falls back to the deterministic
explanation, the card labels it "(deterministic summary)" so the organiser knows
which they're looking at. The page works fully before the button is ever pressed;
the AI is strictly additive, exactly as [10-ai-layer](./10-ai-layer.md) designed.

## Small deliberate touches

- Saving a run jumps to the Runs tab and bumps a `refreshKey` so the list
  reloads — no manual refresh.
- Type-only imports from `@/lib/matching` give the client components the engine's
  `MatchResult` / `TeamExplanation` types with zero runtime cost (the engine code
  is never bundled into the client).
- Every mutating call fetches a fresh CSRF token first, matching the existing
  `CommunityActions` pattern rather than inventing a new one.
