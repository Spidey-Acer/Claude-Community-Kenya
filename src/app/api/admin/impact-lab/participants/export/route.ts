import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants"
import { toCsv } from "@/lib/impact-lab/csv"

const HEADERS = [
  "fullName",
  "email",
  "phone",
  "institution",
  "experienceLevel",
  "primaryRole",
  "secondaryRoles",
  "technicalSkills",
  "interests",
  "availability",
  "preferredTeammates",
  "blockedTeammates",
  "consentToMatch",
  "consentToShareContact",
]

/** Export all participants in a cohort as CSV. Multi-value fields joined with ";". */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const cohort = searchParams.get("cohort") ?? DEFAULT_COHORT

  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
    orderBy: { fullName: "asc" },
  })

  const rows = participants.map((p) => [
    p.fullName,
    p.email,
    p.phone,
    p.institution,
    p.experienceLevel,
    p.primaryRole,
    p.secondaryRoles.join("; "),
    p.technicalSkills.join("; "),
    p.interests.join("; "),
    p.availability.join("; "),
    p.preferredTeammates.join("; "),
    p.blockedTeammates.join("; "),
    p.consentToMatch,
    p.consentToShareContact,
  ])

  const csv = toCsv(HEADERS, rows)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="impact-lab-participants-${cohort}.csv"`,
    },
  })
}
