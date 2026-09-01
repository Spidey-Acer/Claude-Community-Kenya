import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { decodeHtmlEntities } from "@/lib/input-sanitization"

export const dynamic = "force-dynamic"

/**
 * Projector/phone read view for one Q&A session: large type, light
 * background (this is read off a screen or held up on stage, not the
 * Terminal Noir admin chrome), approved questions numbered with name and
 * county underneath. Auth is inherited from src/app/admin/layout.tsx, same
 * as every other /admin/* route — no extra guard needed here.
 *
 * Refreshes every 30s via <meta http-equiv="refresh"> so newly approved
 * questions appear without the organiser touching their phone mid-session —
 * the simplest correct thing that works with `dynamic = "force-dynamic"`.
 */
export default async function QuestionsReadViewPage({
  params,
}: {
  params: Promise<{ eventId: string; sessionId: string }>
}) {
  const { eventId, sessionId } = await params

  const session = await prisma.eventQuestionSession.findUnique({
    where: { id: sessionId },
    include: {
      _count: { select: { questions: { where: { status: "PENDING" } } } },
    },
  })
  if (!session || session.eventId !== eventId) notFound()

  const approved = await prisma.eventQuestion.findMany({
    where: { sessionId, status: { in: ["APPROVED", "FEATURED"] } },
    orderBy: { createdAt: "asc" },
    select: { body: true, submitterName: true, county: true },
  })

  return (
    <>
      {/* Rendered directly rather than via the Metadata API — this route
          needs a hard 30s reload, not the client-side refetch a metadata
          `refresh` field can't express. Next hoists <meta>/<title> rendered
          in a Server Component into <head> automatically. */}
      <meta httpEquiv="refresh" content="30" />
      <title>{session.title} — Read view</title>
      <div className="min-h-screen bg-white text-black font-sans print:bg-white">
        <main className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="text-3xl font-bold mb-2">{session.title}</h1>
          <p className="text-lg text-gray-600 mb-8">
            {approved.length} approved &middot; {session._count.questions} pending
          </p>

          {approved.length === 0 ? (
            <p className="text-2xl text-gray-500">No approved questions yet.</p>
          ) : (
            <ol className="space-y-8">
              {approved.map((q, i) => (
                <li key={i} className="text-2xl leading-snug">
                  <span className="font-semibold">{i + 1}.</span> {decodeHtmlEntities(q.body)}
                  <div className="text-base text-gray-500 mt-1">
                    {decodeHtmlEntities(q.submitterName)} &middot; {q.county}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </main>
      </div>
    </>
  )
}
