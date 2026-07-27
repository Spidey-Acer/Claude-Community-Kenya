import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { checkMemberAccess, extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  toPublicRanking,
  type AnnouncedWinner,
  type ResultsSnapshot,
  type ResultsTrackWinner,
  type TeamCard,
} from "@/lib/impact-lab/results"

/** GET /api/impact-lab/results response shape. Flat member shape — no `data` wrapper. */
interface ResultsResponse {
  success: true
  published: boolean
  results?: {
    publishedAt: string
    overall: AnnouncedWinner[]
    trackWinners: ResultsTrackWinner[]
    ranking: ReturnType<typeof toPublicRanking>
  }
  yourTeam?: {
    teamId: string
    projectName: string
    card: TeamCard
  }
}

/**
 * The published result, for one participant.
 *
 * `perTeam` holds every team's private card, so the whole map must never reach
 * the client — only the caller's own entry is attached. Judge counts and judge
 * identities are absent from the snapshot by construction, so there is nothing
 * to strip there.
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RateLimits.READ)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rl.headers }
    )
  }

  const check = await checkMemberAccess()
  if (!check.authorized) return check.response

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort: DEFAULT_COHORT, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })

  // Never leak an unpublished snapshot — including its mere existence.
  if (!run?.resultsPublishedAt || !run.resultsSnapshot) {
    return NextResponse.json({ success: true, published: false })
  }

  const snapshot = run.resultsSnapshot as unknown as ResultsSnapshot

  const body: ResultsResponse = {
    success: true,
    published: true,
    results: {
      publishedAt: snapshot.publishedAt,
      overall: snapshot.overall,
      trackWinners: snapshot.trackWinners,
      ranking: toPublicRanking(snapshot.ranking),
    },
  }

  const participant = await prisma.impactLabParticipant.findUnique({
    where: { cohort_email: { cohort: DEFAULT_COHORT, email: check.email } },
    select: { id: true },
  })

  if (participant) {
    const teams = extractFrozenTeams(run.result)
    const team = teams?.find((t) => t.memberIds.includes(participant.id))
    const card = team ? snapshot.perTeam[team.id] : undefined
    const rankingRow = team ? snapshot.ranking.find((r) => r.teamId === team.id) : undefined

    if (team && card && rankingRow) {
      body.yourTeam = {
        teamId: team.id,
        projectName: rankingRow.projectName,
        card,
      }
    }
  }

  return NextResponse.json(body)
}
