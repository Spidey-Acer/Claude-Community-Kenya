# 14 — Team Project Submissions

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

Once teams are published, they need a place to hand in what they built. This is
the last leg of the pipeline: participants submit a project, organisers chase
the teams that haven't, and judging works from a CSV.

## One row per team, keyed by `(runId, teamId)`

`ImpactLabSubmission` is unique on `(runId, teamId)`, not on a team's own id,
because teams have no table of their own. A team only exists inside
`ImpactLabMatchRun.result` — the frozen JSON written when a run is saved (see
[06-algorithm](./06-algorithm.md)) — so `teamId` is the id from that JSON
(`team-1`, `team-2`, …) and cannot be a Prisma foreign key. Scoping the unique
key to the run as well as the team id is what makes the next section safe: two
different runs can both have a `team-3` without colliding.

## Any member may create or edit it

There's no submitter role. Whoever on the team opens the dashboard first
creates the row; every teammate after that sees the same row pre-filled and
can keep editing it until the deadline. The row tracks who did what —
`createdByEmail` on the first save, `lastEditedByEmail` overwritten on every
save after — so "Last saved by [name]" (`SubmitProject.tsx`) always reflects
the most recent edit, not the original author.

## The deadline lives on the run, not the submission

`ImpactLabMatchRun.submissionsCloseAt` is the single deadline for every team
under that run. One final run is one published set of teams, so it's also one
submission window — there's no reason for per-team deadlines. A `null` value
means open with no deadline. An organiser sets it from the Submissions tab
(below); the admin API accepts only an ISO 8601 string carrying an explicit
UTC offset (`z.string().datetime({ offset: true })`) or `null`. An
offset-less value from a bare `datetime-local` input is rejected with a 400 on
purpose — parsing that string server-side would silently shift the deadline by
the server's own timezone, and Vercel's server clock isn't EAT.

`submissionWindow(closeAt, now)` in `submission-state.ts` is the single
function both the member GET route and the UI's countdown are built from: no
deadline is `"open"`, and the boundary is inclusive — at exactly the deadline,
the window reads `"closed"`.

## Links only, no file uploads

Every asset field — `demoUrl`, `videoUrl`, `slidesUrl`, `screenshotUrl` — is a
URL, and `slidesUrl` is a link to a deck (Drive, Figma, whatever), never an
uploaded file. `repoUrl` is the only required link. This keeps the feature
inside its scope: no storage bucket, no upload endpoint, no file-size limits
to get wrong the night before an event. `submission-schema.ts` accepts a bare
domain typed without a scheme (`github.com/x`) and adds `https://` before
sanitising, so participants don't have to remember the prefix.

## Member routes resolve the team server-side

`GET` and `PUT /api/impact-lab/submission` never take a `runId`, `teamId`,
`cohort`, or `teamName` from the client. `resolveContext()` in `route.ts`
looks up the caller's participant row by session email, finds the cohort's
current final run, and searches that run's frozen teams for the participant's
id. That's the whole trust boundary: because the team identifier is never
client-supplied, nobody can address a `PUT` at a team they aren't on.

- **No team found** — `GET` returns `{ status: "no_team" }` (not an error);
  `PUT` returns 403 with `code: "NO_TEAM"`.
- **Window closed** — `PUT` returns 403 with `code: "SUBMISSIONS_CLOSED"`.
  `GET` still returns the submission so the UI can render it read-only.
- **Not signed in** — 401, same as every other member route.

`PUT` upserts on the `runId_teamId` composite key: `create` stamps both
`createdByEmail` and `lastEditedByEmail` to the caller; `update` only touches
`lastEditedByEmail`, so the original author is preserved.

## Admin routes

| Route | Method | Permission | Notes |
|-------|--------|-----------|-------|
| `/admin/impact-lab/submissions` | GET | `view` | Every submission for the cohort, plus the chase-list |
| `/admin/impact-lab/submissions/[id]` | PATCH | `edit` | Move `status` through `PENDING` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` |
| `/admin/impact-lab/submissions/export` | GET | `view` | Judging CSV |
| `/admin/impact-lab/runs/[id]` | PATCH | `edit` | Also carries `submissionsCloseAt` — the deadline lives on the run route, not a submissions one |

The list route's `missing` array is built from `missingTeams()`
(`submission-state.ts`): every team in the final run's frozen roster that
doesn't yet have a row, with member display names resolved from the live
participant table so organisers can read out who to chase by name, in the
room. An id that can't be resolved to a name falls back to the raw id rather
than being silently dropped — a missing name must never hide a missing team.

The status PATCH only ever touches `status`; the submission's content is the
team's own and is never edited by an organiser through this route.

## The judging CSV is scoped to the final run — and that has a consequence

`submissions/export` only includes rows whose `runId` matches the cohort's
current final run. This is deliberate, not incidental: team ids are
positional (`team-1`, `team-2`, …), reassigned fresh every time a run is
generated, so a submission saved against an old run's `team-3` almost
certainly does not describe the same people as the current run's `team-3`.
Pairing them in a judging sheet would attribute one team's project to another
team's roster.

The operational consequence: **marking a new run final after teams have
already started submitting detaches their submissions.** Those rows aren't
deleted — the admin submissions list still shows them, flagged `isStale: true`
— but they drop out of the export and out of the "N of M submitted" count for
the newly-final run. If a team's composition needs to change after
submissions have started, fix it by hand (edit the participant/team data
directly) rather than re-running and re-publishing the match — a fresh
`Generate → Save → Mark final` pass will strand any submissions already filed.

When there's no final run at all, the export returns headers only — zero
rows — rather than falling back to unfiltered cohort submissions.

The CSV also only exposes a teammate's email in the `Member emails (consented)`
column where their live participant row has `consentToShareContact: true` —
the same consent rule the final-teams export uses
([11-api](./11-api.md)). `toCsv()` escapes formula-injection prefixes, so a
pitch that starts with `=`, `+`, `-`, or `@` lands in judges' spreadsheets as
text, never as a formula.

## Verification

This repo has no unit-test framework. `scripts/verify-submissions.ts`
(`npm run verify:submissions`) is an assertion harness in the same style as
`scripts/verify-matching.ts` ([09-verification](./09-verification.md)): it
exercises the pure functions in `submission-state.ts` —
`submissionWindow`, `findTeamFor`, `missingTeams`, `submissionCsvRow` — with
no database and no clock. Route and UI behaviour beyond that is covered by
`npx tsc --noEmit`, `npm run build`, and a manual checklist walked against a
preview deployment before the branch merges.
