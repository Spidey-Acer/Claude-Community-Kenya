# 04 — Hard Constraints

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

## Hard vs soft

The engine has two kinds of rules:

- **Hard constraints** (this file) — inviolable. No score, however high, may
  break them. Checked *before* a placement is scored.
- **Soft preferences** (scoring, [05](./05-scoring.md)) — things we optimise
  *for*, expressed as points. A better arrangement can outweigh them.

Keeping these separate is the core discipline of the whole matcher. The scorer
never has to worry about legality, because it only ever ranks arrangements that
are already legal.

## The four hard constraints

### 1. Consent — filtered on raw input

`partitionByConsent` runs on raw `MatchParticipant`s, before normalization. A
participant without `consentToMatch` never enters the engine's working set. The
payoff: every `NormalizedParticipant` downstream has, *by construction*, already
consented — no stage has to re-check. Excluded ids come back so we can warn the
organiser "3 people weren't matched: they haven't consented."

### 2. Blocks — symmetric

`participantsConflict(a, b)` is true if *either* blocked the other. If A doesn't
want to work with B, we keep them apart whether or not B reciprocated. Blocks are
the one place `blockedTeammates` is read — and it's read only here, never passed
to scoring, explanations, or the AI layer. Privacy by data-flow, not by promise.

Blocks reach one step further than placement: `groups.ts` ([06](./06-algorithm.md))
calls this same `participantsConflict` before turning a declared preferred-teammate
into a keep-together edge, so a blocked pair can never be unioned into the same
group either. Blocks beat preferences at every stage, not just at placement time.

### 3. Locked teams — pass through untouched

`resolveLockedTeams` maps organiser-pinned teams (given by email, the identifier
humans use) to participant ids. It defends against two real mistakes:

- an email that matches nobody eligible → skip + warn,
- the same person pinned to two teams → keep the first, skip + warn.

Resolved locked members are removed from the pool the algorithm distributes, and
their teams are emitted as-is. This replaces the audited project's behaviour
cleanly: the organiser's manual decisions are respected absolutely.

### 4. Size — one gate for every placement

`canPlace(candidate, members, settings)` is the single function every placement
passes through: it returns true only when the candidate adds no block conflict
**and** the team is under `maxTeamSize`. `isValidTeamSize` separately validates a
*finished* team against `[min, max]` so the scorer can penalise undersized teams
that couldn't be avoided (e.g. leftover participants when unassigned isn't
allowed).

## Why check legality before scoring, not after

The naive approach — build teams by score, then throw out illegal ones — wastes
work and can paint you into a corner (the best-scoring arrangement might be
illegal, and the legal fallback arbitrary). Gating at placement time means the
search space *is* the legal space. Every intermediate state the algorithm holds
is already valid.
