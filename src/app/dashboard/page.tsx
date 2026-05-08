import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUpcomingEvents } from "@/lib/data";
import { SOCIAL_LINKS } from "@/lib/constants";
import { Calendar, MessageSquare, BookOpen, Sparkles, Code2 } from "lucide-react";
import { SignOutButton } from "./SignOutButton";

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
      select: { firstName: true, lastName: true, email: true, createdAt: true, role: true },
    }),
    getUpcomingEvents().catch(() => []),
  ]);

  if (!user) redirect("/login");

  const nextEvent = upcomingEvents[0];

  return (
    <main className="min-h-screen bg-bg-primary pt-24 pb-20">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-green-primary mb-2">
              $ whoami
            </p>
            <h1 className="font-mono text-3xl font-bold text-text-primary sm:text-4xl">
              Welcome back, {user.firstName}.
            </h1>
            <p className="mt-2 font-mono text-sm text-text-dim">
              {user.email} &middot; member since {formatJoinDate(user.createdAt)}
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
            // ./quick-links
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

        {/* Footer note */}
        <footer className="mt-12 border-t border-border-default pt-6">
          <p className="font-mono text-xs text-text-dim">
            // Member features in progress: saved events, contribution history, profile editing.
            <br />
            Have an idea?{" "}
            <Link href="/submit-idea" className="text-green-primary hover:underline">
              Tell us
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  );
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
