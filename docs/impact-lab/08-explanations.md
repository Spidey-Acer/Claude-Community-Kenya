# 08 — Deterministic Explanations

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

A score of `72/100` isn't actionable on its own. `explanations.ts` turns each
team's `ScoreBreakdown` into words an organiser can act on: what's strong, what's
weak, who should lead what, and a possible project direction.

## Why this exists *before* the AI layer

This is the **fallback**. The Claude explanation layer ([10](./10-ai-layer.md))
is env-gated and can fail (no API key, rate limit, network). When it's off or
errors, these deterministic explanations are what the UI shows. So they're
written to be genuinely useful on their own — never "AI unavailable" filler.

Building the fallback first also forces a healthy discipline: the AI layer is an
*enhancement*, not a dependency. The feature works fully without it.

## What it produces per team

- **Summary** — score, size, and experience spread ("2 advanced, 2 beginner").
- **Strengths** — dimensions scoring ≥ 66%, named in plain language.
- **Weaknesses** — dimensions scoring ≤ 40%, plus every penalty reason.
- **Suggested internal roles** — `participantId → role`. The most experienced
  member becomes "Team lead & coordinator"; everyone else is labelled by their
  primary role. Purely a starting suggestion for the team to adopt or ignore.
- **Suggested project direction** — the interest shared by the most members
  (≥ 2), if any.
- **Warnings** — the penalty reasons, surfaced explicitly.

## Determinism carries through

Every choice here is deterministic: the team lead is decided by experience then
id; the shared interest breaks ties alphabetically; thresholds are named
constants (`EXPLANATION_STRENGTH_THRESHOLD` etc.). The same team always produces
the same explanation — which matters because [09](./09-verification.md) deep-
equals two full runs, explanations included.

## The `source` field

Every `TeamExplanation` carries `source: "deterministic" | "ai"`. The UI can badge
which produced a given explanation, and the AI layer reuses the exact same
`TeamExplanation` shape — so swapping one for the other is a field change, not a
data-model change.
