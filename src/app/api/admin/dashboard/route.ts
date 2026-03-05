import { NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const check = await checkApiPermission("dashboard", "view")
  if (!check.authorized) return check.response

  const [
    speakers,
    ideas,
    applications,
    events,
    blog,
    recentSpeakers,
    recentIdeas,
    recentApplications,
  ] = await Promise.all([
    prisma.speakerApplication.groupBy({ by: ["status"], _count: true }),
    prisma.ideaSubmission.groupBy({ by: ["status"], _count: true }),
    prisma.joinApplication.groupBy({ by: ["status"], _count: true }),
    prisma.event.count(),
    prisma.blogPost.count(),
    prisma.speakerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, topic: true, status: true, createdAt: true },
    }),
    prisma.ideaSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, contactName: true, status: true, createdAt: true },
    }),
    prisma.joinApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
  ])

  const countByStatus = <T extends { status: string; _count: number }>(arr: T[]) =>
    Object.fromEntries(arr.map((x) => [x.status, x._count]))

  return NextResponse.json({
    success: true,
    data: {
      stats: {
        speakers: countByStatus(speakers as { status: string; _count: number }[]),
        ideas: countByStatus(ideas as { status: string; _count: number }[]),
        applications: countByStatus(applications as { status: string; _count: number }[]),
        events,
        blog,
      },
      recent: {
        speakers: recentSpeakers,
        ideas: recentIdeas,
        applications: recentApplications,
      },
    },
  })
}
