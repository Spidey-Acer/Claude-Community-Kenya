import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, Code, GraduationCap, MessageSquare, Users, Calendar, Share2 } from "lucide-react";
import { HeroTerminal } from "@/components/sections/HeroTerminal";
import { StatsBar } from "@/components/sections/StatsBar";
import { EventCard } from "@/components/sections/EventCard";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { MatrixRain } from "@/components/terminal";
import { ScrollReveal } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { GlitchText } from "@/components/terminal";
import { CommandPrefix } from "@/components/terminal";
import { Button } from "@/components/ui/Button";
import { getUpcomingEvents } from "@/data/events";
import { getFeaturedProjects } from "@/data/projects";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Claude Community Kenya | East Africa's First Claude Developer Community",
  description:
    "Kenya's official Anthropic developer community. Join meetups, workshops, and build with Claude AI across East Africa.",
  openGraph: {
    title: "Claude Community Kenya | East Africa's First Claude Developer Community",
    description:
      "Kenya's official Anthropic developer community. Join meetups, workshops, and build with Claude AI across East Africa.",
    url: "https://claudecommunity.co.ke",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya | East Africa's First Claude Developer Community",
    description:
      "Kenya's official Anthropic developer community. Join meetups, workshops, and build with Claude AI across East Africa.",
  },
};

const whatWeDoItems = [
  {
    icon: Terminal,
    title: "Meetups",
    description:
      "Regular in-person gatherings in Nairobi and Mombasa. Live demos, project showcases, and hands-on coding sessions with Claude.",
  },
  {
    icon: Code,
    title: "Workshops",
    description:
      "Deep-dive technical workshops on Claude Code, multi-instance development, agentic patterns, and production-ready AI applications.",
  },
  {
    icon: GraduationCap,
    title: "Career Talks",
    description:
      "University events and career sessions exploring AI opportunities, developer paths, and how to build a career around AI tools.",
  },
  {
    icon: MessageSquare,
    title: "Online Community",
    description:
      "Active Discord server for daily discussions, code reviews, project collaboration, job sharing, and connecting with Claude developers.",
  },
];

const joinPathways = [
  {
    icon: MessageSquare,
    title: "Join Discord",
    description:
      "Our primary community hub. Get help, share projects, find collaborators, and stay updated on everything Claude in Kenya.",
    href: SOCIAL_LINKS.discord,
    isPrimary: true,
    cta: "JOIN_DISCORD",
    external: true,
  },
  {
    icon: Calendar,
    title: "Attend an Event",
    description:
      "Nothing beats meeting fellow developers in person. Check our upcoming events in Nairobi and Mombasa.",
    href: "/events",
    isPrimary: false,
    cta: "VIEW_EVENTS",
    external: false,
  },
  {
    icon: Share2,
    title: "Follow Us",
    description:
      "Stay in the loop on Twitter and LinkedIn for event announcements, community highlights, and AI development tips.",
    href: SOCIAL_LINKS.twitter,
    isPrimary: false,
    cta: "FOLLOW_US",
    external: true,
  },
];

const partners = [
  "Anthropic",
  "iHiT Events Space",
  "Swahilipot Hub Foundation",
  "Technical University of Mombasa",
];

export default function Home() {
  const upcomingEvents = getUpcomingEvents();
  const featuredProjects = getFeaturedProjects();

  return (
    <div>
      {/* ─── Hero Section ─── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
        aria-label="Hero"
      >
        <MatrixRain opacity={0.05} density={0.2} />

        <div className="relative z-10 flex flex-col items-center gap-8">
          <HeroTerminal />

          <ScrollReveal delay={800}>
            <p className="max-w-xl text-center font-sans text-lg text-text-secondary">
              Kenya&apos;s official Anthropic developer community — building,
              learning, and shipping with Claude across East Africa.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={1200}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={SOCIAL_LINKS.discord}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary">JOIN_DISCORD</Button>
              </a>
              <Link href="/events">
                <Button variant="secondary">VIEW_EVENTS</Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ScrollReveal delay={2000}>
            <div className="flex flex-col items-center gap-2 text-text-dim">
              <span className="font-mono text-xs">scroll</span>
              <div className="h-8 w-px bg-border-default" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-label="Community stats">
        <StatsBar />
      </section>

      {/* ─── Featured Events ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-label="Upcoming events">
        <ScrollReveal>
          <h2 className="mb-2 font-mono text-xl text-green-primary">
            <CommandPrefix />
            ls events/ --upcoming
          </h2>
          <p className="mb-10 font-sans text-text-secondary">
            Upcoming meetups, workshops, and career talks across Kenya.
          </p>
        </ScrollReveal>

        <ScrollReveal
          stagger={150}
          className="grid gap-6 md:grid-cols-2"
        >
          {upcomingEvents.map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <Link href="/events">
              <Button variant="secondary">VIEW_ALL_EVENTS</Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── What We Do ─── */}
      <section
        className="border-y border-border-default bg-bg-secondary py-24"
        aria-label="What we do"
      >
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <h2 className="mb-2 font-mono text-xl text-green-primary">
              <CommandPrefix />
              man claude-community-kenya
            </h2>
            <p className="mb-12 font-sans text-text-secondary">
              How we bring Kenya&apos;s developer community together around Claude and AI.
            </p>
          </ScrollReveal>

          <ScrollReveal
            stagger={100}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {whatWeDoItems.map((item) => (
              <TerminalWindow
                key={item.title}
                title={item.title.toLowerCase() + ".sh"}
                variant="command"
                className="h-full"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded border border-green-primary/20 bg-green-primary/10">
                    <item.icon
                      className="h-5 w-5 text-green-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-mono text-base font-bold text-text-primary">
                    {item.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </TerminalWindow>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Community Showcase ─── */}
      <section className="mx-auto max-w-6xl px-4 py-24" aria-label="Community projects">
        <ScrollReveal>
          <h2 className="mb-2 font-mono text-xl text-green-primary">
            <CommandPrefix />
            ls projects/ --featured
          </h2>
          <p className="mb-12 font-sans text-text-secondary">
            Real projects built by community members with Claude Code.
          </p>
        </ScrollReveal>

        <ScrollReveal
          stagger={150}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {featuredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <Link href="/projects">
              <Button variant="secondary">VIEW_ALL_PROJECTS</Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Join CTA ─── */}
      <section
        className="border-y border-border-default bg-bg-secondary py-24"
        aria-label="Join the community"
      >
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <h2 className="mb-2 text-center font-mono text-xl text-green-primary">
              <CommandPrefix />
              sudo join --community
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center font-sans text-text-secondary">
              Whether you&apos;re an experienced AI developer or just getting started,
              there&apos;s a place for you in Claude Community Kenya.
            </p>
          </ScrollReveal>

          <ScrollReveal
            stagger={100}
            className="grid gap-6 md:grid-cols-3"
          >
            {joinPathways.map((pathway) => (
              <div
                key={pathway.title}
                className={`border bg-bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 ${
                  pathway.isPrimary
                    ? "border-green-primary/40 shadow-[0_0_20px_rgba(0,255,65,0.08)] hover:shadow-[0_0_30px_rgba(0,255,65,0.15)]"
                    : "border-border-default hover:border-border-hover hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]"
                }`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded border border-green-primary/20 bg-green-primary/10">
                  <pathway.icon
                    className={`h-6 w-6 ${
                      pathway.isPrimary ? "text-green-primary" : "text-text-secondary"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mb-2 font-mono text-base font-bold text-text-primary">
                  {pathway.title}
                </h3>
                <p className="mb-6 text-sm text-text-secondary leading-relaxed">
                  {pathway.description}
                </p>
                {pathway.external ? (
                  <a
                    href={pathway.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant={pathway.isPrimary ? "primary" : "secondary"}
                      className="w-full justify-center"
                    >
                      {pathway.cta}
                    </Button>
                  </a>
                ) : (
                  <Link href={pathway.href}>
                    <Button variant="secondary" className="w-full justify-center">
                      {pathway.cta}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Partners Bar ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-label="Partners">
        <ScrollReveal>
          <p className="mb-8 text-center font-mono text-xs uppercase tracking-widest text-text-dim">
            Supported by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {partners.map((partner) => (
              <span
                key={partner}
                className="font-mono text-sm text-text-secondary transition-colors duration-200 hover:text-green-primary"
              >
                {partner}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
