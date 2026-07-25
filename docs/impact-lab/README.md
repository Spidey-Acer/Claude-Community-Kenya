# Impact Lab Team Matching

A deterministic hackathon team-matcher for Claude Community Kenya, with an
optional Claude explanation layer. Built for the Impact Lab / AI Mashinani event
from the [implementation spec](../impact-lab-matching-spec.md).

These docs are written to be read **in order** — each explains one logical chunk
of the build and the decision behind it, so the feature doubles as a learning
reference for how to design a small, testable, deterministic engine behind a
Next.js admin panel.

## The one idea to take away

**A pure, deterministic core with a thin, effectful shell around it.** The
matching engine (`src/lib/matching/`) is pure TypeScript — no database, no clock,
no randomness, no network. That single constraint is what buys determinism (same
input → identical output), trivial testing (a plain script, no framework), and a
clean seam for the AI layer (which explains, never decides). Everything else —
Prisma, auth, CSRF, the UI — is the shell that feeds the core and renders its
output.

## Reading order

| # | Doc | What it covers |
|---|-----|----------------|
| 01 | [Data model](./01-data-model.md) | Prisma models, the migration, scoped uniqueness, snapshotting |
| 02 | [Engine design](./02-engine-design.md) | Why the engine is pure; types and constants |
| 03 | [Normalization](./03-normalization.md) | Canonicalizing messy input; the determinism backbone |
| 04 | [Constraints](./04-constraints.md) | The four hard rules; hard vs soft |
| 05 | [Scoring](./05-scoring.md) | Six weighted dimensions; penalties; the transparent breakdown |
| 06 | [Algorithm](./06-algorithm.md) | Together-groups → seed → distribute → greedy fill; the seeding sort trick |
| 07 | [Optimization](./07-optimization.md) | Pairwise-swap local search; keeping constraints safe |
| 08 | [Explanations](./08-explanations.md) | The deterministic fallback, built first |
| 09 | [Verification](./09-verification.md) | Asserting determinism + constraint compliance without a test runner |
| 10 | [AI layer](./10-ai-layer.md) | Claude explains-only; privacy by data-flow; fail-open |
| 11 | [API layer](./11-api.md) | Routes, shared helpers, resilient CSV + Luma import |
| 12 | [Admin UI](./12-admin-ui.md) | The three tabs; rendering the score breakdown |
| 13 | [Audit hardening](./13-hardening.md) | Security/perf fixes from the PR review, and why |

## Try it

```bash
npm run verify:matching   # run the engine on a fixture; assert determinism + constraints
npm run db:migrate        # apply the schema (needs a real DATABASE_URL)
npm run dev               # /admin/impact-lab
```

The Claude explanation layer is optional and env-gated: without `ANTHROPIC_API_KEY`
the deterministic explanations stand in, and nothing else changes.

## Provenance & licensing

The *concepts* were informed by an audit of `best-ed/HackMatch-AI` (the author's
own earlier private project). No code was copied — this is a clean reimplementation
in the community repo's stack, built to serve the community for the hackathon. See
the [spec](../impact-lab-matching-spec.md) for the full audit and rationale.
