# 16 — Running another event on this system

The Impact Lab surfaces are not tied to one hackathon. Every event is a row in
the `Event` table (`src/lib/impact-lab/event-store.ts`), and the admin
dashboard is where you create, launch, close and archive one. Running a
second event is a dashboard flow plus a seed — not a fork, not a second
deployment, and not an env-var change.

This document is the runbook. It was written while standing up the **Afretec
Makerthon 2026** (C4DLab, University of Nairobi) alongside the July Impact Lab,
and it describes what actually had to happen.

## The one thing to understand first

There is no single "active cohort" any more. Each event carries its own
lifecycle status — `DRAFT`, `LIVE`, `CLOSED`, `ARCHIVED` — set from **Admin →
Impact Lab → Events tab**:

| Action | Effect |
|---|---|
| **Create** | Adds a new event in `DRAFT`. Not yet visible to members, no writes accepted. |
| **Launch** | Moves the event to `LIVE`. Member-facing writes for that cohort open (`guardClosedCohort` reads the event's own status). |
| **Close** | Moves the event to `CLOSED`. Writes stop; reads stay open as a historical record. |
| **Archive** | Moves the event to `ARCHIVED`. Drops out of the admin default-cohort picker. |

Several events can be `LIVE` at the same time — closing one no longer takes
any other event offline. Each member's dashboard shows every event they have
a participant row in; each admin/judge screen defaults to the newest
non-archived event, preferring whichever is `LIVE`.

`DEFAULT_COHORT` (`src/lib/impact-lab/constants.ts`) still exists, but only as
the degrade target for an environment whose tenancy migration has not run —
never edit it to switch events, and it plays no role once the migration and
seed are in place.

### What launching costs the previous cohort

Nothing. Because status lives per-event in the database instead of a single
global pointer, launching a new event does not change what any other event's
participants can read or how their team, results and reviews resolve. Closing
an event is a decision about that event alone.

## Two kinds of event

**Teams are formed at the event** (the July Impact Lab). Participants register,
fill a matching profile, and the engine builds teams. Everything in docs 02–10
applies. Nothing extra is needed.

**Teams are already formed** (the Afretec hackathon). Startups registered as
teams weeks earlier. No matching runs at all — but everything downstream of
matching (team reveal, submissions, judging, results) still works, because those
read teams out of `ImpactLabMatchRun.result` JSON and do not care how the teams
got there. You seed one final run whose `result` is the roster you already have.

`scripts/seed-hackathon-cohort.ts` is the worked example. `Team.score` is zeroed
and the run carries a warning saying so, because a team nobody matched has no
meaningful match score and the admin dashboard should not imply otherwise.

## Runbook

1. **Choose a cohort slug.** Must match `/^[a-z0-9][a-z0-9-]{0,59}$/`; date-suffix
   it (`afretec-makerthon-2026-08`). It appears in export filenames.

2. **Create the event.** Admin → Impact Lab → Events tab → New event. Fill in
   the organisation, title, dates, location and format note — this is what
   member-facing surfaces and exports display, so it replaces what used to be
   `IMPACT_LAB_COHORT_LABEL`. The event starts in `DRAFT`; it is not visible to
   members and accepts no writes until you Launch it.

3. **Get the participants in.** Either the admin import for a matching event, or
   a seed script for pre-formed teams. Two rules learned the hard way:
   - **Validate against the original registration export, not a derived file.**
     The Afretec seed was first built from a reconstructed PDF directory; diffing
     it against the source spreadsheet found a whole team missing (registered
     after the directory was compiled), one team double-registered under two
     names, and three duplicate submissions.
   - **Keep participant data out of this repo.** It is public. Registration
     exports live outside the working tree; `scripts/output/` is gitignored.

4. **Seed the run.** Dry-run first and read the report. `isFinal: true` is what
   makes teams visible — a partial unique index allows only one final run per
   cohort, so re-seeding updates in place rather than creating a second.

5. **Launch the event.** Admin → Impact Lab → Events tab → Launch. This is the
   only step that opens member-facing writes for the cohort — no Vercel change,
   no redeploy. Other events are unaffected, whatever their status.

6. **Rotate operational secrets.** These still live in Vercel, unlike the event
   itself:
   - `JUDGE_ACCESS_CODE=<fresh code>` — **rotate this every event.** It defaults
     to a literal in `judge-access.ts`, and anyone who learned the last event's
     code can otherwise submit scores under any name they type.
   - `REQUIRE_EMAIL_VERIFICATION` — leave unset for a same-room event, where
     verification is friction at the door and the room is the identity check.
     Set it to `true` when people register remotely, since without it someone
     can sign up as another registrant and read that person's team.

7. **Set the judging rubric.** Rubrics are per-event — see
   `src/lib/impact-lab/judging-rubrics.ts` and doc 17 for the admin builder. Do
   not assume the Impact Lab rubric transfers: the Afretec panel supplied eight
   criteria with uneven maxima totalling 50 and points-based arithmetic, where
   Impact Lab has five criteria scored 1–5 and normalises. `rubricForCohort()`
   resolves it, and a cohort absent from that map silently gets the Impact Lab
   rubric — so a new event without a rubric entry will be scored on the wrong
   criteria rather than erroring.

8. **Check the event-specific copy.** The submission form carries the
   assumptions of the event it was built for. For Afretec, the Claude-specific
   submission question was relabelled to ask about AI generally. Note that the
   *stored keys* stayed (`claudeUsage`, `scores.claude`) — only labels changed,
   because renaming keys orphans stored scores and breaks the export pipeline.

9. **Smoke-test one real account end to end** before telling anyone to sign up:
   log in as a seeded leader, see the team, save a submission, then score that
   submission from `/judge` with the new code and confirm the score lands on
   **this** cohort's leaderboard. That last check is the one that catches a
   cohort-resolution mistake, and it is invisible from the participant side.

10. **Confirm the previous cohort is unaffected.** It should be, automatically:
    its own status is whatever you last set it to (typically `CLOSED`), and
    launching the new event does not touch it.

## What participants have to do

Only the team leader strictly needs an account — one submission per team, and
the leader is who organisers chase. Members can self-register from the dashboard
and are then added to their team by the leader via teammate search.

Everyone must sign up with **the same email they used on the registration form**.
That address is the join key between the account and the seeded participant row;
a different address produces "No hackathon registration found" with no way to
reconcile it except by hand.

## When the event ends

Admin → Impact Lab → Events tab → Close. Rotate `JUDGE_ACCESS_CODE`. The cohort
becomes a read-only record and the next event repeats this list — no redeploy,
and no effect on any other event that happens to still be `LIVE`.
