# 02 — Engine Design: Types & Constants

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

## The one rule that shapes everything: the engine is pure

`src/lib/matching/` is a **pure, dependency-free** module. It imports nothing
from Prisma, Next, or the network. It takes plain objects in and returns plain
objects out.

Why this matters:

- **Testability** — we can run it on fixtures in a plain `tsx` script with no
  database (see [09-verification.md](./09-verification.md)).
- **Determinism** — with no I/O, no clock, and no randomness, the same input
  *always* produces the same output. That's a hard requirement (organisers must
  be able to re-run and defend a result), and purity is how we get it for free.
- **Portability** — the audited project trapped its logic behind a UI and
  localStorage. Ours is a library; the API layer and the verify script are just
  two different callers.

The boundary is enforced by types: the API layer maps a Prisma
`ImpactLabParticipant` row into a plain `MatchParticipant` (`types.ts`), and
persists the returned `MatchResult` as JSON. The engine never sees a database row.

## Two participant shapes, on purpose

- `MatchParticipant` — **raw input.** Role strings as the human typed them,
  skills un-normalized. It carries only matching-relevant fields; no phone, no
  institution. `blockedTeammates` rides along *only* so the constraint layer can
  honour it — it is never passed to scoring, explanations, or the AI.
- `NormalizedParticipant` — **the engine's working shape.** Roles canonicalized,
  skills/interests/availability lowercased and deduped. Everything after
  normalization operates exclusively on this.

Splitting them means normalization happens exactly once, at a known boundary, and
the type system stops us from accidentally scoring un-normalized data.

## Why score breakdowns are structured, not just a number

`ScoreBreakdown` keeps every dimension's `raw` (0–1), its `weight`, and its
`weighted` contribution, plus a list of named `PenaltyEntry`. The UI renders this
object directly. A team doesn't just score 72 — it scores 72 *because* role
coverage was perfect but experience balance was weak and it took a −20 for being
beginner-only. Transparency is a feature, not debug output.

## Everything tunable lives in `constants.ts`

No magic numbers anywhere in the engine. Weights, size bounds, the role synonym
map, experience weights, penalty magnitudes, and the greedy-fill bonuses are all
named constants. Two consequences:

1. Reading `constants.ts` tells you exactly how the matcher is tuned.
2. `DEFAULT_SETTINGS` seeds the admin form, and any field can be overridden per
   run through `MatchSettings` without touching engine code.

## Role vocabulary

Five canonical roles: `builder`, `designer`, `presenter`, `data`, `product`.
`ROLE_SYNONYMS` maps free-text ("dev", "UI/UX", "pitcher", "ML engineer") onto
them. The map is deliberately conservative — an unmapped role contributes no
canonical role rather than being force-fit, because a silent wrong mapping is
harder to catch than a visibly missing one.

`ROLE_PRIORITY` (`presenter > designer > data > product > builder`) drives
seeding: scarce, high-impact roles are placed first so no team ends up with
nobody to present. Builders are last because they're usually the most abundant.
