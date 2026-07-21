# 03 — Normalization

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

`src/lib/matching/normalization.ts` is the boundary where messy human input
becomes clean, canonical data. Every stage after this can assume the data is
tidy — which is exactly why we do it once, here.

## What it cleans

| Field | Raw | Normalized |
|-------|-----|------------|
| roles | `"Dev"`, `"UI/UX"`, `"Pitcher"` | `builder`, `designer`, `presenter` |
| skills / interests / availability | `" React "`, `"react"` | `react` (deduped) |
| emails | `" Ann@X.io "` | `ann@x.io` |

## The determinism backbone: sort by id, once

`normalizeParticipants` sorts the input by `id` before mapping. This is small but
load-bearing. Every later stage (seeding, greedy fill, swap passes) iterates over
participants; if that iteration order depended on how rows arrived from the
database or a CSV, two runs on the same data could diverge. Fixing the order at
the entry point means the whole pipeline inherits a stable order.

Combined with "no `Math.random`, no `Date.now`" inside the engine, this is what
makes **same input → identical output** true.

## Dedupe preserves first-seen order

`normalizeTokenList` and `normalizeEmailList` dedupe with a `Set` but keep the
first occurrence's position rather than sorting alphabetically. Two reasons:

- The order a participant listed their skills carries mild signal (they tend to
  list their strongest first); we don't destroy it.
- It's still deterministic, because the input order is already fixed upstream.

## Unmapped roles are dropped, not guessed

`canonicalizeRole` returns `CanonicalRole | null`. If someone writes "vibes
coordinator", it maps to nothing and contributes no canonical role. We could
fuzzy-match, but a *wrong* mapping is invisible and corrupts scoring silently,
whereas a *missing* one shows up as a gap the organiser can eyeball and fix in
the participant record. Conservative on purpose.

## `roles` vs `primaryRole`

- `roles` — the full canonical set (primary + secondaries), deduped, **primary
  first**. Used by role-coverage scoring: a person covers all the roles they can.
- `primaryRole` — just the canonical primary, or null. Used by seeding, where we
  care specifically what someone leads with.
