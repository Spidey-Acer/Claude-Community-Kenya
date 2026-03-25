import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { CommandPrefix } from "@/components/terminal";
import { Timeline } from "@/components/ui/Timeline";
import { Button } from "@/components/ui/Button";
import { TeamMemberCard } from "@/components/sections/TeamMemberCard";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getTeamMembers } from "@/lib/data";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About | Claude Community Kenya",
  description:
    "East Africa's first Claude developer community. 5 events, 700+ registrations, two cities — Nairobi and Mombasa. Anthropic-supported.",
  alternates: {
    canonical: "https://www.claudekenya.org/about",
  },
  openGraph: {
    title: "About | Claude Community Kenya",
    description:
      "East Africa's first Claude developer community. 5 events, 700+ registrations, two cities — Nairobi and Mombasa. Anthropic-supported.",
    url: "https://www.claudekenya.org/about",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const timelineEntries = [
  {
    date: "Jan 24, 2026",
    title: "Kenya's First Claude Code Meetup",
    description:
      "13 developers at iHiT Events Space, Westlands. Engineers from Microsoft, Equity Bank, Safaricom. Peter Kibet demoed Claude Code on a live production system. The community was born.",
    hash: "a1b2c3d",
  },
  {
    date: "Feb 20, 2026",
    title: "Nairobi Meetup #2",
    description:
      "50+ builders packed the room. Session ran 2.5 hours overtime. Deep dives into Claude Code workflows and multi-instance development. Unanimous demand for a hackathon.",
    hash: "f0a1b2c",
  },
  {
    date: "Feb 26, 2026",
    title: "First Mombasa Meetup",
    description:
      "CCK expands to the coast. 202 registered at the Technical University of Mombasa. 100% show rate. First Claude event outside Nairobi.",
    hash: "c3d4e5f",
  },
  {
    date: "Mar 8, 2026",
    title: "She Builds Nairobi (IWD)",
    description:
      "120+ builders at Blockchain Centre Nairobi. International Women's Day builder event. Peter Kibet spoke on building with Claude AI — live smart contract workshop using Claude as co-pilot.",
    hash: "d4e5f6g",
  },
  {
    date: "Mar 20, 2026",
    title: "Claude for Everyone — Nairobi",
    description:
      "316 registrations — largest Claude event registration in Africa. Covered Claude AI, Claude Code, and Cowork. Featured community workflow demo by Billy Mwangi.",
    hash: "e5f6g7h",
  },
];

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const team = await getTeamMembers().catch(() => []);

  return (
    <div>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "About" }]} />
      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-24" aria-label="About hero">
        <ScrollReveal>
          <div className="mb-8 flex justify-center">
            <div className="relative overflow-hidden rounded-2xl border border-amber/30 bg-bg-card p-2 shadow-lg shadow-amber/5">
              <Image
                src="/images/Claude Community Kenya.png"
                alt="Claude Community Kenya"
                width={280}
                height={280}
                className="rounded-xl"
                priority
              />
            </div>
          </div>
          <h1 className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl">
            <CommandPrefix />
            cat README.md
          </h1>
          <p className="max-w-2xl font-sans text-lg text-text-secondary">
            The story of East Africa&apos;s first Claude developer community.
          </p>
        </ScrollReveal>
      </section>

      {/* ─── Our Story ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-label="Our story">
        <ScrollReveal>
          <h2 className="mb-2 font-mono text-xl text-green-primary">
            <CommandPrefix />
            cat origin-story.md
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="mt-8 max-w-3xl space-y-6 font-sans text-text-secondary leading-relaxed">
            <p>
              It started with 13 developers in a room.
            </p>
            <p>
              On January 24, 2026, a small group gathered at iHiT Events Space in
              Westlands, Nairobi for Kenya&apos;s first Claude Code meetup. Engineers
              from Microsoft, Equity Bank, and Safaricom. One live demo of Claude
              Code on a real production system managing 26,000+ coffee plants.
              Nobody wanted to leave.
            </p>
            <p>
              By Event #2, 50+ builders showed up and the session ran 2.5 hours
              overtime. Event #3 moved to the coast — 202 people registered at the
              Technical University of Mombasa with a 100% show rate. Event #4 was
              an International Women&apos;s Day builder event at Blockchain Centre where
              Peter spoke on building with Claude AI. Event #5 hit 316 registrations
              — the largest Claude event registration in Africa.
            </p>
            <p>
              Five events. Three months. Two cities. Still growing.
            </p>
            <p>
              Claude Community Kenya is led by Peter Kibet, Claude Community
              Ambassador for Kenya — part of Anthropic&apos;s founding global cohort
              of community leaders across 74 cities in 33 countries.
            </p>
            <p>
              We are not just learning about AI — we are building with it, every day.
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
            <h2 className="mb-12 font-mono text-xl text-green-primary">
              <CommandPrefix />
              cat mission.json
            </h2>
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
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Give Kenyan builders the tools, knowledge, and community to
                    build real things with Claude — from farm management systems
                    to fintech, from healthtech to education.
                  </p>
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
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Make Kenya a reference point for AI-first development in
                    Africa. Not by talking about it — by shipping.
                  </p>
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
                        <span className="font-mono text-text-primary">Build in public</span>{" "}
                        — Ship real projects, share your process, show your work
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Community over audience</span>{" "}
                        — This is a room of builders, not a stage with spectators
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Solve local problems</span>{" "}
                        — Kenyan problems, world-class tools
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Show, don&apos;t tell</span>{" "}
                        — Demos over decks, shipping over slides
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
          <h2 className="mb-2 font-mono text-xl text-green-primary">
            <CommandPrefix />
            ls team/ --all
          </h2>
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
            <h2 className="mb-2 font-mono text-xl text-green-primary">
              <CommandPrefix />
              git log --oneline
            </h2>
            <p className="mb-12 font-sans text-text-secondary">
              Our journey so far — every milestone tracked like a git commit.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="max-w-2xl">
              <Timeline entries={timelineEntries} />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
