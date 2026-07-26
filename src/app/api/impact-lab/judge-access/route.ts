import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import {
  JUDGE_COOKIE,
  codeMatches,
  encodeJudgeSession,
  judgeIdentity,
} from "@/lib/impact-lab/judge-access"

/**
 * Exchange the shared access code plus a name for a judge session cookie.
 *
 * Rate limited so a four-digit code cannot simply be walked. The response says
 * only whether it worked — never which part was wrong, and never the code.
 */

const bodySchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(2).max(80),
})

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
    return NextResponse.json(
      { success: false, error: "Enter your name and the access code." },
      { status: 400 }
    )
  }

  if (!codeMatches(parsed.data.code)) {
    return NextResponse.json(
      { success: false, error: "That code is not right." },
      { status: 401 }
    )
  }

  const identity = judgeIdentity(parsed.data.name)
  if (!identity) {
    return NextResponse.json(
      { success: false, error: "Enter your name using letters." },
      { status: 400 }
    )
  }

  const displayName = parsed.data.name.trim().replace(/\s+/g, " ")
  const response = NextResponse.json({ success: true, judge: displayName })

  response.cookies.set(JUDGE_COOKIE, encodeJudgeSession({ identity, displayName }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Long enough to cover a night of demos and deliberation without a judge
    // being logged out mid-scoring, short enough not to linger for weeks.
    maxAge: 60 * 60 * 12,
  })

  return response
}

/** Sign out — used by the "not you?" link on the judge screen. */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(JUDGE_COOKIE, "", { path: "/", maxAge: 0 })
  return response
}
