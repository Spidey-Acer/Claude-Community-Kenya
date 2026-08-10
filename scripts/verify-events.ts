/**
 * Assertions for the event tenancy logic: lifecycle transitions, member
 * event resolution precedence, and cohort slug validation. Pure logic only —
 * runs without a database, like verify-judging.ts.
 *
 *   npm run verify:events
 */
import {
  canTransition,
  orderMemberEvents,
  pickMemberEvent,
  validCohort,
} from "../src/lib/impact-lab/event-lifecycle"

let passed = 0
let failed = 0
function check(name: string, condition: boolean): void {
  if (condition) {
    passed += 1
  } else {
    failed += 1
    console.error(`FAIL: ${name}`)
  }
}

// ── canTransition ────────────────────────────────────────────────────────────
check("DRAFT→LIVE allowed", canTransition("DRAFT", "LIVE", false).ok)
check("DRAFT→LIVE allowed with participants", canTransition("DRAFT", "LIVE", true).ok)
check("LIVE→DRAFT allowed while empty", canTransition("LIVE", "DRAFT", false).ok)
check("LIVE→DRAFT refused once participants exist", !canTransition("LIVE", "DRAFT", true).ok)
check("LIVE→CLOSED allowed", canTransition("LIVE", "CLOSED", true).ok)
check("CLOSED→LIVE (reopen) allowed", canTransition("CLOSED", "LIVE", true).ok)
check("CLOSED→ARCHIVED allowed", canTransition("CLOSED", "ARCHIVED", true).ok)
check("ARCHIVED→CLOSED (unarchive) allowed", canTransition("ARCHIVED", "CLOSED", true).ok)
check("DRAFT→ARCHIVED refused (archive requires CLOSED)", !canTransition("DRAFT", "ARCHIVED", false).ok)
check("LIVE→ARCHIVED refused (archive requires CLOSED)", !canTransition("LIVE", "ARCHIVED", true).ok)
check("ARCHIVED→LIVE refused (unarchive first)", !canTransition("ARCHIVED", "LIVE", true).ok)
check("no-op transition refused", !canTransition("LIVE", "LIVE", true).ok)
check("refusal carries a reason", canTransition("LIVE", "DRAFT", true).ok === false &&
  (canTransition("LIVE", "DRAFT", true) as { ok: false; reason: string }).reason.length > 0)

// ── ordering and picking ─────────────────────────────────────────────────────
const day = (n: number): Date => new Date(2026, 0, n)
const closedOld = { cohort: "old-closed", status: "CLOSED" as const, createdAt: day(1) }
const closedNew = { cohort: "new-closed", status: "CLOSED" as const, createdAt: day(5) }
const liveOld = { cohort: "old-live", status: "LIVE" as const, createdAt: day(2) }
const liveNew = { cohort: "new-live", status: "LIVE" as const, createdAt: day(4) }
const draft = { cohort: "a-draft", status: "DRAFT" as const, createdAt: day(9) }
const archived = { cohort: "an-archived", status: "ARCHIVED" as const, createdAt: day(9) }

const ordered = orderMemberEvents([closedOld, draft, liveOld, archived, liveNew, closedNew])
check("DRAFT excluded from member view", !ordered.some((e) => e.cohort === "a-draft"))
check("ARCHIVED excluded from member view", !ordered.some((e) => e.cohort === "an-archived"))
check("LIVE events come before CLOSED", ordered[0].status === "LIVE" && ordered[1].status === "LIVE")
check("newest LIVE first", ordered[0].cohort === "new-live")
check("newest CLOSED first within CLOSED", ordered[2].cohort === "new-closed")

check("pick: empty list → null", pickMemberEvent([]) === null)
check("pick: single event wins", pickMemberEvent([closedOld])?.cohort === "old-closed")
check("pick: newest LIVE by default", pickMemberEvent([closedNew, liveOld, liveNew])?.cohort === "new-live")
check("pick: requested cohort honoured when member", pickMemberEvent([liveNew, liveOld], "old-live")?.cohort === "old-live")
check("pick: requested cohort ignored when not a member", pickMemberEvent([liveNew], "someone-elses")?.cohort === "new-live")
check("pick: requested DRAFT/ARCHIVED unreachable", pickMemberEvent([liveNew, draft], "a-draft")?.cohort === "new-live")

// ── validCohort ──────────────────────────────────────────────────────────────
check("validCohort accepts a real slug", validCohort("afretec-makerthon-2026-08") === "afretec-makerthon-2026-08")
check("validCohort trims", validCohort("  impact-lab-2026-07 ") === "impact-lab-2026-07")
check("validCohort rejects empty", validCohort("") === null)
check("validCohort rejects null/undefined", validCohort(null) === null && validCohort(undefined) === null)
check("validCohort rejects CR/LF injection", validCohort("x\r\nSet-Cookie: a=b") === null)
check("validCohort rejects overlong input", validCohort("a".repeat(61)) === null)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
