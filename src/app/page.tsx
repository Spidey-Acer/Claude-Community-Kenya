import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Terminal, Code, GraduationCap, MessageSquare, Calendar, Share2, ChevronDown, Layers, BookOpen } from "lucide-react";
import { HeroTerminal } from "@/components/sections/HeroTerminal";
import type { FeedItem } from "@/components/sections/HeroTerminal";
import { StatsBar } from "@/components/sections/StatsBar";
import { EventCard } from "@/components/sections/EventCard";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { TestimonialsCarousel } from "@/components/sections/TestimonialsCarousel";
import { LazyMatrixRain } from "@/components/terminal/LazyMatrixRain";
import { ScrollReveal } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { CommandPrefix } from "@/components/terminal";
import { getUpcomingEvents, getFeaturedProjects, getBlogPosts, getCommunitySubmissions } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Claude Community Kenya | East Africa's First Claude Developer Community",
  description:
    "Anthropic-supported Claude developer community. Join meetups, workshops, and build with Claude AI across East Africa.",
  openGraph: {
    title: "Claude Community Kenya | East Africa's First Claude Developer Community",
    description:
      "Anthropic-supported Claude developer community. Join meetups, workshops, and build with Claude AI across East Africa.",
    url: "https://www.claudekenya.org",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya | East Africa's First Claude Developer Community",
    description:
      "Anthropic-supported Claude developer community. Join meetups, workshops, and build with Claude AI across East Africa.",
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


export const revalidate = 3600;

export default async function Home() {
  const [upcomingEvents, featuredProjects, siteSettings, blogPosts, communityData] = await Promise.all([
    getUpcomingEvents().catch(() => []),
    getFeaturedProjects().catch(() => []),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    getBlogPosts().catch(() => []),
    getCommunitySubmissions({ limit: 5, sort: "recent" }).catch(() => ({ items: [], total: 0 })),
  ]);

  // Build activity feed for hero terminal — interleave blogs, community, projects
  const feedItems: FeedItem[] = [];
  for (const post of blogPosts.slice(0, 3)) {
    feedItems.push({
      type: "blog",
      label: "BLOG",
      title: post.title,
      meta: `by ${post.author} · ${post.readingTime} min read`,
      href: `/blog/${post.slug}`,
    });
  }
  for (const item of communityData.items.slice(0, 3)) {
    feedItems.push({
      type: "community",
      label: item.type,
      title: item.title,
      meta: item.submitterName ? `shared by ${item.submitterName}` : item.shortDescription.slice(0, 60),
      href: `/community/${item.slug}`,
    });
  }
  for (const project of featuredProjects.slice(0, 2)) {
    feedItems.push({
      type: "project",
      label: "PROJECT",
      title: project.name,
      meta: `by ${project.builder} · ${project.stack.slice(0, 3).join(", ")}`,
      href: "/projects",
    });
  }

  const communityStats = siteSettings
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
    : undefined;

  return (
    <div>
      {/* ─── Hero Section ─── */}
      <section
        className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden px-4"
        aria-label="Hero"
      >
        <LazyMatrixRain opacity={0.05} density={0.2} />

        <div className="relative z-10 flex flex-col items-center gap-8">
          <HeroTerminal stats={communityStats} feed={feedItems} />

          <ScrollReveal delay={800}>
            <p className="max-w-xl text-center font-sans text-lg text-text-secondary">
              Anthropic-supported Claude developer community — building,
              learning, and shipping with Claude across East Africa.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={1200}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={SOCIAL_LINKS.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-green-primary px-5 py-2.5 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <span className="text-current" aria-hidden="true">&gt;</span>
                JOIN_DISCORD
              </a>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 border border-cyan px-5 py-2.5 font-mono text-sm font-medium text-cyan transition-all duration-200 hover:bg-cyan hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <span className="text-current" aria-hidden="true">&gt;</span>
                COMMUNITY_HUB
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 border border-amber px-5 py-2.5 font-mono text-sm font-medium text-amber transition-all duration-200 hover:bg-amber hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <span className="text-current" aria-hidden="true">&gt;</span>
                VIEW_EVENTS
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 border border-border-hover px-5 py-2.5 font-mono text-sm font-medium text-text-secondary transition-all duration-200 hover:border-text-primary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <span className="text-current" aria-hidden="true">&gt;</span>
                PROJECTS
              </Link>
            </div>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block">
          <ScrollReveal delay={2000}>
            <div className="flex flex-col items-center gap-1 text-text-dim">
              <ChevronDown className="h-5 w-5 animate-bounce opacity-60" aria-hidden="true" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-label="Community stats">
        <StatsBar stats={communityStats} />
      </section>

      {/* ─── Next Event Highlight ─── */}
      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12" aria-label="Next event">
          <ScrollReveal>
            <Link
              href={`/events/${upcomingEvents[0].slug}`}
              className="group relative flex flex-col items-center gap-4 overflow-hidden border border-green-primary/20 bg-bg-secondary p-8 transition-all duration-300 hover:border-green-primary/40 hover:shadow-[0_0_30px_rgba(0,255,65,0.08)] sm:flex-row sm:gap-8"
            >
              {/* Subtle glow pulse */}
              <div className="pointer-events-none absolute -inset-px rounded opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ boxShadow: "inset 0 0 30px rgba(0,255,65,0.06)" }} />
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10">
                <Calendar className="h-7 w-7 text-green-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="mb-1 font-mono text-xs uppercase tracking-wider text-green-primary">
                  Next Event
                </p>
                <h3 className="mb-1 font-mono text-lg font-bold text-text-primary group-hover:text-green-primary transition-colors">
                  {upcomingEvents[0].title}
                </h3>
                <p className="font-sans text-sm text-text-secondary">
                  {upcomingEvents[0].date} &middot; {upcomingEvents[0].time} &middot; {upcomingEvents[0].venue}
                </p>
              </div>
              <div className="flex-shrink-0 font-mono text-sm text-green-primary opacity-0 transition-opacity group-hover:opacity-100">
                View Details &rarr;
              </div>
            </Link>
          </ScrollReveal>
        </section>
      )}

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
            <Link href="/events" className="inline-flex items-center gap-2 border border-amber px-5 py-2.5 font-mono text-sm font-medium text-amber transition-all duration-200 hover:bg-amber hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
              <span className="text-current" aria-hidden="true">&gt;</span>
              VIEW_ALL_EVENTS
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

      {/* ─── Testimonials ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-label="Community voices">
        <ScrollReveal>
          <h2 className="mb-2 text-center font-mono text-xl text-green-primary">
            <CommandPrefix />
            cat community/voices.log
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-center font-sans text-text-secondary">
            What developers are saying about Claude Community Kenya.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <TestimonialsCarousel />
        </ScrollReveal>
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
          className="grid gap-6 lg:grid-cols-2"
        >
          {featuredProjects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <Link href="/projects" className="inline-flex items-center gap-2 border border-amber px-5 py-2.5 font-mono text-sm font-medium text-amber transition-all duration-200 hover:bg-amber hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
              <span className="text-current" aria-hidden="true">&gt;</span>
              VIEW_ALL_PROJECTS
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
                    className={`inline-flex w-full items-center justify-center gap-2 border px-5 py-2.5 font-mono text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${
                      pathway.isPrimary
                        ? "border-green-primary text-green-primary hover:bg-green-primary hover:text-bg-primary focus-visible:ring-green-primary"
                        : "border-amber text-amber hover:bg-amber hover:text-bg-primary focus-visible:ring-amber"
                    }`}
                  >
                    <span className="text-current" aria-hidden="true">&gt;</span>
                    {pathway.cta}
                  </a>
                ) : (
                  <Link
                    href={pathway.href}
                    className="inline-flex w-full items-center justify-center gap-2 border border-amber px-5 py-2.5 font-mono text-sm font-medium text-amber transition-all duration-200 hover:bg-amber hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                  >
                    <span className="text-current" aria-hidden="true">&gt;</span>
                    {pathway.cta}
                  </Link>
                )}
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Supported By ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-label="Supported by">
        <ScrollReveal>
          <p className="mb-10 text-center font-mono text-xs uppercase tracking-widest text-text-dim">
            Supported by
          </p>
          <div className="flex items-center justify-center">
            <a
              href="https://anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-block rounded-2xl p-6 transition-all duration-500"
              style={{
                boxShadow: "0 0 20px rgba(0, 255, 65, 0.15), 0 0 60px rgba(0, 255, 65, 0.05)",
              }}
            >
              {/* Neon green glow border */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl border border-green-primary/30 transition-all duration-500 group-hover:border-green-primary/60"
                style={{
                  boxShadow:
                    "0 0 15px rgba(0, 255, 65, 0.2), inset 0 0 15px rgba(0, 255, 65, 0.05), 0 0 40px rgba(0, 255, 65, 0.1)",
                }}
              />
              <div className="transition-all duration-500 group-hover:drop-shadow-[0_0_12px_rgba(0,255,65,0.4)]">
                <Image
                  src="/images/ANTHROPIC.png"
                  alt="Anthropic"
                  width={220}
                  height={60}
                  className="brightness-0 invert transition-all duration-500 group-hover:brightness-0 group-hover:invert"
                />
              </div>
            </a>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
