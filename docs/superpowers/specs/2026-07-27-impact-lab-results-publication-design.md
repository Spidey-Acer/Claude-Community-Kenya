# Impact Lab — results publication

**Date:** 2026-07-27
**Status:** approved, ready for implementation plan
**Cohort:** `impact-lab-2026-07` (Impact Lab: AI Mashinani, 25–26 July 2026)

## Why this exists

The hackathon is over. Winners were announced live on 26 July. 93 builders have
heard nothing since, and the judging data is sitting in a table nobody but an
organiser can read.

This spec covers publishing that result: what participants see, what admin can
inspect, and the one-way door that stops the record moving afterwards.

## The situation this is being built into

These are measured facts from production, not assumptions. They drive most of
the decisions below.

| Fact | Number |
|---|---|
| Registered | 136 |
| Self checked-in | 62 |
| Placed on a team (door list) | 109 |
| On a team that submitted | **93** |
| Teams in the final run | 37 |
| Teams that submitted | 27 |
| Teams with any score | 23 |
| Score sheets | 73 |
| Sheets missing a criterion | **0** |

**Judges were never calibrated.** Mean score given: Favour 72.2, Cynthia Njagi
66.7, Savannah 54.2, Mercy 48.3 — a 24-point spread. On VilCare the four scores
run 18.8 to 88.8. Teams were seen by two to four judges each, so which judges
walked a row affects a team's average more than small differences in the work.

**The announced result does not match the scores.** The panel deliberated and
announced BiasharaGPT, VilCare, Oryn. On raw portal averages the order is
Whatsy 76.9, BiasharaGPT 75.3, KeyOSk 73.8, Oryn 73.3, with VilCare at 55.3.
No combination of judge exclusions reproduces the announced order.

**Four teams submitted and were never scored** — kilimoeco (Table 15),
OnlyFarmers (27), ChatBook (30), Biashara (32). They submitted 01:29–01:34;
judging began 01:51 and teams submitting at the same time or later were scored.
There is no evidence they were late: `submissionsCloseAt` is null and no
deadline was ever recorded.

**Submissions never closed.** Whatsy edited at 17:34 on the 26th and Oryn at
02:23 on the 27th, both after being judged.

## Decisions

| Decision | Choice |
|---|---|
| Audience | 93 people on teams that submitted |
| Published result | Announced winners at 1–3, every other team ranked below by score |
| Every submission | Reviewed and ranked — no team is published without a result |
| Track winners | Announced winners lead their tracks; rest by top score |
| Own breakdown | Private to that team |
| Judge counts | Never shown to participants |
| Judge exclusion | Admin diagnostic only — cannot reach published output |
| The four unscored teams | Claude drafts, organiser approves, marked writeup-only |
| Mark final | Locks submissions and judging, snapshots the table |
| The nine without accounts | Email carries the result in its body |

### Winners

Overall, exactly as announced in the room — stored verbatim, never recomputed:

1. BiasharaGPT · 2. VilCare · 3. Oryn

Track winners:

| Track | Winner | Basis |
|---|---|---|
| Afya (Health) | VilCare | announced 2nd overall |
| Biashara (Small Business) | BiasharaGPT | announced champion |
| Elimu (Education) | NIA | top score, 72.5 |
| Huduma (Government Services) | Meridian Global Investor OS | top score, 63.8 |
| Kilimo (Agriculture) | Elewa | top score, 70.0 — **provisional** |

Kilimo is provisional because kilimoeco is a Kilimo team and unscored. Track
winners are computed only after the four writeup scores are approved.

The rule stated on the page: *the overall winners lead their tracks; the
remaining tracks went to the highest-scoring team.* Oryn is Biashara, which
BiasharaGPT takes as champion, so Oryn stands on its overall placing.

### The ranking

The announced winners hold positions 1, 2 and 3. Every other team that
submitted is ranked from 4th downward by score. The raw portal order is not
published as a competing table.

This was chosen over publishing the raw table alongside the winners, and it
removes two problems that choice carried: Whatsy would have topped a published
table at 76.9 while winning nothing, and VilCare would have appeared 18th under
a banner announcing it 2nd. Neither now occurs. Whatsy is 4th — its true
standing among the teams not already placed.

Every team that submitted appears. None is omitted, and none is published
without a result.

## Architecture

### Data model

Teams have no table; they live in `ImpactLabMatchRun.result` JSON. Scores key
off `(runId, teamId, judgeEmail)`. Nothing here changes that.

```prisma
model ImpactLabMatchRun {
  // ...existing
  judgingClosedAt    DateTime?  // set by mark-final; blocks score writes
  resultsPublishedAt DateTime?
  announcedWinners   Json?      // verbatim, never recomputed
  resultsSnapshot    Json?      // the exact table that was published
}

model ImpactLabScore {
  // ...existing
  writeupOnly Boolean @default(false)  // scored from submission, no live demo
}

model ImpactLabResultsEmail {
  id            String    @id @default(cuid())
  runId         String
  participantId String
  email         String
  status        String    // queued | sent | failed
  error         String?
  sentAt        DateTime?
  createdAt     DateTime  @default(now())

  run ImpactLabMatchRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@unique([runId, participantId])
  @@index([runId, status])
  @@map("impact_lab_results_emails")
}
```

`@@unique([runId, participantId])` is what makes the send idempotent. Resend's
quota is 100/day and there are 93 recipients — a careless retry exceeds it, so
per-recipient state is required, not optional.

The migration must not disturb the raw-SQL partial unique index
`impact_lab_match_runs_one_final_per_cohort`.

### Snapshot shape

`resultsSnapshot` stores what was published, so later edits cannot rewrite what
people read:

```ts
interface ResultsSnapshot {
  publishedAt: string
  overall: { rank: number; teamId: string; projectName: string }[]
  trackWinners: { track: string; teamId: string; projectName: string; basis: "announced" | "score" }[]
  ranking: {
    rank: number            // 1-3 are the announced winners, then by score
    teamId: string
    projectName: string
    track: string
    average: number
    basis: "announced" | "demo" | "submission"
  }[]
  perTeam: Record<string, {
    rank: number
    criterionAverages: Record<string, number>
    low: number
    high: number
    basis: "demo" | "submission"
  }>
}
```

`ranking` is built by placing the three announced winners at 1–3 in the order
announced, then every remaining submitted team by average descending, ties
broken by teamId so the order is deterministic across loads.

`perTeam` is keyed by team and served only to that team's members. Judge counts
are absent by design. There is no `unscored` state — publish refuses while any
submitted team lacks a score, so it cannot occur.

### Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/admin/impact-lab/judging/audit` | staff | Every judge, every sheet, timestamps, per-judge mean |
| `POST /api/admin/impact-lab/judging/preview` | staff | What-if standings with judges excluded |
| `POST /api/admin/impact-lab/judging/writeup` | staff | Save an organiser-approved writeup score |
| `POST /api/admin/impact-lab/results/publish` | staff | Mark final: lock, snapshot, store winners |
| `POST /api/admin/impact-lab/results/notify` | staff | Send to unsent recipients only |
| `GET /api/impact-lab/results` | member | Published result + own team breakdown |

Guard order on the member route follows the existing convention: CSRF → rate
limit → auth → validation. Admin routes keep `checkApiPermission`. The
code-gated judge session grants nothing here — publishing is staff-only.

`POST .../judging` gains one guard: reject writes when `judgingClosedAt` is set.

### Judging lock and snapshot

`publish` runs in a transaction:

1. `SELECT id FROM impact_lab_match_runs WHERE id = $1 FOR UPDATE`
2. Refuse if `resultsPublishedAt` is already set
3. Refuse if any team that submitted still has no score of any kind — this is
   what stops the four unscored teams being published as blanks by accident
4. Set `submissionsCloseAt` (if unset), `judgingClosedAt`, `resultsPublishedAt`
5. Compute and store `announcedWinners` and `resultsSnapshot`
6. Insert one `ImpactLabResultsEmail` row per recipient with `status: "queued"`

Publishing and sending are separate actions. Publish makes the result visible
and immutable; notify delivers it. A failed send never blocks the dashboard.

### Scoring the four unscored teams

Claude reads each submission and drafts a sheet against the five published
criteria, with reasoning per criterion. Nothing saves until the organiser
approves or adjusts each one. Stored with `judgeEmail = "organiser:<email>"`,
`judgeName = "Organiser review"`, `writeupOnly = true`.

The demo criterion is 25% of the weight and asks whether the thing ran in front
of you. No demo was seen, so the draft states that explicitly and the organiser
sets the number. Anywhere a writeup-only team appears, the marker appears with
it.

Reuses the existing assist route's model and prompt discipline: ground every
statement in what the team wrote, never infer.

### Judge audit and exclusion preview

The audit view lists every judge with their sheets, timestamps and mean, so the
72-vs-48 spread is visible rather than buried.

Exclusion is a **preview**. It recomputes into a side-by-side view showing who
moves and by how much, and warns when an exclusion would leave a team with no
scores. It cannot write, and it cannot reach `resultsSnapshot`. The published
table is always the all-judges table.

This is deliberate. The panel already overrode the arithmetic; a control that
changes published placings by dropping judges would be a dial for shopping
outcomes, which is the opposite of the transparency this is for.

## Participant view

New `results` phase in `ImpactLabClient`. Its `Phase` union has no results
state and its only effect depends on `[reloadKey]`, so both need extending.

Sections, in order:

1. **Winners** — champion and 2nd/3rd, then the five track winners.
2. **Your team** — five criterion scores, the range across judges, your placing,
   the submission as filed. Private to that team.
3. **Full ranking** — announced winners at 1–3, every other team below by score.
   **Position, project and track only — no numeric scores, no judge counts.**

   Scores order the list; they are not printed in it. Printing them would put
   Whatsy at 4th on 76.9 directly above BiasharaGPT at 1st on 75.3, which
   restates the contradiction this ranking was chosen to remove. A team's own
   numbers stay on its own private card, where they are useful feedback rather
   than an invitation to audit the placings.
4. **The note** — how results were decided.

### The note, in full

> **How these results were decided**
>
> Every project that was submitted has been reviewed against the same five
> criteria and ranked. Where the panel saw a live demo, their scores are the
> ones shown. Where a team submitted but the panel did not see it presented,
> the project was reviewed from the written submission instead.
>
> The top three were decided by the judging panel after they had seen the demos
> and discussed the projects together. That conversation is what those placings
> reflect. Every other team is ranked below them on score.
>
> Scores are shown in full because you are entitled to see how your own work was
> assessed.

Plain English, no Swahili in participant-facing copy (existing project rule).

**Copy rules, explicit:**

- No mention of a deadline, cut-off, time cap, or late submission anywhere.
  None was recorded, and the timestamps do not support one.
- No suggestion that a team failed to present, left early, or was missed. Some
  teams did not demo; the results do not comment on why.
- No apology framing that implies a team was let down, and none that implies a
  team was at fault. The neutral fact — reviewed from the written submission —
  is the whole story told.

### Teams reviewed from submission

Shown on that team's own card only. Neutral, not apologetic, not accusatory:

> Your project was reviewed from your written submission against the same five
> criteria. A live demo was not part of that review, which is noted against the
> demo criterion below.

Marked `Reviewed from submission` wherever the team appears in the ranking, so
the basis of the score is never hidden — but stated as a method, not a failing.

## Email

One template, sent to 93. Carries the result standalone so the nine without
accounts need nothing else:

- Overall winners and the five track winners
- That team's own five scores
- Their placing on the table
- Link to the dashboard for the full table
- The short form of the note

Sent through the existing `sendEmailBatch` in chunks. Chunk accounting is
currently chunk-granular — one rejected chunk marks all 100 failed — so per
recipient status is written from the per-row result, and the retry path selects
`status <> 'sent'` only.

## Visual design

Both surfaces follow the existing persona system rather than a one-off style —
Terminal Noir in Dev, glassmorphism in Pro, using the CSS variables already in
`globals.css`. `/frontend-design` is invoked during implementation.

- Winners get real hierarchy: champion first and largest, then 2nd/3rd, then
  tracks. Not a bulleted list.
- The table is scannable at 320px — horizontal scroll inside its own container,
  never on the page body.
- A team's own row is marked in the table so they can find themselves.
- Criterion scores read as filled meters against the 1–5 scale, not bare digits.
- The email is table-based HTML with inline styles and a plain-text alternative.
  No web fonts, no external images, dark-mode safe.
- `prefers-reduced-motion` respected on any reveal.

## Testing

`scripts/verify-judging.ts` is the established pattern; this extends it rather
than introducing a framework.

New assertions in `scripts/verify-results.ts`:

- The three announced winners occupy ranks 1, 2 and 3 in the announced order,
  regardless of their scores
- Every team that submitted appears in the ranking exactly once
- A team scoring higher than an announced winner still ranks below it — Whatsy
  at 76.9 ranks 4th, not 1st
- A submission-reviewed score is included in the average and carries
  `basis: "submission"`
- Track winners: announced winners take their own track; remaining tracks go to
  top score; a track with no scored team yields no winner
- Snapshot is byte-stable across two computations from identical input
- `perTeam` never contains a judge count
- A second notify sends to nobody when all rows are `sent`
- Publishing twice is refused
- Publish is refused while any submitted team has no score
- Score writes are refused once `judgingClosedAt` is set

Manual gate before the send: publish to a snapshot, read the dashboard as a
member of a scored team, an unscored team, and a team with no account, then
send to one address before the batch.

## Out of scope

- Score normalisation across judges. Considered and rejected: it would override
  judges who applied a stricter bar, after the fact, to change a published
  result.
- Automatic track winners from `trackWinners()` alone — the announced winners
  take precedence over the arithmetic.
- Any path where judge exclusion changes what participants see.
- Retroactive live judging of the four unscored teams.
- Unsubscribe infrastructure. Flagged as a real gap: this is transactional mail
  to event participants, but no suppression list exists. Worth building before
  any future cohort mail.

## Risks

| Risk | Mitigation |
|---|---|
| A team outscores an announced winner and notices | Ranking places announced winners at 1–3; scores shown are that team's own, so the comparison is not put in front of them |
| Resend quota 100/day vs 93 recipients | Per-recipient rows; retry only unsent |
| Favour never replies | Nothing in this spec is blocked on her |
| Snapshot drifts from live data | Snapshot is what is served; live data is not consulted after publish |
| Publishing twice | Refused inside the row-locked transaction |
