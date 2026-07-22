# 10 — The Claude Explanation Layer

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.

## The rule that makes this safe: AI explains, never assigns

This is the single most important design decision in the whole feature, inherited
from the audited project and kept deliberately: **the LLM has no say in who is on
a team.** The deterministic engine produces the final assignment. Claude is handed
the finished result and asked only to *explain* it in richer prose than the
[deterministic explanations](./08-explanations.md) can.

Why this matters:

- **Determinism survives.** The thing organisers can re-run and defend is the
  algorithm's output, which never depends on a model.
- **No hallucinated teams.** The model can't invent a member, move someone, or
  drop a person — it only ever receives teams that already exist.
- **Graceful degradation.** If the model is off or fails, the deterministic
  explanations stand in. The feature never depends on the API being up.

## What the model receives — and what it never does

`buildPayload` sends a **slim, privacy-safe view** per team: participant id, name,
canonical roles, experience level, skills, availability. That's it.

Never sent: phone numbers, emails, or `blockedTeammates`. Blocked teammates are a
sensitive organiser-only signal; keeping them out of the payload is enforced by
the *shape of the data flow*, not by a promise — `AiParticipantView` simply has no
field for them.

## Structured output, then validate anyway

The call uses the AI SDK's `generateObject` with a Zod schema, so the model is
constrained to return exactly the shape we expect. But structured output
guarantees *shape*, not *truth* — so every response is still validated:

- explanations for **unknown team ids** are dropped (that team falls back),
- **role suggestions** are filtered to participants actually on that team
  (`memberIds.has(participantId)`),
- a team the model **omitted entirely** falls back to its deterministic
  explanation.

The model is a drafting assistant whose output is checked against ground truth,
not a source of record.

## Fail-open to deterministic, always

Every failure path — no `ANTHROPIC_API_KEY`, rate limit, network error, invalid
output — returns the deterministic explanations with a warning. `explainWithAi`
never throws to the caller. The admin route wraps it, so the matching UI renders
whether or not the AI layer is available.

## Model and stack

`claude-sonnet-5`, via the repo's existing `@ai-sdk/anthropic` + AI SDK v6 — the
same stack the Karibu onboarding chat already uses, so no new dependency. The
model id comes straight from the spec; the API key is read from the environment by
`createAnthropic()`. This module is the one non-pure part of the matcher, so it's
kept out of the engine's `index.ts` barrel — the admin route imports it directly,
and it's protected there by admin auth, rate limiting, and an audit-log entry
(see [11-api.md](./11-api.md)).
