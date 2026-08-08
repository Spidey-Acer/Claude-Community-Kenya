import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { CURRENT_COHORT } from "@/lib/impact-lab/constants"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"

/**
 * Search the cohort so a team can find the person sitting with them.
 *
 * Returns names only, never emails or phone numbers — this is a lookup for
 * adding a teammate, not a directory of a hundred people's contact details.
 * `onTeam` tells the caller the person is currently placed elsewhere, so the
 * UI can say "this will move them" before anything happens.
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.FORM)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many searches. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  // Two characters is the floor: one letter would return most of the cohort and
  // turn a teammate lookup into a roster dump.
  if (q.length < 2) {
    return NextResponse.json({ success: true, results: [] })
  }

  const people = await prisma.impactLabParticipant.findMany({
    where: { cohort: CURRENT_COHORT, fullName: { contains: q, mode: "insensitive" } },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
    take: 10,
  })

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: CURRENT_COHORT, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { result: true },
  })
  const teams = extractFrozenTeams(run?.result) ?? []
  const teamNameById = new Map<string, string>()
  for (const team of teams) {
    for (const id of team.memberIds) teamNameById.set(id, team.name)
  }

  return NextResponse.json({
    success: true,
    results: people.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      onTeam: teamNameById.get(p.id) ?? null,
    })),
  })
}
