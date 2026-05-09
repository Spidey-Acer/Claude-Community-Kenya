import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
import { Timeline } from "@/components/ui/Timeline";
import { Button } from "@/components/ui/Button";
import { TeamMemberCard } from "@/components/sections/TeamMemberCard";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getTeamMembers, getEvents } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { SOCIAL_LINKS } from "@/lib/constants";
import type { CommunityStats } from "@/components/sections/HeroTerminal";

function formatTimelineDate(iso: string): string {
  // iso comes in as YYYY-MM-DD (already mapped by getEvents)
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortHash(slug: string): string {
  // Stable 7-char "commit-like" hash from slug
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(7, "0").slice(0, 7);
}

export const metadata: Metadata = {
  title: "About | Claude Community Kenya",
  description:
    "Africa's only Claude community. Developers, creators, researchers, and professionals using Claude AI across Kenya.",
  alternates: {
    canonical: "https://www.claudekenya.org/about",
  },
  openGraph: {
    title: "About | Claude Community Kenya",
    description:
      "Africa's only Claude developer community. Anthropic-supported meetups, workshops, and builders across Kenya.",
    url: "https://www.claudekenya.org/about",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 100,
  whatsappMembers: 120,
  linkedinMembers: 80,
  totalMembers: 300,
  eventsHeld: 2,
  citiesActive: ["Nairobi", "Mombasa"],
  resourceCount: 33,
};

export const revalidate = 3600;

export default async function AboutPage() {
  const [team, siteSettings, allEvents] = await Promise.all([
    getTeamMembers().catch(() => []),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    getEvents().catch(() => []),
  ]);

  // Timeline = past events, oldest first. Source of truth: admin-managed DB.
  const timelineEntries = allEvents
    .filter((e) => e.status === "completed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: formatTimelineDate(e.date),
      title: e.title,
      description: e.description,
      hash: shortHash(e.slug),
    }));

  const stats: CommunityStats = siteSettings
    ? {
        discordMembers: siteSettings.discordMembers,
        whatsappMembers: siteSettings.whatsappMembers,
        linkedinMembers: siteSettings.linkedinMembers,
        totalMembers:
          siteSettings.discordMembers +
          siteSettings.whatsappMembers +
          siteSettings.linkedinMembers,
        eventsHeld: siteSettings.eventsHeld,
        citiesActive: Array.isArray(siteSettings.citiesActive)
          ? (siteSettings.citiesActive as string[])
          : (JSON.parse(siteSettings.citiesActive as string) as string[]),
        resourceCount: siteSettings.resourceCount,
      }
    : DEFAULT_STATS;

  return (
    <div>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "About" }]} />
      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-24" aria-label="About hero">
        <ScrollReveal>
          <div className="mb-8 flex justify-center">
            <div className="relative overflow-hidden rounded-2xl border border-amber/30 bg-bg-card p-2 shadow-lg shadow-amber/5">
              <Image
                src="/images/cck-logo-wordmark.webp"
                alt="Claude Community Kenya"
                width={280}
                height={280}
                className="rounded-xl"
                priority
              />
            </div>
          </div>
          <PersonaHeading page="about" section="hero" as="h1" className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl" />
          <PersonaText page="about" section="hero" field="subtitle" className="max-w-2xl font-sans text-lg text-text-secondary" />
        </ScrollReveal>

        {/* ─── Continental Stats ─── */}
        <ScrollReveal delay={200}>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border-default bg-bg-card p-4 text-center">
              <p className="font-mono text-2xl font-bold text-green-primary">{stats.eventsHeld}</p>
              <p className="mt-1 font-sans text-xs text-text-dim uppercase tracking-wider">Events held</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-card p-4 text-center">
              <p className="font-mono text-2xl font-bold text-amber">{stats.totalMembers}+</p>
              <p className="mt-1 font-sans text-xs text-text-dim uppercase tracking-wider">Community members</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-card p-4 text-center">
              <p className="font-mono text-2xl font-bold text-cyan">{stats.citiesActive.length}</p>
              <p className="mt-1 font-sans text-xs text-text-dim uppercase tracking-wider">Cities active</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-card p-4 text-center">
              <p className="font-mono text-2xl font-bold text-red">1</p>
              <p className="mt-1 font-sans text-xs text-text-dim uppercase tracking-wider">Continent. Just us.</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Our Story ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-label="Our story">
        <ScrollReveal>
          <PersonaHeading page="about" section="origin" />
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="mt-8 max-w-3xl space-y-6 font-sans text-text-secondary leading-relaxed">
            <p>
              Across the global Claude Community network, Kenya is the East African chapter.
              This is it.
            </p>
            <p>
              It started on January 24, 2026 at iHiT Events Space in Westlands, Nairobi.
              Developers, creators, and professionals gathered for Kenya&apos;s first
              Claude Code meetup — curious about what AI could do for their work. One
              live demo of Claude on a real production system managing 26,000+ coffee plants.
              Nobody wanted to leave.
            </p>
            <p>
              Since then the community has grown across Nairobi and Mombasa — meetups,
              hands-on workshops, project showcases, and the first Claude hackathon in
              East Africa. Every gathering ships something: talks, demos, builds, conversations.
            </p>
            <p>
              {stats.eventsHeld} events. {stats.citiesActive.join(" & ")}. {stats.totalMembers}+ members.
              Still growing.
            </p>
            <p>
              Claude Community Kenya is led by Peter Kibet, Anthropic-recognized Claude
              Community Ambassador for Kenya.
            </p>
            <p>
              Whether you write code, write copy, run a business, or do research —
              if you use Claude, this is your community.
            </p>
            <p className="border-l-2 border-border-default pl-4 text-sm text-text-dim">
              Claude Community Kenya is an independently operated community initiative,
              supported by Anthropic PBC through event funding and API credits via the
              Community Ambassador programme. We operate autonomously — community content,
              opinions, and activities represent the community, not official Anthropic positions.
              &ldquo;Claude&rdquo; and &ldquo;Anthropic&rdquo; are trademarks of Anthropic PBC.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Our Mission ─── */}
      <section
        className="border-y border-border-default bg-bg-secondary py-24"
        aria-label="Mission, vision, and values"
      >
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <PersonaHeading page="about" section="mission" className="mb-12 font-mono text-xl text-green-primary" />
          </ScrollReveal>

          <div className="grid gap-8 lg:grid-cols-3">
            <ScrollReveal delay={0}>
              <TerminalWindow
                title="MISSION"
                variant="command"
                className="h-full"
              >
                <div className="space-y-3">
                  <h3 className="font-mono text-base font-bold text-amber">
                    {"// MISSION"}
                  </h3>
                  <PersonaText page="about" section="missionContent" field="description" className="text-sm text-text-secondary leading-relaxed" />
                </div>
              </TerminalWindow>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <TerminalWindow
                title="VISION"
                variant="command"
                className="h-full"
              >
                <div className="space-y-3">
                  <h3 className="font-mono text-base font-bold text-amber">
                    {"// VISION"}
                  </h3>
                  <PersonaText page="about" section="visionContent" field="description" className="text-sm text-text-secondary leading-relaxed" />
                </div>
              </TerminalWindow>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <TerminalWindow
                title="VALUES"
                variant="command"
                className="h-full"
              >
                <div className="space-y-3">
                  <h3 className="font-mono text-base font-bold text-amber">
                    {"// VALUES"}
                  </h3>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Work in the open</span>{" "}
                        — Share what you&apos;re creating, how you&apos;re using Claude, what you&apos;ve learned
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Community over audience</span>{" "}
                        — A room of doers, not a stage with spectators
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Solve local problems</span>{" "}
                        — African challenges, world-class AI
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Show, don&apos;t tell</span>{" "}
                        — Results over presentations, doing over planning
                      </span>
                    </li>
                  </ul>
                </div>
              </TerminalWindow>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── The Team ─── */}
      <section className="mx-auto max-w-6xl px-4 py-24" aria-label="Our team">
        <ScrollReveal>
          <PersonaHeading page="about" section="team" />
          <p className="mb-12 font-sans text-text-secondary">
            The people behind Claude Community Kenya.
          </p>
        </ScrollReveal>

        <ScrollReveal
          stagger={100}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {team.map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <div className="mt-12 text-center">
            <p className="mb-4 font-sans text-text-secondary">
              Want to join the team? We&apos;re always looking for passionate
              organizers, speakers, and community builders.
            </p>
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="primary">JOIN_US_ON_DISCORD</Button>
            </a>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Timeline / Milestones ─── */}
      <section
        className="border-y border-border-default bg-bg-secondary py-24"
        aria-label="Community timeline"
      >
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <PersonaHeading page="about" section="timeline" />
            <PersonaText page="about" section="timeline" field="subtitle" className="mb-12 font-sans text-text-secondary" />
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="max-w-2xl">
              {timelineEntries.length > 0 ? (
                <Timeline entries={timelineEntries} />
              ) : (
                <p className="font-mono text-sm text-text-dim">
                  // first event coming soon — check the events page.
                </p>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
