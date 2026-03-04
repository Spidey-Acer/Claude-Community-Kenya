import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { CommandPrefix } from "@/components/terminal";
import { GlitchText } from "@/components/terminal";
import { Timeline } from "@/components/ui/Timeline";
import { Button } from "@/components/ui/Button";
import { TeamMemberCard } from "@/components/sections/TeamMemberCard";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { team } from "@/data/team";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About | Claude Community Kenya",
  description:
    "East Africa's first Claude Code developer community. Founded January 2026, 30+ members building with Claude across Nairobi and Mombasa.",
  alternates: {
    canonical: "https://www.claudekenya.org/about",
  },
  openGraph: {
    title: "About | Claude Community Kenya",
    description:
      "East Africa's first Claude Code developer community. Founded January 2026, 30+ members building with Claude across Nairobi and Mombasa.",
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
      "30+ developers gathered at iHiT Events Space in Westlands, Nairobi for the historic first-ever Claude Code meetup in East Africa. Peter Kibet showcased his Claude Code workflow and the community began to take shape.",
    hash: "a1b2c3d",
  },
  {
    date: "Feb 20, 2026",
    title: "Nairobi Meetup #2 [UPCOMING]",
    description:
      "Our second Nairobi meetup at iHiT Events Space. Deep dives into Claude Code workflows, multi-instance development, and community project updates.",
    hash: "f0a1b2c",
  },
  {
    date: "Feb 28, 2026",
    title: "First University Event [UPCOMING]",
    description:
      "Claude Community Kenya expands to Mombasa with a career talk at the Technical University of Mombasa, in partnership with Swahilipot Hub Foundation.",
    hash: "c3d4e5f",
  },
];

export default function AboutPage() {
  return (
    <div>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "About" }]} />
      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-24" aria-label="About hero">
        <ScrollReveal>
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
              It started with a simple idea: what if Kenya&apos;s developers had a
              dedicated space to explore, build, and ship with Claude? On January
              24, 2026, that idea became reality when over 30 developers gathered
              at iHiT Events Space in Westlands, Nairobi for what would become
              Kenya&apos;s very first Claude Code meetup.
            </p>
            <p>
              The meetup was a community gathering where developers talked,
              connected, and explored the possibilities of AI-assisted development.
              Peter Kibet showcased his Claude Code workflow with a live project demo —
              showing how AI-powered tools can help solve real problems
              right here in East Africa.
            </p>
            <p>
              By the end of the afternoon, new connections had formed and something
              bigger was clearly underway. What started in a Nairobi coworking
              space had the potential to grow across the continent.
            </p>
            <p>
              Today, Claude Community Kenya is expanding to Mombasa, partnering
              with universities like TU Mombasa and organizations like Swahilipot
              Hub Foundation, and building a pipeline of developers who are ready
              to lead the AI era. We are not just learning about AI — we are
              building with it, every day.
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
                    To empower every Kenyan developer with the tools, knowledge,
                    and community to build world-class applications using Claude
                    and AI-powered development workflows.
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
                    To make Kenya and East Africa a global hub for AI-first
                    software development, where developers leverage tools like
                    Claude Code to build solutions that matter — from farm
                    management systems to fintech, from healthtech to education.
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
                        — Ship real projects, share your journey
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Community first</span>{" "}
                        — Lift as you climb, help others grow
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Think local, build global</span>{" "}
                        — Solve Kenyan problems with world-class tools
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-primary" aria-hidden="true">
                        &gt;
                      </span>
                      <span>
                        <span className="font-mono text-text-primary">Stay curious</span>{" "}
                        — Keep learning, keep experimenting
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
            <TeamMemberCard key={member.id} member={member} />
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
