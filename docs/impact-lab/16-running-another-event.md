# 16 — Running another event on this system

The Impact Lab surfaces are not tied to one hackathon. Every row in every Impact
Lab table carries a `cohort` string, and one environment variable decides which
cohort the site serves. Running a second event is configuration plus a seed —
not a fork, and not a second deployment.

This document is the runbook. It was written while standing up the **Afretec
Pre-Incubation Kickoff Hackathon** (C4DLab, University of Nairobi) alongside the
July Impact Lab, and it describes what actually had to happen.

## The one thing to understand first

Two constants in `src/lib/impact-lab/constants.ts` do different jobs:

| Constant | Meaning |
|---|---|
| `DEFAULT_COHORT` | A hardcoded fallback. The most recent cohort. Never edit it to switch events. |
| `ACTIVE_COHORT` | `process.env.IMPACT_LAB_ACTIVE_COHORT`, or `null`. Which cohort is **live right now**. |
| `CURRENT_COHORT` | `ACTIVE_COHORT ?? DEFAULT_COHORT`. **The cohort every surface reads.** |

`CURRENT_COHORT` is what participant lookups, team reads, submissions, judging,
results and the admin dashboard all key on. Setting `IMPACT_LAB_ACTIVE_COHORT`
therefore does two things at once: it points the whole site at the new event,
and it opens member-facing writes (`guardClosedCohort` only lets writes through
for the active cohort).

Unsetting it is the end-of-event switch: the site falls back to `DEFAULT_COHORT`
and every member-facing write closes, leaving a read-only record.

> Historical note: `ACTIVE_COHORT` originally gated only writes, while every
> read was hardcoded to `DEFAULT_COHORT`. Flipping the env var opened writes but
> still served the old event's teams. `CURRENT_COHORT` exists to close that gap.

`safeCohort()` — how all 21 admin API routes resolve a cohort from a query
param — falls back to `CURRENT_COHORT` too. That matters more than it looks:
the judge screen calls `/api/admin/impact-lab/judging` with no `cohort` param
at all, so this fallback *is* the cohort judges score.

### What switching costs the previous cohort

Setting `IMPACT_LAB_ACTIVE_COHORT` points **every** read at the new event. The
previous cohort's rows are untouched at rest, but nothing reads them any more:
its participants sign in, are told no registration was found, and lose access to
their team, results and reviews for the duration of the new event.

That is an acceptable trade for a one-night event and it reverses by unsetting
the variable. It is **not** an archive. Giving past participants durable
read-only access to their own cohort is outstanding work — do not read the step
below as claiming it is handled.

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
   it (`afretec-hackathon-2026-08`). It appears in export filenames.

2. **Get the participants in.** Either the admin import for a matching event, or
   a seed script for pre-formed teams. Two rules learned the hard way:
   - **Validate against the original registration export, not a derived file.**
     The Afretec seed was first built from a reconstructed PDF directory; diffing
     it against the source spreadsheet found a whole team missing (registered
     after the directory was compiled), one team double-registered under two
     names, and three duplicate submissions.
   - **Keep participant data out of this repo.** It is public. Registration
     exports live outside the working tree; `scripts/output/` is gitignored.

3. **Seed the run.** Dry-run first and read the report. `isFinal: true` is what
   makes teams visible — a partial unique index allows only one final run per
   cohort, so re-seeding updates in place rather than creating a second.

4. **Set the environment** in Vercel (no deploy needed):
   - `IMPACT_LAB_ACTIVE_COHORT=<slug>`
   - `IMPACT_LAB_COHORT_LABEL=<event name>` — what the self-registration card
     calls the event. Without it the card shows the raw slug. Since any signed-in
     account sees that card, naming the event is what stops people registering
     for something they are not attending.
   - `JUDGE_ACCESS_CODE=<fresh code>` — **rotate this every event.** It defaults
     to a literal in `judge-access.ts`, and anyone who learned the last event's
     code can otherwise submit scores under any name they type.
   - `REQUIRE_EMAIL_VERIFICATION` — leave unset for a same-room event, where
     verification is friction at the door and the room is the identity check.
     Set it to `true` when people register remotely, since without it someone
     can sign up as another registrant and read that person's team.

5. **Check the event-specific copy.** The submission form and the judging rubric
   carry the assumptions of the event they were built for. For Afretec, the
   Claude-specific submission question and the "Use of Claude" criterion were
   relabelled to be tool-agnostic. Note that the *stored keys* stayed
   (`claudeUsage`, `scores.claude`) — only labels changed, because renaming keys
   orphans stored scores and breaks the export pipeline.

6. **Smoke-test one real account end to end** before telling anyone to sign up:
   log in as a seeded leader, see the team, save a submission, then score that
   submission from `/judge` with the new code and confirm the score lands on
   **this** cohort's leaderboard. That last check is the one that catches a
   cohort-resolution mistake, and it is invisible from the participant side.

7. **Confirm the previous cohort went read-only.** It should: `isCohortActive`
   is false for it, and its data is untouched.

## What participants have to do

Only the team leader strictly needs an account — one submission per team, and
the leader is who organisers chase. Members can self-register from the dashboard
and are then added to their team by the leader via teammate search.

Everyone must sign up with **the same email they used on the registration form**.
That address is the join key between the account and the seeded participant row;
a different address produces "No hackathon registration found" with no way to
reconcile it except by hand.

## When the event ends

Unset `IMPACT_LAB_ACTIVE_COHORT`. Rotate `JUDGE_ACCESS_CODE`. The cohort becomes
a read-only record and the next event repeats this list.
