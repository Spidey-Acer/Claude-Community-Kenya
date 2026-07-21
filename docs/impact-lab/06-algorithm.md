# 06 — The Algorithm

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

`algorithm.ts` orchestrates everything into a `MatchResult`. It's a **greedy
constructive** algorithm: build teams up one placement at a time, always taking
the locally best legal move, then (next commit) polish with swaps.

## The pipeline

```
consent filter → normalize → resolve locked teams → size the run
   → seed → distribute advanced → greedy fill → optimize → assemble
```

### Step 4 — sizing the run

`targetTeamCount` = `numberOfTeams` if the organiser set it, else
`ceil(pool / desiredTeamSize)`. It's then clamped so (a) there are always enough
teams that nobody is forced above `maxTeamSize`, and (b) we never make more teams
than we have people. Locked teams are *additional* — the count sizes only the
unlocked pool.

### Step 5 — seeding (the clever bit)

We sort the pool by, in order: **role priority** (presenter → builder),
**scarcity** (rarer primary role first), **experience** (advanced first), then
id. Then we drop the first *N* onto the *N* teams, one each.

Why this spreads scarce roles correctly: if presenters are both high-priority and
scarce, they sort to the front, so the first few teams each get one presenter —
never two on one team, never a team left presenter-less while another hoards them.
When presenters run out, designers seed the rest, and so on. One elegant sort does
what would otherwise be a pile of special cases.

### Step 6 — distribute advanced participants

Before the general fill, advanced participants are spread out: each goes to a
legal team with the **fewest advanced members**, ties broken by marginal
contribution. This stops the seniors clustering into one super-team that
steamrolls the event — the whole point is teams that can each stand on their own.

### Step 7 — greedy fill by marginal contribution

Everyone left is placed, in id order, onto the team where their **marginal
contribution** is highest:

```
marginal = score(team + candidate) − score(team)     // how much they help
           − sizePenalty × currentMembers            // prefer smaller teams
           + preferredTeammateBonus (if applicable)  // honour friendships
```

The size penalty is what keeps teams balanced instead of everyone landing on the
one strong team. The preferred-teammate bonus is soft — it steers ties, it never
overrides score or a hard constraint.

If nobody's a legal home: unassigned (when allowed), else the least-bad
block-legal team even if it goes over max — the size penalty then shows up
honestly in that team's score.

## Where determinism comes from

- Participants arrive **id-sorted** from normalization.
- Every sort has **id as the final tiebreaker**.
- Member id lists and the unassigned list are **sorted before returning**.
- No `Math.random`, no `Date.now`, no I/O anywhere in the module.

The result: two runs on the same participants and settings are byte-for-byte
identical. [09-verification.md](./09-verification.md) asserts exactly this.

## The optimization seam

`assign()` takes an optional `optimize` hook and applies it between fill and
assembly. This keeps `algorithm.ts` independent of `optimization.ts`; `index.ts`
wires the real optimizer into `runMatching`. See [07](./07-optimization.md).
