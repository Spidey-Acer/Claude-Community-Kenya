# 07 — Pairwise Swap Optimization

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

## Why greedy isn't enough

The greedy fill ([06](./06-algorithm.md)) places each participant onto the best
team *at the moment they're placed*. But it can't see the future: someone placed
early might have been a better fit for a team that didn't exist yet, or a later
arrival might strand an earlier one on the wrong team. Greedy gets a good answer,
rarely the best one.

## Local search: swap and keep what helps

`optimizeAssignment` does a classic **local search**. For every pair of teams and
every pair of members across them, it tries the swap and keeps it only if the two
teams' **combined score strictly improves**:

```
delta = score(teamI after) + score(teamJ after)
      − score(teamI before) − score(teamJ before)
keep the swap ⟺ delta > ε
```

Two properties make this safe:

- **Size-preserving.** A swap is one-out-one-in per team, so team sizes never
  change. The optimizer can't undo the balance the fill worked to achieve.
- **Monotonic.** Every accepted swap strictly raises the total score, and the
  total is bounded (≤ 100 × teams), so it converges. `MAX_SWAP_PASSES` (3) caps
  it regardless, which also bounds the O(passes × teams² × size²) cost.

## Two things that are easy to get wrong

1. **A swap can create a block conflict.** The pre-swap teams were conflict-free,
   but moving people around can put two people who blocked each other together.
   So every candidate swap re-checks `teamHasConflict` on *both* resulting teams
   and skips illegal ones. Hard constraints still win, always.
2. **Locked teams must not move.** They're filtered out before optimization and
   spliced back untouched in their original positions.
3. **Together-group members must not move either.** A group is a hard unit from
   placement onward, so a swap that pulled one member out would silently break
   it. Unlike locked teams, grouped members stay in the optimizable pool — the
   loop just skips any candidate found in `context.pinnedTogetherIds`
   ([groups.ts](../../src/lib/matching/groups.ts)), the same set the algorithm
   populated in [06, Step 5](./06-algorithm.md).

## Determinism, again

Teams are visited in fixed order, members in id-sorted order, and we take
**first-improvement** (apply the first improving swap, keep scanning) rather than
searching for the single best swap. Same input → same swaps → same output. The
`ε` (`SWAP_IMPROVEMENT_EPSILON`, `1e-9`) exists purely so floating-point noise
can't register as an "improvement" and churn between equivalent arrangements.

## Wiring

`algorithm.ts` stays independent of this module via its `optimize` hook.
`index.ts` injects `optimizeAssignment` into `runMatching`, so every caller gets
an optimized result by default while the two modules never import each other.
