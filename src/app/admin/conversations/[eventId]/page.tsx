import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { ConversationsManager } from "@/components/admin/conversations/ConversationsManager"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

/**
 * Manage page for one event's Conversations Live setup: page config,
 * moderation queue, result publish, and Q&A sessions. Tolerates a missing
 * ConversationsPage (`page: null`) — Q&A-only events like Impact Lab never
 * attach one, but still need this page to run their session.
 */
export default async function ConversationsManagePage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      conversationsPage: true,
      questionSessions: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!event) notFound()

  const { conversationsPage, questionSessions, ...eventFields } = event

  // One groupBy per session rather than a single query across all sessions —
  // the event has at most a handful of Q&A sessions, and this keeps the
  // per-session counts trivially attributable without a manual reduce over a
  // combined result set.
  const countsBySession = await Promise.all(
    questionSessions.map((s) =>
      prisma.eventQuestion.groupBy({
        by: ["status"],
        where: { sessionId: s.id },
        _count: { _all: true },
      })
    )
  )

  // Dates serialize across the server/client boundary as plain strings here
  // rather than relying on RSC's Date passthrough — keeps the client
  // components' prop types simple (string, not Date | string).
  const sessions = questionSessions.map((s, i) => {
    const grouped = countsBySession[i]
    const countFor = (status: string) => grouped.find((g) => g.status === status)?._count._all ?? 0
    return {
      id: s.id,
      title: s.title,
      prompt: s.prompt,
      isOpen: s.isOpen,
      createdAt: s.createdAt.toISOString(),
      // FEATURED counts as approved here — it's a subset the export's
      // "approved" filter already folds in (APPROVED + FEATURED).
      counts: {
        pending: countFor("PENDING"),
        approved: countFor("APPROVED") + countFor("FEATURED"),
        rejected: countFor("REJECTED"),
      },
    }
  })
  const page = conversationsPage
    ? {
        id: conversationsPage.id,
        heroHeadline: conversationsPage.heroHeadline,
        heroSubline: conversationsPage.heroSubline,
        framingStats: conversationsPage.framingStats,
        tableQuestions: conversationsPage.tableQuestions,
        seedProblems: conversationsPage.seedProblems,
        contributionsOpen: conversationsPage.contributionsOpen,
        result: conversationsPage.result as {
          winner: { title: string; statement: string }
          runnersUp: { title: string; statement: string }[]
          note?: string
          publishedAt: string
        } | null,
      }
    : null

  return (
    <div>
      <AdminHeader title={eventFields.title} />
      <div className="p-4 md:p-6 max-w-5xl space-y-4">
        <Link href="/admin/conversations" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Conversations
        </Link>

        <ConversationsManager
          event={{ id: eventFields.id, slug: eventFields.slug, title: eventFields.title }}
          initialPage={page}
          initialSessions={sessions}
        />
      </div>
    </div>
  )
}
