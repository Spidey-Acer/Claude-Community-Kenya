# 09 — Verification

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

The repo has no unit-test framework, so `scripts/verify-matching.ts` is the
engine's test suite. It's a plain `tsx` script — no Jest, no config — that runs
the matcher on a realistic 15-person fixture and asserts the properties that
matter. Run it:

```bash
npm run verify:matching     # or: npx tsx scripts/verify-matching.ts
```

Exit 0 = all checks passed; exit 1 = something regressed.

## What it asserts

**Determinism** — the whole reason the engine is pure:
- two runs on identical input are deep-equal (`JSON.stringify` equality),
- the result is **invariant to input ordering** (a reversed input produces the
  same teams). This is the real test of the "sort by id up front" decision from
  [03](./03-normalization.md).

**Constraint safety** — the hard rules from [04](./04-constraints.md):
- non-consenting participants are excluded from teams *and* unassigned,
- every placed participant consented,
- nobody is assigned to two teams,
- every consenting participant is either assigned or explicitly unassigned,
- no team contains a blocked pair,
- no team exceeds `maxTeamSize` (when unassigned is allowed),
- any out-of-range team carries a size-violation penalty (nothing fails silently),
- the locked team keeps exactly its pinned members,
- every score lands in `[0, 100]`.

**Together-groups** — the keep-together mechanism from [06](./06-algorithm.md):
- a declared pair and a declared trio each land on one team,
- someone who both asked for and blocked the same person never joins them —
  blocks beat preferences even at group-forming time,
- a run reports how many declared groups it kept together,
- a preference chain longer than `maxTeamSize` is split with an explicit
  warning, and no resulting team exceeds the max,
- with `keepPreferredTogether` off, no keep-together warnings appear, and that
  soft-preference run is itself still deterministic.

## The fixture is chosen to exercise the hard paths

It isn't random data. It deliberately includes:
- a **block** (Felix blocks Amina) — the run proves they never share a team,
  and that his preference for her never unions them into a group either,
- a declared-teammate **pair** (Cynthia → Amina) and **trio** (James, David,
  Grace) — proven to land on one team each, now a hard keep-together rather
  than a soft nudge; a separate 8-person chain fixture proves an over-length
  chain is split into `maxTeamSize` chunks with a warning,
- three **advanced** participants — to show they get distributed, not clustered,
- a **locked pair** — pinned, undersized, and correctly penalised rather than
  quietly "fixed",
- a **non-consenting** participant — excluded entirely.

The script also prints the full result — teams, scores, strengths/weaknesses,
project directions, warnings — so a human can eyeball that the numbers are
sensible, not just that the asserts pass.

## Why this over "add Jest"

The spec is explicit: unit-test the pure functions *if test infra exists*,
otherwise ship a verify script. Adding a test runner is a dependency and a config
surface this project hasn't opted into. One dependency-free script that asserts
determinism and constraint compliance covers the real risks for a deadline build,
and it's trivial to fold into CI later (`npm run verify:matching`).
