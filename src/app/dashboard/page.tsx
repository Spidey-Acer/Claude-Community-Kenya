import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUpcomingEvents } from "@/lib/data";
import { SOCIAL_LINKS } from "@/lib/constants";
import { DEFAULT_COHORT } from "@/lib/impact-lab/constants";
import { extractFrozenTeams } from "@/lib/impact-lab/member";
import { Calendar, MessageSquare, BookOpen, Sparkles, Code2, FlaskConical } from "lucide-react";
import { SignOutButton } from "./SignOutButton";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { ProfileEditor } from "./ProfileEditor";

export const metadata: Metadata = {
  title: "Dashboard | Claude Community Kenya",
  description: "Your CCK member dashboard.",
  robots: { index: false, follow: false },
};

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"]);

function formatJoinDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const role = (session.user as { role?: string }).role;
  const isAdmin = role ? ADMIN_ROLES.has(role) : false;

  const [user, upcomingEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        imageUrl: true,
        createdAt: true,
        role: true,
        emailVerified: true,
      },
    }),
    getUpcomingEvents().catch(() => []),
  ]);

  if (!user) redirect("/login");

  // My submissions — small recent slice across all submission types
  const [myIdeas, myCommunity, myProjects, myDemos] = await Promise.all([
    prisma.ideaSubmission.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
    prisma.communitySubmission.findMany({
      where: { userId: user.id },
      select: { id: true, slug: true, title: true, type: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
    // Approved community projects don't link via userId yet — leave for future schema pass.
    Promise.resolve([] as never[]),
    prisma.demoRequest.findMany({
      where: { userId: user.id },
      select: { id: true, projectTitle: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
  ]);

  const totalSubmissions =
    myIdeas.length + myCommunity.length + myProjects.length + myDemos.length;

  const nextEvent = upcomingEvents[0];

  // Impact Lab hackathon status — mirrors the states on /dashboard/impact-lab.
  let impactLabStatus: ImpactLabStatus = "verify";
  if (user.emailVerified) {
    // No .catch(() => null) here: swallowing a DB error would show a
    // registered participant the affirmative "Registration not found" copy.
    // A down DB surfaces via the page error boundary, same as the user query.
    const participant = await prisma.impactLabParticipant.findUnique({
      where: {
        cohort_email: {
          cohort: DEFAULT_COHORT,
          email: user.email.toLowerCase(),
        },
      },
      select: { id: true, consentToMatch: true },
    });
    if (!participant) {
      impactLabStatus = "not-registered";
    } else {
      const finalRun = await prisma.impactLabMatchRun.findFirst({
        where: { cohort: DEFAULT_COHORT, isFinal: true },
        orderBy: { createdAt: "desc" },
        select: { result: true },
      });
      // Frozen JSON, not schema-enforced — a malformed run degrades to waiting.
      const teams = finalRun ? extractFrozenTeams(finalRun.result) : null;
      if (!teams) {
        impactLabStatus = participant.consentToMatch ? "waiting" : "profile";
      } else {
        impactLabStatus = teams.some((t) => t.memberIds.includes(participant.id))
          ? "revealed"
          : "unassigned";
      }
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary pt-24 pb-24">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b border-border-default/60 pb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green-primary mb-2">
              $ whoami
            </p>
            <h1 className="font-mono text-3xl font-bold text-text-primary sm:text-4xl">
              Welcome back, {user.firstName}.
            </h1>
            <p className="mt-2 font-mono text-sm text-text-dim">
              {user.email} &middot; member since {formatJoinDate(user.createdAt)}
              {role ? ` · ${role.toLowerCase().replace("_", " ")}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded border border-amber/40 bg-amber/10 px-4 py-2 text-xs font-mono font-semibold text-amber hover:bg-amber/20 transition-colors"
              >
                $ cd /admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </header>

        {!user.emailVerified && <VerifyEmailBanner />}

        <section className="mb-8" aria-label="Impact Lab hackathon">
          <ImpactLabCard status={impactLabStatus} />
        </section>

        <section className="mb-8" aria-label="Profile">
          <ProfileEditor
            initialFirstName={user.firstName}
            initialLastName={user.lastName}
            initialPhone={user.phone}
            initialImageUrl={user.imageUrl}
            email={user.email}
          />
        </section>

        {/* Next Event */}
        {nextEvent && (
          <section className="mb-8" aria-label="Next event">
            <Link
              href={`/events/${nextEvent.slug}`}
              className="group flex flex-wrap items-start gap-4 rounded-lg border border-green-primary/20 bg-bg-secondary p-6 transition-all hover:border-green-primary/40"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10">
                <Calendar className="h-6 w-6 text-green-primary" />
              </div>
              <div className="flex-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-green-primary mb-1">
                  Next event for you
                </p>
                <h2 className="font-mono text-base font-bold text-text-primary group-hover:text-green-primary transition-colors">
                  {nextEvent.title}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {nextEvent.date} &middot; {nextEvent.city} &middot; {nextEvent.venue}
                </p>
              </div>
              <span className="font-mono text-sm text-text-dim group-hover:text-green-primary transition-colors">
                Details &rarr;
              </span>
            </Link>
          </section>
        )}

        {/* Quick Links Grid */}
        <section aria-label="Quick links">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-text-dim">
            {"// ./quick-links"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
              href={SOCIAL_LINKS.discord}
              external
              icon={MessageSquare}
              title="Discord"
              description="Real-time chat with the community"
              accent="green-primary"
            />
            <DashboardCard
              href="/events"
              icon={Calendar}
              title="Browse Events"
              description="Meetups, workshops, hackathons"
              accent="amber"
            />
            <DashboardCard
              href="/community"
              icon={Sparkles}
              title="Community Hub"
              description="MCP servers, prompts, workflows shared by members"
              accent="cyan"
            />
            <DashboardCard
              href="/resources"
              icon={BookOpen}
              title="Resources"
              description="Guides, courses, and curated links"
              accent="green-primary"
            />
            <DashboardCard
              href="/projects"
              icon={Code2}
              title="Projects"
              description="See what the community is building"
              accent="amber"
            />
            <DashboardCard
              href="/submit-project"
              icon={Code2}
              title="Submit Your Project"
              description="Show what you've built with Claude"
              accent="cyan"
            />
          </div>
        </section>

        {/* My Submissions */}
        {totalSubmissions > 0 && (
          <section className="mt-12" aria-label="My submissions">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-text-dim">
              {"// ./my-submissions"}
            </h2>
            <div className="space-y-3">
              {myIdeas.map((s) => (
                <SubmissionRow
                  key={`idea-${s.id}`}
                  type="Idea"
                  title={s.title}
                  status={s.status}
                  createdAt={s.createdAt}
                />
              ))}
              {myCommunity.map((s) => (
                <SubmissionRow
                  key={`community-${s.id}`}
                  type={s.type}
                  title={s.title}
                  status={s.status}
                  createdAt={s.createdAt}
                  href={`/community/${s.slug}`}
                />
              ))}
              {myDemos.map((s) => (
                <SubmissionRow
                  key={`demo-${s.id}`}
                  type="Demo"
                  title={s.projectTitle}
                  status={s.status}
                  createdAt={s.createdAt}
                />
              ))}
            </div>
          </section>
        )}

        {/* Inline footer card — professional, scoped to dashboard */}
        <section className="mt-12" aria-label="Dashboard notes">
          <div className="grid gap-3 rounded-lg border border-border-default bg-bg-secondary/60 p-5 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">
                {"// roadmap"}
              </p>
              <p className="font-mono text-xs text-text-secondary leading-relaxed">
                Member features in progress: saved events, 2FA for admins, and
                a richer activity feed.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">
                {"// feedback"}
              </p>
              <p className="font-mono text-xs text-text-secondary leading-relaxed">
                Have an idea?{" "}
                <Link
                  href="/submit-idea"
                  className="text-green-primary hover:underline"
                >
                  Tell us &rarr;
                </Link>
              </p>
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
            Claude Community Kenya &middot; member workspace
          </p>
        </section>
      </div>
    </main>
  );
}

type ImpactLabStatus =
  | "verify"
  | "not-registered"
  | "profile"
  | "waiting"
  | "revealed"
  | "unassigned";

const IMPACT_LAB_COPY: Record<
  ImpactLabStatus,
  { title: string; description: string }
> = {
  verify: {
    title: "Verify your email to unlock",
    description:
      "Your hackathon matching profile opens once your email is verified.",
  },
  "not-registered": {
    title: "Registration not found",
    description:
      "We couldn't match your account email to a Luma registration. Open for details.",
  },
  profile: {
    title: "Complete your matching profile",
    description: "Two minutes — it's how we place you on the right team.",
  },
  waiting: {
    title: "Profile complete",
    description: "Teams drop Saturday morning — check back here.",
  },
  revealed: {
    title: "Your team is ready",
    description: "Meet your teammates and see your suggested project direction.",
  },
  unassigned: {
    title: "Teams are finalized",
    description: "You weren't placed on a team — contact the organizers.",
  },
};

function ImpactLabCard({ status }: { status: ImpactLabStatus }) {
  const copy = IMPACT_LAB_COPY[status];
  const green = status === "revealed" || status === "waiting";
  const cardClass = green
    ? "group flex flex-wrap items-start gap-4 rounded-lg border border-green-primary/20 bg-bg-secondary p-6 transition-all hover:border-green-primary/40"
    : "group flex flex-wrap items-start gap-4 rounded-lg border border-amber/20 bg-bg-secondary p-6 transition-all hover:border-amber/40";
  const iconBoxClass = green
    ? "flex h-12 w-12 shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10"
    : "flex h-12 w-12 shrink-0 items-center justify-center rounded border border-amber/30 bg-amber/10";
  const eyebrowClass = green
    ? "font-mono text-[11px] uppercase tracking-wider text-green-primary mb-1"
    : "font-mono text-[11px] uppercase tracking-wider text-amber mb-1";

  return (
    <Link href="/dashboard/impact-lab" className={cardClass}>
      <div className={iconBoxClass}>
        <FlaskConical
          className={green ? "h-6 w-6 text-green-primary" : "h-6 w-6 text-amber"}
        />
      </div>
      <div className="flex-1">
        <p className={eyebrowClass}>Impact Lab hackathon</p>
        <h2 className="font-mono text-base font-bold text-text-primary group-hover:text-green-primary transition-colors">
          {copy.title}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{copy.description}</p>
      </div>
      <span className="font-mono text-sm text-text-dim group-hover:text-green-primary transition-colors">
        Open &rarr;
      </span>
    </Link>
  );
}

interface SubmissionRowProps {
  type: string;
  title: string;
  status: string;
  createdAt: Date;
  href?: string;
}

function SubmissionRow({ type, title, status, createdAt, href }: SubmissionRowProps) {
  const statusColor =
    status === "APPROVED"
      ? "text-green-primary border-green-primary/30 bg-green-primary/10"
      : status === "REJECTED"
      ? "text-red border-red/30 bg-red/10"
      : "text-amber border-amber/30 bg-amber/10";

  const dateLabel = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const inner = (
    <div className="flex flex-wrap items-center gap-3 rounded border border-border-default bg-bg-secondary px-4 py-3 transition-colors hover:border-border-hover">
      <span className="rounded border border-border-default bg-bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-dim">
        {type}
      </span>
      <span className="flex-1 truncate font-mono text-sm text-text-primary">{title}</span>
      <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusColor}`}>
        {status.toLowerCase()}
      </span>
      <span className="font-mono text-[11px] text-text-dim">{dateLabel}</span>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

interface DashboardCardProps {
  href: string;
  external?: boolean;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: "green-primary" | "amber" | "cyan";
}

function DashboardCard({ href, external, icon: Icon, title, description, accent }: DashboardCardProps) {
  const accentClass =
    accent === "green-primary"
      ? "text-green-primary border-green-primary/30 bg-green-primary/10 group-hover:border-green-primary/60"
      : accent === "amber"
      ? "text-amber border-amber/30 bg-amber/10 group-hover:border-amber/60"
      : "text-cyan border-cyan/30 bg-cyan/10 group-hover:border-cyan/60";

  const linkClass =
    "group flex flex-col gap-3 rounded-lg border border-border-default bg-bg-secondary p-5 transition-all hover:border-border-hover";

  const content = (
    <>
      <div className={`flex h-10 w-10 items-center justify-center rounded border ${accentClass} transition-colors`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-mono text-sm font-bold text-text-primary">{title}</h3>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">{description}</p>
      </div>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={linkClass}>
      {content}
    </Link>
  );
}
