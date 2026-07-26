# Impact Lab: AI Mashinani — Judging Card

The scoring instrument for the live demos. This document is the source of
truth; the in-product judging screen implements exactly this and nothing else.

**Design principle:** builders were told, in writing, what they would be scored
on. The card scores those five things at those five weights. Anything a judge
was never told to look for — a revenue model, a go-to-market plan — is not on
this card, because no team was asked to build one.

**Constraint that shaped it:** three minutes of demo, two minutes of questions,
then the judge moves to the next table. Every question is answerable from what
just happened in front of them, with a phone in one hand.

---

## Header

> **Impact Lab: AI Mashinani — Judging Card**
>
> One card per team. Score what you saw, not what you think they meant.
> You can revise a card until scoring closes.

---

## Q1 · Judge

**Type:** taken from the signed-in account (no typed name)
**Required:** yes, implicitly

Judges sign in, so a card is tied to a real person. This replaces a free-text
name field, which allows typos, duplicates, and a second card from the same
judge silently double-counting their opinion.

---

## Q2 · Which team are you scoring?

**Type:** searchable list of the real teams
**Required:** yes

Each entry shows **table number, track, and project name**, with links to the
repo and demo. A judge picks a team the way they perceive it — "Table 12,
Kilimo, Sokoni" — rather than translating it into a number.

Every team in the final run appears. There is no fixed upper bound.

---

## Q3–Q7 · The five criteria

Each scored **1–5**, each anchored identically so judges calibrate the same way:

| Score | Meaning |
|---|---|
| **1** | Not shown / insufficient |
| **2** | Attempted, unsatisfactory |
| **3** | Neutral |
| **4** | Good |
| **5** | Outstanding |

A **1 earns zero points**, not a fifth of the marks. "Not shown" must not be
worth anything.

### Q3 · Impact on the named beneficiary — 25 points
> Does this measurably help the specific person the team named? Not a market —
> a person.

### Q4 · A working demo — 25 points
> Did it actually run in front of you? Working software only — what is real
> versus stubbed.

### Q5 · Use of Claude — 20 points
> How well did the team use Claude to get further than they could have alone?

### Q6 · Beneficiary clarity — 15 points
> Can they say who this helps and what that person struggles with today, in one
> sentence?

### Q7 · Presentation — 15 points
> Was the three minutes clear, honest, and well used?

**Total: 100 points.**

---

## Q8 · What should this team hear?

**Type:** long answer
**Required:** no

Optional on purpose. Feedback is the most valuable thing a judge produces and
the first thing to get skipped when demos run late — but a judge who cannot
save a score without writing a paragraph will write "good" five times and mean
none of it. Optional and prominent beats required and hollow.

Every judge's written feedback reaches the team.

---

## How scores become results

- **A judge's card** → weighted total out of 100: `(score − 1) ÷ 4 × weight`,
  summed across the five criteria.
- **A team's standing** → the **mean** of its judges' totals. Averaged, never
  summed, so a team seen by four judges is not beaten by an identical team seen
  by three.
- **Ties** break by team id, so the leaderboard never reorders itself between
  two loads of the same page.
- **Track winner** → the highest-scoring team within each of the five tracks.
- **Overall champion** → the highest-scoring team across all tracks.
- **Partial cards count.** A judge who scores four criteria and gets pulled away
  contributes what they scored. Unscored criteria earn nothing rather than
  voiding the card.
- **Nobody scored yet** is surfaced explicitly. At 5 AM the failure mode is a
  team no judge reached, and silence looks identical to a low score.

---

## What is deliberately not on the card

- **Business model, market size, go-to-market.** Never in the brief. Scoring
  them would mark teams against a brief they never received.
- **Free-text sector.** The track is already known per team; asking a judge to
  retype it produces five spellings of "Kilimo".
- **A typed judge name.** Sign-in is the identity.
- **Per-judge score visibility.** A judge sees their own card and the aggregate,
  never another judge's individual numbers — seeing them anchors scoring.
