import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { readJudgeSession } from "@/lib/impact-lab/judge-access"
import { validCohort } from "@/lib/impact-lab/event-lifecycle"
import { defaultAdminCohort } from "@/lib/impact-lab/event-store"
import {
  DEFAULT_SECONDS,
  isValidSeconds,
  loadOnStage,
  loadPitchTimer,
} from "@/lib/impact-lab/pitch-timer-store"

/**
 * The shared pitch countdown judges see on the scoring screen.
 *
 * One row per cohort: any judge starting it starts it for the whole room —
 * this is a room clock, not a per-judge stopwatch — and restarting mid-count
 * is expected, it means the next team is up. Same two doors as the rest of
 * judging (see judge-access.ts): a code-gated judge session, or a signed-in
 * staff member with `impact-lab` view access.
 */

/**
 * This code can ship before `impact_lab_pitch_timers` exists — applying a
 * migration against production is a human's decision, and `loadPitchTimer`
 * deliberately degrades to "no timer running" until then. Writes cannot
 * degrade, so they say what is missing instead of throwing a bare 500 at
 * whichever judge tapped Start. Prisma reports a missing table as P2021.
 */
function tableMissingResponse(error: unknown): NextResponse | null {
  const code = (error as { code?: unknown })?.code
  if (code !== "P2021") return null
  console.error("[impact-lab/pitch-timer] impact_lab_pitch_timers does not exist", error)
  return NextResponse.json(
    {
      success: false,
      error:
        "The pitch timer table has not been created in this database yet. Apply migration 20260808150000_impact_lab_pitch_timer, then try again. Scoring is unaffected.",
      code: "PITCH_TIMER_TABLE_MISSING",
    },
    { status: 503 }
  )
}

/** Who is allowed to read or drive the timer: a code-gated judge, or staff. */
async function resolveCaller(): Promise<
  | { ok: true; displayName: string }
  | { ok: false; response: NextResponse }
> {
  const judge = await readJudgeSession()
  if (judge) return { ok: true, displayName: judge.displayName }

  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return { ok: false, response: check.response }
  return { ok: true, displayName: check.user.name }
}

/**
 * GET — the timer currently running for a cohort, or null, plus the team the
 * desk has on stage.
 *
 * The two travel together because the judges' screens want both at the same
 * 2s cadence and the alternative is a second poll — see `loadOnStage`. Both
 * degrade to null independently rather than failing the response.
 */
export async function GET(request: NextRequest) {
  const caller = await resolveCaller()
  if (!caller.ok) return caller.response

  const rl = await rateLimit(request, RateLimits.MEMBER_ACTION)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const cohort = validCohort(request.nextUrl.searchParams.get("cohort")) ?? (await defaultAdminCohort())
  const [timer, onStage] = await Promise.all([loadPitchTimer(cohort), loadOnStage(cohort)])

  return NextResponse.json({ success: true, timer, onStage }, { headers: rl.headers })
}

/** POST — start or restart the countdown for a cohort. */
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request)
  } catch (error) {
    const missing = tableMissingResponse(error)
    if (missing) return missing
    throw error
  }
}

async function handlePost(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const caller = await resolveCaller()
  if (!caller.ok) return caller.response

  const rl = await rateLimit(request, RateLimits.MEMBER_ACTION)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const body = await request.json().catch(() => null)
  const rawSeconds =
    body && typeof body === "object" ? (body as { seconds?: unknown }).seconds : undefined
  const seconds = rawSeconds === undefined ? DEFAULT_SECONDS : rawSeconds
  if (!isValidSeconds(seconds)) {
    return NextResponse.json(
      { success: false, error: "Duration must be a whole number of seconds from 30 to 3600." },
      { status: 400 }
    )
  }

  const cohort = validCohort(request.nextUrl.searchParams.get("cohort")) ?? (await defaultAdminCohort())
  const startedAt = new Date()

  // Upsert, not create: restarting while one is already running for this
  // cohort is the normal flow — the next team is pitching.
  await prisma.impactLabPitchTimer.upsert({
    where: { cohort },
    create: { cohort, startedAt, seconds, startedBy: caller.displayName },
    update: { startedAt, seconds, startedBy: caller.displayName },
  })

  return NextResponse.json(
    {
      success: true,
      timer: {
        startedAt: startedAt.toISOString(),
        seconds,
        startedBy: caller.displayName,
        serverNow: new Date().toISOString(),
      },
    },
    { headers: rl.headers }
  )
}

/** DELETE — stop the countdown for a cohort. */
export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request)
  } catch (error) {
    const missing = tableMissingResponse(error)
    if (missing) return missing
    throw error
  }
}

async function handleDelete(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const caller = await resolveCaller()
  if (!caller.ok) return caller.response

  const rl = await rateLimit(request, RateLimits.MEMBER_ACTION)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const cohort = validCohort(request.nextUrl.searchParams.get("cohort")) ?? (await defaultAdminCohort())
  // deleteMany rather than delete: stopping a timer that already finished (or
  // was never started) is a no-op, not a 404 a judge has to interpret.
  await prisma.impactLabPitchTimer.deleteMany({ where: { cohort } })

  return NextResponse.json({ success: true, timer: null }, { headers: rl.headers })
}
