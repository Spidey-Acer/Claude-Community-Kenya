# 13 — Audit Hardening

> Part of the [Impact Lab team-matching](../impact-lab-matching-spec.md) build.
> This documents the response to the multi-reviewer audit on PR #46.

The feature shipped functionally complete, then got a serious security/
testing/performance review before merge. This doc captures the fixes and the
reasoning — the review itself was a second design pass, and the lessons are worth
keeping.

## The theme: an admin tool still has adversaries

Everything here is admin-gated, so it's tempting to treat it as trusted. But the
*data* flows to less-trusted places (a CSV opened in Excel, a shared export file,
a venue full of organisers behind one NAT), and admins make mistakes (edit a
participant mid-run). The fixes fall into a few buckets.

### Don't let data escape its audience

- **Blocked teammates never leave the app.** They were being written into the
  participant CSV export. `blockedTeammates` is the one field the schema contract
  says is never exposed — one shared file leaks who blocked whom. Dropped from the
  export; and the run-detail endpoint no longer returns `participantsSnapshot`
  (which holds every email + block, including non-consenting people).
- **CSV formula injection.** RFC-4180 quoting protects the *file*; it does nothing
  for the *reader*. A participant named `=HYPERLINK(...)` executes when the
  organiser opens the export in Excel/Sheets. Fixed by prefixing a `'` to any cell
  starting with `= + - @` or a control char.

### Design for the room, not the request

- **Rate limit by user, not IP.** On event day every organiser shares the venue's
  NAT IP, so an IP-keyed limit throttles the *whole team* to one person's quota.
  The explain and import limits are now keyed by user id.
- **Batch the import.** 500 sequential `findUnique + write` round-trips over
  PgBouncer can blow the function timeout and leave a silent partial import. Now
  one `findMany` + one `$transaction`, with `maxDuration` and in-file dedupe.

### Trust the database, handle the race

- **P2002 → 409, not 500.** Find-then-create has a TOCTOU window; under a race the
  unique index throws and the naive handler 500s. Every create/update now leans on
  the index and maps the violation to a clean 409.
- **One final per cohort, enforced in SQL.** The mark-final transaction can
  write-skew into *two* finals under read-committed. A partial unique index
  (`(cohort) WHERE isFinal`) makes that impossible. Prisma can't model partial
  indexes, so it's raw SQL — documented in the schema so a future `migrate dev`
  doesn't "helpfully" drop it.

### The subtle one: what you saved isn't what you saw

The engine recomputes server-side for integrity, but that opened a gap: if a
participant is edited between **Generate** and **Save**, the frozen "final" run
silently differs from what the organiser reviewed. The fix keeps server-side
recomputation *and* guarantees fidelity: `/match` returns a content
**signature** of the result; the UI echoes it back on save/explain; the server
recomputes, and if the signature no longer matches, returns **409 — regenerate**.
Integrity (server is authoritative) and fidelity (== what was reviewed) at once.

### Least privilege

`/match` and `/explain` were gated on `view`, so a read-only moderator could
generate matches and trigger paid Claude calls. Both now require `create`.

## Correctness nits worth the fix

- `resolveSettings` rejects `minTeamSize > maxTeamSize` (zod can't express the
  cross-field check when a bound is omitted; the inverted range silently produced
  garbage teams).
- Locked teams are passed through untouched, so a block *inside* one can't be
  auto-resolved — but blocks are unconditional, so it's now surfaced as a warning
  instead of passing silently.
- The AI layer logs the failure cause before falling back, and merges the
  engine's penalty warnings with the model's instead of letting the model's
  replace them.
- `cohort` is coerced to a slug everywhere (it fed a `Content-Disposition`
  header), and the runs list stopped loading full snapshots to compute three
  numbers.

## Deployment / governance (not code)

Two items are for the deploy, flagged in the PR reply, not fixed here:

- Confirm `UPSTASH_REDIS_REST_*` is set in production — without it, all the rate
  limits above are per-instance in-memory and don't hold across the fleet.
- Decide a retention policy for non-consenting participants' data captured in run
  snapshots.
