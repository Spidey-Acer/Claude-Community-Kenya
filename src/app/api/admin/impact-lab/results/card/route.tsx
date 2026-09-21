import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { cardProposalFromSearchParams, loadAdminCards } from "@/lib/impact-lab/card-admin"
import { CARD_SIZES, renderCard, type CardSize } from "@/lib/impact-lab/card-render"
import { cardHonours, parseHonourIndex } from "@/lib/impact-lab/result-card"

/**
 * One team's share card as a PNG for the admin Cards tab — the same
 * `renderCard` the public routes serve, but reachable before publish so an
 * organiser sees every card before anyone else does. Read-only; the same
 * snapshot-or-live logic as `preview-email/route.ts` (see `card-admin.ts`),
 * with the pre-publish proposal read off the same query parameters.
 *
 * `?cohort=&teamId=&size=square|portrait|story&honour=0` (plus
 * `announcementMode`, `announced`, `announcedTrackWinnerIds` pre-publish);
 * `honour` indexes the team's `cardHonours`, the primary by default. Served
 * inline, never cached: the whole point is to see the current state.
 */
export const dynamic = "force-dynamic"

const SIZES: CardSize[] = ["square", "portrait", "story", "og"]

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const params = request.nextUrl.searchParams
  const cohort = await resolveAdminCohort(params.get("cohort"))
  const teamId = (params.get("teamId") ?? "").trim()
  if (teamId === "" || teamId.length > 64) {
    return NextResponse.json({ success: false, error: "Provide a team." }, { status: 400 })
  }
  const sizeParam = params.get("size") ?? "square"
  const size = SIZES.find((s) => s === sizeParam && s in CARD_SIZES)
  if (!size) {
    return NextResponse.json({ success: false, error: "size must be square, portrait, story or og." }, { status: 400 })
  }
  const honourIndex = parseHonourIndex(params.get("honour"))
  if (honourIndex === undefined) {
    return NextResponse.json({ success: false, error: "honour must be a whole number." }, { status: 400 })
  }

  const cards = await loadAdminCards(cohort, cardProposalFromSearchParams(params))
  if (!cards.ok) return NextResponse.json({ success: false, error: cards.error }, { status: cards.status })
  const team = cards.teams.find((t) => t.teamId === teamId)
  if (!team) {
    return NextResponse.json({ success: false, error: "Team not found in this run's results." }, { status: 404 })
  }

  const honour = cardHonours(team.card)[honourIndex]
  if (!honour) {
    return NextResponse.json({ success: false, error: "That team has no card at that honour index." }, { status: 404 })
  }

  const image = await renderCard(team.card, size, honour)
  const headers = new Headers(image.headers)
  headers.set("Cache-Control", "private, no-store")
  return new Response(image.body, { status: 200, headers })
}
