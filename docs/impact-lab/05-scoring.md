# 05 — Scoring

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

`scoreTeam(members, context)` returns a `ScoreBreakdown`: six weighted
dimensions, a normalized 0–100 total, and a list of named penalties. It never
checks hard constraints — by the time a team is scored it's already legal.

## The six dimensions

Each is a **pure function** returning a raw score in `[0, 1]`. Keeping them
separate and exported means the verify script and the UI can call them
individually, and each is independently explainable.

| Dimension | What it rewards | How |
|-----------|-----------------|-----|
| `roleCoverage` | Having the different roles a project needs | distinct canonical roles / 5 |
| `skillBalance` | A complementary, non-redundant skill set | distinct skills / total skill mentions |
| `experienceBalance` | A mix of levels *with* a mentor present | ½ level-spread + ½ has-non-beginner |
| `interestAlignment` | Shared ground to pick a project | average pairwise interest Jaccard |
| `availabilityOverlap` | Times everyone can actually meet | slots shared by all who stated any / union |
| `participantPreferences` | Friends who asked to be together | avg fraction of resolvable wishes satisfied |

## How raw scores become a 0–100 total

```
sumWeighted = Σ (raw_d × weight_d)
maxWeighted = Σ weight_d              // every raw maxes at 1
base        = sumWeighted / maxWeighted × 100
total       = clamp(base − Σ penalties, 0, 100)
```

Normalizing by `maxWeighted` means the total is always on a 0–100 scale
regardless of how the weights are set — an organiser can double a weight without
blowing the scale. Default weights (role coverage 2, skill 1.5, experience 1.4,
interest 2.5, availability 1, preferences 0.8) live in `constants.ts`.
`interestAlignment` was raised from the spec's original 1 to sit alongside
`roleCoverage` at the top: for this event, interests carry each participant's
declared track choice, and each track is one fixed problem, so aligning on
interests now means aligning on the actual problem a team will build.

## Penalties are separate from dimensions — deliberately

Penalties (`beginner-only −20`, `no builder −15`, `no presenter −15`, `size
violation −12`) are subtracted *after* normalization and returned as their own
list. Why not fold them into a dimension?

- **They're categorical, not gradual.** A team either has a presenter or it
  doesn't. That's a discrete cliff, not a smooth 0–1 signal.
- **Explainability.** "Scored 58 (−20 beginner-only)" reads far better than a
  mysteriously deflated experience-balance number.

Note the interplay with soft settings: `requireBuilder`/`requirePresenter` here
produce a *penalty*, not a hard block. Truly requiring a role is impossible when
there simply aren't enough presenters to go around — so we make missing one
expensive rather than forbidden, and surface it. Hard blocking lives only in
[constraints](./04-constraints.md) (consent, blocks, size cap at placement time).

## Edge cases, and why they're chosen

- **Empty availability** is ignored, not counted as "never available", so one
  person leaving it blank doesn't zero out an overlapping team.
- **Unresolvable preferences** (a preferred email that never registered) are
  dropped before scoring — a team isn't punished for a wish it *couldn't* grant.
- **No preferences at all** → `participantPreferences = 1`. Nothing was left
  unsatisfied, so the dimension is vacuously full rather than zero.
