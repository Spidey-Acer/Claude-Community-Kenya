import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { cardProposalFromSearchParams, loadAdminCards } from "@/lib/impact-lab/card-admin"

/**
 * Every team's card facts for the admin Cards tab: name, project, placing
 * line and group, so the tab can list and group them and ask
 * `results/card` for each PNG. Same auth, same loader, same pre-publish
 * proposal parameters as that route. Read-only.
 */
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const params = request.nextUrl.searchParams
  const cohort = await resolveAdminCohort(params.get("cohort"))
  const cards = await loadAdminCards(cohort, cardProposalFromSearchParams(params))
  if (!cards.ok) return NextResponse.json({ success: false, error: cards.error }, { status: cards.status })

  return NextResponse.json({
    success: true,
    data: {
      published: cards.published,
      teams: cards.teams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
        projectName: t.card.projectName,
        track: t.card.track,
        placingLine: t.placingLine,
        group: t.group,
        members: t.card.members,
      })),
    },
  })
}
