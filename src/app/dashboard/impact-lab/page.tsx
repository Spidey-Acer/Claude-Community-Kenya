import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/email-verification";
import { validCohort, pickMemberEvent } from "@/lib/impact-lab/event-lifecycle";
import { openRegistrationEvent, resolveMemberEvents } from "@/lib/impact-lab/event-store";
import { resolveRubric } from "@/lib/impact-lab/rubric-store";
import { totalOutOf } from "@/lib/impact-lab/judging";
import { getConversationsReportForEvent } from "@/lib/conversations/queries";
import { VerifyEmailBanner } from "../VerifyEmailBanner";
import { extractFrozenTeams } from "@/lib/impact-lab/member";
import { isResultsSnapshot, type ResultsSnapshot } from "@/lib/impact-lab/results";
import { ImpactLabClient } from "./ImpactLabClient";
import { resultsSubtitle } from "./resultsViewCopy";

export const metadata: Metadata = {
  title: "Impact Lab | Claude Community Kenya",
  description: "Your Impact Lab hackathon matching profile and team.",
  robots: { index: false, follow: false },
};

export default async function ImpactLabPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard/impact-lab");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { emailVerified: true },
  });
  if (!user) redirect("/login");

  const email = session.user.email.toLowerCase();
  const { cohort: requestedCohort } = await searchParams;
  const memberEvents = await resolveMemberEvents(email);
  const picked = pickMemberEvent(memberEvents, validCohort(requestedCohort));
  const openEvent = await openRegistrationEvent();
  // No event of the member's own: fall back to whatever is currently open
  // for self-registration, so the page still names something and the
  // registration invitation can appear — same fallback the dashboard card
  // and the profile route use.
  const activeEvent = picked ?? openEvent;
  const cohortActive = activeEvent?.status === "LIVE";
  // A returning participant — someone with a membership of their own
  // (`picked`, however old or closed) who is not yet a member of the event
  // now open — still deserves the invitation to join it. Additive to
  // `activeEvent`, not a replacement: their own event keeps driving the
  // page's main content below; this only decides whether the invite banner
  // also shows. A member with no event of their own already sees the full
  // invite as their main view (`activeEvent = openEvent` above), so there is
  // nothing more to add there.
  const inviteEvent =
    picked && openEvent && openEvent.cohort !== picked.cohort ? openEvent : null;
  const conversationsReport = activeEvent?.conversationsEventId
    ? await getConversationsReportForEvent(activeEvent.conversationsEventId)
    : null;
  // What the side rail shows a team during the build, all off the event
  // record so the next event needs no code change. The rubric is reduced to
  // label, points at full marks and the denominator: `weight` is the points a
  // criterion contributes, which under "normalized" scoring is not `max`
  // (a 1 to 5 scale worth 25 points) and under "points" scoring equals it.
  const eventInfo = activeEvent
    ? {
        formatNote: activeEvent.formatNote,
        groundRules: activeEvent.groundRules,
        location: activeEvent.location,
        dates: activeEvent.dates,
      }
    : null;
  // Whether this event's results are out, and the viewer's own ranked
  // project if so — for the header line only. The client fetches the full
  // payload itself; this reads just enough of the same published run to
  // say "Results are in" above it on first paint, and never an unpublished
  // snapshot (the guard is the results route's own).
  const finalRun = activeEvent
    ? await prisma.impactLabMatchRun.findFirst({
        where: { cohort: activeEvent.cohort, isFinal: true },
        orderBy: { createdAt: "desc" },
        select: { result: true, resultsPublishedAt: true, resultsSnapshot: true },
      })
    : null;
  const resultsPublished = Boolean(finalRun?.resultsPublishedAt && isResultsSnapshot(finalRun.resultsSnapshot));
  let viewerProject: string | null = null;
  if (resultsPublished && finalRun && picked) {
    const snapshot = finalRun.resultsSnapshot as unknown as ResultsSnapshot;
    const team = extractFrozenTeams(finalRun.result)?.find((t) => t.memberIds.includes(picked.participantId));
    viewerProject = team ? (snapshot.ranking.find((r) => r.teamId === team.id)?.projectName ?? null) : null;
  }
  const fullRubric = activeEvent ? await resolveRubric(activeEvent.cohort) : null;
  const rubric = fullRubric
    ? {
        label: fullRubric.label,
        criteria: fullRubric.criteria.map((c) => ({ key: c.key, label: c.label, max: c.weight })),
        totalOutOf: totalOutOf(fullRubric),
      }
    : null;

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-bg-primary pt-6 pb-16 sm:pt-12 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-8 border-b border-border-default/60 pb-6">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-green-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            cd ../dashboard
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green-primary mb-2">
            $ cat ./impact-lab
          </p>
          {/* The event's own name while it runs; the generic title once it
              has wrapped, when this page is a record rather than a venue. */}
          <h1 className="font-mono text-3xl font-bold text-text-primary sm:text-4xl">
            {cohortActive && activeEvent?.name ? activeEvent.name : "Impact Lab Hackathon"}
          </h1>
          <p className="mt-2 font-mono text-sm text-text-dim">
            {resultsSubtitle({ cohortActive: Boolean(cohortActive), published: resultsPublished, projectName: viewerProject })}
          </p>
        </header>

        {/* A member of more than one event (past + current, or two
            concurrent ones) picks which to view here — plain links, not
            client state, so the choice survives a reload and is shareable.
            Fewer than two memberships: nothing to switch between. */}
        {memberEvents.length > 1 && (
          <nav aria-label="Choose event" className="mb-6 flex flex-wrap gap-2">
            {memberEvents.map((e) => (
              <Link
                key={e.cohort}
                href={`/dashboard/impact-lab?cohort=${encodeURIComponent(e.cohort)}`}
                className={
                  picked?.cohort === e.cohort
                    ? "rounded border border-green-primary/40 bg-green-primary/10 px-3 py-1.5 font-mono text-xs text-green-primary"
                    : "rounded border border-border-default px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-green-primary/40 hover:text-green-primary"
                }
              >
                {e.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Gate on the same flag the API uses. When verification is off we send
            no verification mail, so blocking here on emailVerified alone locks
            out every account created before the flag flipped, with no way to
            comply — the participant is told to check an inbox nothing was sent
            to. */}
        {/* The verification gate only exists to protect a live matching
            profile. With the cohort closed there is nothing left to gate, and
            asking someone to verify an email to view a finished event's record
            is a dead end. */}
        {cohortActive && REQUIRE_EMAIL_VERIFICATION && !user.emailVerified ? (
          <>
            <VerifyEmailBanner />
            <p className="font-mono text-sm text-text-secondary">
              Verify your email to open your hackathon matching profile. This
              confirms the email you registered with on Luma is really yours.
            </p>
          </>
        ) : (
          <ImpactLabClient
            // Forces a clean remount when the switcher picks a different
            // event — otherwise the previous event's team/results state
            // would flash under the newly-highlighted chip until the
            // refetch lands.
            key={activeEvent?.cohort}
            sessionEmail={session.user.email}
            cohortActive={Boolean(cohortActive)}
            cohortLabel={activeEvent?.name ?? "Impact Lab"}
            cohort={activeEvent?.cohort}
            tracks={activeEvent?.tracks ?? []}
            inviteEvent={
              inviteEvent ? { cohort: inviteEvent.cohort, name: inviteEvent.name } : null
            }
            conversationsReport={conversationsReport}
            eventInfo={eventInfo}
            rubric={rubric}
          />
        )}
      </div>
    </main>
  );
}
