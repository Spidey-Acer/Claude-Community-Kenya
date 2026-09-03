import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { singleLiveCohort } from "@/lib/impact-lab/event-store"
import {
  extractJudgeSignIn,
  extractJudges,
  rosterIdentity,
  type Judge,
  type JudgeSignInMode,
} from "@/lib/impact-lab/roster"
import {
  JUDGE_COOKIE,
  codeMatches,
  encodeJudgeSession,
  judgeIdentity,
  type JudgeSession,
} from "@/lib/impact-lab/judge-access"

/**
 * Exchange the shared access code — plus either a typed name or a pick from
 * the published panel — for a judge session cookie.
 *
 * Rate limited so a four-digit code cannot simply be walked. The response says
 * only whether it worked — never which part was wrong, and never the code.
 *
 * Which of the two paths applies is the run's own `judgeSignIn` setting, not
 * the caller's choice: a cohort switched to "roster" refuses a typed name, so
 * a judge on a stale tab cannot open a second scorecard under a spelling the
 * panel does not contain.
 */

/**
 * One schema for both paths rather than a union, so a missing field produces
 * the message that names it instead of zod's "no variant matched".
 */
const bodySchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(2).max(80).optional(),
  judgeId: z.string().min(1).max(64).optional(),
  cohort: z.string().min(1).max(64).optional(),
})

/** Machine-readable refusals the judge screen can branch on. */
const UNKNOWN_JUDGE = "UNKNOWN_JUDGE"
const ROSTER_ONLY = "ROSTER_ONLY"

/** Session cookie flags, shared by both sign-in paths. */
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // Long enough to cover a night of demos and deliberation without a judge
  // being logged out mid-scoring, short enough not to linger for weeks.
  maxAge: 60 * 60 * 12,
} as const

function fail(error: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ success: false, ...(code ? { code } : {}), error }, { status })
}

/** The judges and sign-in mode on a cohort's latest final run. */
async function readCohortPanel(
  cohort: string
): Promise<{ mode: JudgeSignInMode; judges: Judge[] } | null> {
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { result: true },
  })
  if (!run) return null
  return { mode: extractJudgeSignIn(run.result), judges: extractJudges(run.result) }
}

/** Set the signed session cookie and answer with the display name. */
function grant(session: JudgeSession): NextResponse {
  const response = NextResponse.json({ success: true, judge: session.displayName })
  response.cookies.set(JUDGE_COOKIE, encodeJudgeSession(session), COOKIE_OPTIONS)
  return response
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return fail("Enter your name and the access code.", 400)
  }
  const { code, name, judgeId } = parsed.data

  // The code is checked before anything is looked up, so a caller without it
  // learns nothing about which cohorts or judge ids exist.
  if (!codeMatches(code)) {
    return fail("That code is not right.", 401)
  }

  const cohort = parsed.data.cohort ? validCohort(parsed.data.cohort) : null
  if (parsed.data.cohort && !cohort) {
    return fail("Pick your name from the list.", 400)
  }

  // ── Roster path: the judge picked themselves off the published panel. ──
  if (judgeId) {
    if (!cohort) return fail("Pick your name from the list.", 400)
    const panel = await readCohortPanel(cohort)
    const judge = panel?.judges.find((entry) => entry.id === judgeId)
    if (!judge) {
      return fail("We could not find you on the judge list.", 400, UNKNOWN_JUDGE)
    }
    return grant({ identity: rosterIdentity(judge.id), displayName: judge.name })
  }

  // ── Open path: a typed name, exactly as before roster mode existed. ──
  if (!name) {
    return fail("Enter your name and the access code.", 400)
  }

  // Roster mode is enforced here regardless of whether the caller named a
  // cohort. JudgeGate's typed-name path never sends one, so a stale tab
  // could otherwise create a free-text scorecard for a run an organiser has
  // since locked to the published panel — resolve the same way the public
  // event page does, via the single-LIVE-cohort fallback.
  const resolvedCohort = cohort ?? (await singleLiveCohort())
  if (resolvedCohort) {
    const panel = await readCohortPanel(resolvedCohort)
    if (panel?.mode === "roster") {
      return fail("Pick your name from the list.", 403, ROSTER_ONLY)
    }
  }

  const identity = judgeIdentity(name)
  if (!identity) {
    return fail("Enter your name using letters.", 400)
  }

  return grant({ identity, displayName: name.trim().replace(/\s+/g, " ") })
}

/** Sign out — used by the "not you?" link on the judge screen. */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(JUDGE_COOKIE, "", { path: "/", maxAge: 0 })
  return response
}
