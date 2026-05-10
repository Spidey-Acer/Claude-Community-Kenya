"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Terminal, Code, GraduationCap, MessageSquare, Calendar, Share2, ChevronDown, Sparkles, Cpu } from "lucide-react";
import { useSkin } from "@/contexts/SkinContext";
import type { Event } from "@/lib/types";
import type { ProjectView } from "@/lib/data";
import { HeroTerminal } from "@/components/sections/HeroTerminal";
import { HeroPro } from "@/components/sections/HeroPro";
import { StatsBar } from "@/components/sections/StatsBar";
import { StatsBarPro } from "@/components/sections/StatsBarPro";
import { EventCard } from "@/components/sections/EventCard";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { TestimonialsCarousel } from "@/components/sections/TestimonialsCarousel";
import { LazyMatrixRain } from "@/components/terminal/LazyMatrixRain";
import { ScrollReveal } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
import { PersonaCTA, PersonaSection } from "@/components/persona/ProWrappers";
import { SOCIAL_LINKS } from "@/lib/constants";
import type { CommunityStats, FeedItem } from "@/components/sections/HeroTerminal";

interface HomeContentProps {
  communityStats?: CommunityStats;
  feedItems: FeedItem[];
  upcomingEvents: Event[];
  featuredProjects: ProjectView[];
}

const whatWeDoItems = [
  {
    icon: Terminal,
    title: "Meetups",
    proTitle: "Community Meetups",
    description:
      "Regular in-person gatherings in Nairobi and Mombasa. Live demos, project showcases, and hands-on coding sessions with Claude.",
    proDescription:
      "Regular gatherings across Kenya — networking, live demos, project showcases, and collaborative learning with Claude AI.",
  },
  {
    icon: Code,
    title: "Workshops",
    proTitle: "Hands-on Workshops",
    description:
      "Deep-dive technical workshops on Claude Code, multi-instance development, agentic patterns, and production-ready AI applications.",
    proDescription:
      "Focused sessions on mastering Claude for real work — from creative projects to business automation and professional workflows.",
  },
  {
    icon: GraduationCap,
    title: "Career Talks",
    proTitle: "Career & Learning",
    description:
      "University events and career sessions exploring AI opportunities, developer paths, and how to build a career around AI tools.",
    proDescription:
      "University events and career sessions exploring AI opportunities and how to grow your career with AI tools.",
  },
  {
    icon: MessageSquare,
    title: "Online Community",
    proTitle: "Community Hub",
    description:
      "Active Discord server for daily discussions, code reviews, project collaboration, job sharing, and connecting with Claude developers.",
    proDescription:
      "Join our Discord for daily discussions, collaboration, job sharing, and connecting with people using Claude across East Africa.",
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
    proCta: "Join Discord",
    external: true,
  },
  {
    icon: Calendar,
    title: "Attend an Event",
    description:
      "Nothing beats meeting people in person. Check our upcoming events in Nairobi and Mombasa.",
    href: "/events",
    isPrimary: false,
    cta: "VIEW_EVENTS",
    proCta: "View Events",
    external: false,
  },
  {
    icon: Share2,
    title: "Follow Us",
    description:
      "Stay in the loop on Twitter and LinkedIn for event announcements, community highlights, and tips.",
    href: SOCIAL_LINKS.twitter,
    isPrimary: false,
    cta: "FOLLOW_US",
    proCta: "Follow Us",
    external: true,
  },
];

export function HomeContent({ communityStats, feedItems, upcomingEvents, featuredProjects }: HomeContentProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <div>
      {/* ─── Hero Section ─── */}
      {isPro ? (
        <section aria-label="Hero">
          <HeroPro stats={communityStats} feed={feedItems} />
        </section>
      ) : (
        <section
          className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden px-4"
          aria-label="Hero"
        >
          <LazyMatrixRain opacity={0.05} density={0.2} />
          <div className="relative z-10 flex flex-col items-center gap-8 pt-10 md:pt-14">
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
                  className="inline-flex items-center gap-2 border border-green-primary px-5 py-2.5 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary"
                >
                  <span className="text-current" aria-hidden="true">&gt;</span>
                  JOIN_DISCORD
                </a>
                <Link
                  href="/community"
                  className="inline-flex items-center gap-2 border border-cyan px-5 py-2.5 font-mono text-sm font-medium text-cyan transition-all duration-200 hover:bg-cyan hover:text-bg-primary"
                >
                  <span className="text-current" aria-hidden="true">&gt;</span>
                  COMMUNITY_HUB
                </Link>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 border border-amber px-5 py-2.5 font-mono text-sm font-medium text-amber transition-all duration-200 hover:bg-amber hover:text-bg-primary"
                >
                  <span className="text-current" aria-hidden="true">&gt;</span>
                  VIEW_EVENTS
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 border border-border-hover px-5 py-2.5 font-mono text-sm font-medium text-text-secondary transition-all duration-200 hover:border-text-primary hover:text-text-primary"
                >
                  <span className="text-current" aria-hidden="true">&gt;</span>
                  PROJECTS
                </Link>
              </div>
            </ScrollReveal>
          </div>
          <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block">
            <ScrollReveal delay={2000}>
              <ChevronDown className="h-5 w-5 animate-bounce text-text-dim opacity-60" aria-hidden="true" />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ─── Stats Bar ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-label="Community stats">
        {isPro ? (
          <StatsBarPro stats={communityStats} />
        ) : (
          <StatsBar stats={communityStats} />
        )}
      </section>

      {/* ─── Next Event Highlight ─── */}
      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12" aria-label="Next event">
          {isPro ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href={`/events/${upcomingEvents[0].slug}`}
                className="group flex flex-col items-center gap-6 overflow-hidden rounded-2xl border border-[#2a2a28] bg-[#1e1e1d]/80 p-8 backdrop-blur-sm transition-all duration-300 hover:border-[#3a3a37] hover:-translate-y-0.5 sm:flex-row"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d97757]/20 to-[#6a9bcc]/20 border border-[#3a3a37]">
                  <Calendar className="h-6 w-6 text-[#d97757]" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#7a7870]">
                    Next Event
                  </p>
                  <h3 className="mb-1 text-lg font-semibold text-[#faf9f5] group-hover:text-[#d97757] transition-colors">
                    {upcomingEvents[0].title}
                  </h3>
                  <p className="text-sm text-[#b0aea5]">
                    {upcomingEvents[0].date} · {upcomingEvents[0].time} · {upcomingEvents[0].venue}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-zinc-600 transition-colors group-hover:text-[#b0aea5]">
                  View Details →
                </span>
              </Link>
            </motion.div>
          ) : (
            <ScrollReveal>
              <Link
                href={`/events/${upcomingEvents[0].slug}`}
                className="group relative flex flex-col items-center gap-4 overflow-hidden border border-green-primary/20 bg-bg-secondary p-8 transition-all duration-300 hover:border-green-primary/40 hover:shadow-[0_0_30px_rgba(0,255,65,0.08)] sm:flex-row sm:gap-8"
              >
                <div className="pointer-events-none absolute -inset-px rounded opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ boxShadow: "inset 0 0 30px rgba(0,255,65,0.06)" }} />
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10">
                  <Calendar className="h-7 w-7 text-green-primary" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-green-primary">Next Event</p>
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
          )}
        </section>
      )}

      {/* ─── Featured Events ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-label="Upcoming events">
        <ScrollReveal>
          <PersonaHeading page="home" section="events" />
          <PersonaText page="home" section="events" field="subtitle" className={isPro ? "mb-10 text-[#b0aea5]" : "mb-10 font-sans text-text-secondary"} />
        </ScrollReveal>

        <ScrollReveal stagger={150} className="grid gap-6 md:grid-cols-2">
          {upcomingEvents.map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <PersonaCTA
              href="/events"
              devLabel="VIEW_ALL_EVENTS"
              proLabel="View All Events"
              variant="secondary"
            />
          </div>
        </ScrollReveal>
      </section>

      {/* ─── What We Do ─── */}
      <PersonaSection altBg aria-label="What we do">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <PersonaHeading page="home" section="whatWeDo" />
            <PersonaText page="home" section="whatWeDo" field="subtitle" className={isPro ? "mb-12 text-[#b0aea5]" : "mb-12 font-sans text-text-secondary"} />
          </ScrollReveal>

          <ScrollReveal
            stagger={100}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {whatWeDoItems.map((item, i) => (
              isPro ? (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group rounded-2xl border border-[#2a2a28] bg-[#1e1e1d]/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#3a3a37] hover:-translate-y-0.5"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#d97757]/15 to-[#6a9bcc]/15 border border-[#3a3a37]">
                    <item.icon className="h-5 w-5 text-[#d97757]" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-[#faf9f5]">
                    {item.proTitle}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#b0aea5]">
                    {item.proDescription}
                  </p>
                </motion.div>
              ) : (
                <TerminalWindow
                  key={item.title}
                  title={item.title.toLowerCase() + ".sh"}
                  variant="command"
                  className="h-full"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-green-primary/20 bg-green-primary/10">
                      <item.icon className="h-5 w-5 text-green-primary" aria-hidden="true" />
                    </div>
                    <h3 className="font-mono text-base font-bold text-text-primary">{item.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{item.description}</p>
                  </div>
                </TerminalWindow>
              )
            ))}
          </ScrollReveal>
        </div>
      </PersonaSection>

      {/* ─── Find Your Community (audience segmentation) ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-label="Find your community">
        <ScrollReveal>
          <h2 className={isPro
            ? "mb-2 text-center text-3xl font-semibold text-[#faf9f5] sm:text-4xl"
            : "mb-2 text-center font-mono text-2xl font-bold text-green-primary sm:text-3xl"}>
            {isPro ? "Find Your Community" : "$ ls ./community/audiences"}
          </h2>
          <p className={isPro
            ? "mx-auto mb-12 max-w-2xl text-center text-[#b0aea5]"
            : "mx-auto mb-12 max-w-2xl text-center font-sans text-text-secondary"}>
            {isPro
              ? "Whoever you are, there's a place for you here."
              : "// two tracks. one community. ship together."}
          </p>
        </ScrollReveal>

        <ScrollReveal stagger={150} className="grid gap-6 md:grid-cols-2">
          {/* Software Engineers */}
          {isPro ? (
            <Link
              href="/events"
              className="group flex flex-col rounded-2xl border border-[#2a2a28] bg-[#1e1e1d]/80 p-8 backdrop-blur-sm transition-all duration-300 hover:border-[#d97757]/40 hover:-translate-y-0.5"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#d97757]/20 to-[#d97757]/5 border border-[#3a3a37]">
                <Cpu className="h-6 w-6 text-[#d97757]" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[#faf9f5]">Software Engineers</h3>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-[#b0aea5]">
                Backend, frontend, mobile, ML engineers shipping production code. Deep-dive workflows, agentic patterns, multi-instance Claude Code, hackathons, and live demos with peers who get it.
              </p>
              <span className="text-sm font-medium text-[#d97757] group-hover:underline">
                See technical events →
              </span>
            </Link>
          ) : (
            <TerminalWindow title="engineers.sh" variant="command" className="h-full">
              <div className="flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded border border-green-primary/20 bg-green-primary/10">
                  <Cpu className="h-5 w-5 text-green-primary" aria-hidden="true" />
                </div>
                <h3 className="font-mono text-base font-bold text-text-primary">Software Engineers</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Backend, frontend, mobile, ML. Deep-dive workflows, agentic patterns, multi-instance Claude Code, hackathons.
                </p>
                <Link href="/events" className="font-mono text-sm text-green-primary hover:text-amber transition-colors">
                  &gt; cd /events
                </Link>
              </div>
            </TerminalWindow>
          )}

          {/* Builders & Vibe Coders */}
          {isPro ? (
            <Link
              href="/join"
              className="group flex flex-col rounded-2xl border border-[#2a2a28] bg-[#1e1e1d]/80 p-8 backdrop-blur-sm transition-all duration-300 hover:border-[#6a9bcc]/40 hover:-translate-y-0.5"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6a9bcc]/20 to-[#6a9bcc]/5 border border-[#3a3a37]">
                <Sparkles className="h-6 w-6 text-[#6a9bcc]" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[#faf9f5]">Builders &amp; Vibe Coders</h3>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-[#b0aea5]">
                Founders, PMs, designers, students, and AI-curious creators. You don&apos;t need to know how a transformer works — you need Claude to ship the thing in your head. Workshops, demos, and a community that meets you where you are.
              </p>
              <span className="text-sm font-medium text-[#6a9bcc] group-hover:underline">
                Join the community →
              </span>
            </Link>
          ) : (
            <TerminalWindow title="vibe-coders.sh" variant="command" className="h-full">
              <div className="flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan/30 bg-cyan/10">
                  <Sparkles className="h-5 w-5 text-cyan" aria-hidden="true" />
                </div>
                <h3 className="font-mono text-base font-bold text-text-primary">Builders &amp; Vibe Coders</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Founders, PMs, designers, students, AI-curious creators. Skip the theory — ship the thing.
                </p>
                <Link href="/join" className="font-mono text-sm text-cyan hover:text-amber transition-colors">
                  &gt; ./join.sh
                </Link>
              </div>
            </TerminalWindow>
          )}
        </ScrollReveal>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-label="Community voices">
        <ScrollReveal>
          <PersonaHeading page="home" section="testimonials" className={isPro ? "mb-2 text-center text-xl font-semibold text-[#faf9f5]" : "mb-2 text-center font-mono text-xl text-green-primary"} />
          <PersonaText page="home" section="testimonials" field="subtitle" className={isPro ? "mx-auto mb-10 max-w-lg text-center text-[#b0aea5]" : "mx-auto mb-10 max-w-lg text-center font-sans text-text-secondary"} />
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <TestimonialsCarousel />
        </ScrollReveal>
      </section>

      {/* ─── Community Showcase ─── */}
      <section className="mx-auto max-w-6xl px-4 py-24" aria-label="Community projects">
        <ScrollReveal>
          <PersonaHeading page="home" section="projects" />
          <PersonaText page="home" section="projects" field="subtitle" className={isPro ? "mb-12 text-[#b0aea5]" : "mb-12 font-sans text-text-secondary"} />
        </ScrollReveal>

        <ScrollReveal stagger={150} className="grid gap-6 lg:grid-cols-2">
          {featuredProjects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <PersonaCTA
              href="/projects"
              devLabel="VIEW_ALL_PROJECTS"
              proLabel="View All Projects"
              variant="secondary"
            />
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Join CTA ─── */}
      <PersonaSection altBg aria-label="Join the community">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <PersonaHeading page="home" section="cta" className={isPro ? "mb-2 text-center text-xl font-semibold text-[#faf9f5]" : "mb-2 text-center font-mono text-xl text-green-primary"} />
            <PersonaText page="home" section="cta" field="subtitle" className={isPro ? "mx-auto mb-12 max-w-2xl text-center text-[#b0aea5]" : "mx-auto mb-12 max-w-2xl text-center font-sans text-text-secondary"} />
          </ScrollReveal>

          <ScrollReveal
            stagger={100}
            className="grid gap-6 md:grid-cols-3"
          >
            {joinPathways.map((pathway, i) => (
              isPro ? (
                <motion.div
                  key={pathway.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`group rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 ${
                    pathway.isPrimary
                      ? "border-[#3a3a37] bg-[#252524]/80 shadow-lg"
                      : "border-[#2a2a28] bg-[#1e1e1d]/80"
                  }`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#d97757]/15 to-[#6a9bcc]/15 border border-[#3a3a37]">
                    <pathway.icon className={`h-6 w-6 ${pathway.isPrimary ? "text-[#d97757]" : "text-[#b0aea5]"}`} aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-[#faf9f5]">{pathway.title}</h3>
                  <p className="mb-6 text-sm leading-relaxed text-[#b0aea5]">{pathway.description}</p>
                  <PersonaCTA
                    href={pathway.href}
                    devLabel={pathway.cta}
                    proLabel={pathway.proCta}
                    external={pathway.external}
                    variant={pathway.isPrimary ? "primary" : "secondary"}
                    className="w-full"
                  />
                </motion.div>
              ) : (
                <div
                  key={pathway.title}
                  className={`border bg-bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 ${
                    pathway.isPrimary
                      ? "border-green-primary/40 shadow-[0_0_20px_rgba(0,255,65,0.08)] hover:shadow-[0_0_30px_rgba(0,255,65,0.15)]"
                      : "border-border-default hover:border-border-hover hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]"
                  }`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded border border-green-primary/20 bg-green-primary/10">
                    <pathway.icon className={`h-6 w-6 ${pathway.isPrimary ? "text-green-primary" : "text-text-secondary"}`} aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 font-mono text-base font-bold text-text-primary">{pathway.title}</h3>
                  <p className="mb-6 text-sm text-text-secondary leading-relaxed">{pathway.description}</p>
                  {pathway.external ? (
                    <a
                      href={pathway.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex w-full items-center justify-center gap-2 border px-5 py-2.5 font-mono text-sm font-medium transition-all duration-200 ${
                        pathway.isPrimary
                          ? "border-green-primary text-green-primary hover:bg-green-primary hover:text-bg-primary"
                          : "border-amber text-amber hover:bg-amber hover:text-bg-primary"
                      }`}
                    >
                      <span className="text-current" aria-hidden="true">&gt;</span>
                      {pathway.cta}
                    </a>
                  ) : (
                    <Link
                      href={pathway.href}
                      className="inline-flex w-full items-center justify-center gap-2 border border-amber px-5 py-2.5 font-mono text-sm font-medium text-amber transition-all duration-200 hover:bg-amber hover:text-bg-primary"
                    >
                      <span className="text-current" aria-hidden="true">&gt;</span>
                      {pathway.cta}
                    </Link>
                  )}
                </div>
              )
            ))}
          </ScrollReveal>
        </div>
      </PersonaSection>

      {/* ─── Supported By ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-label="Supported by">
        <ScrollReveal>
          <p className={isPro ? "mb-10 text-center text-xs font-medium uppercase tracking-widest text-[#7a7870]" : "mb-10 text-center font-mono text-xs uppercase tracking-widest text-text-dim"}>
            Supported by
          </p>
          <div className="flex items-center justify-center">
            <a
              href="https://anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className={isPro
                ? "group relative inline-block rounded-2xl border border-[#2a2a28] p-6 transition-all duration-500 hover:border-[#3a3a37]"
                : "group relative inline-block rounded-2xl p-6 transition-all duration-500"
              }
              style={isPro ? {} : {
                boxShadow: "0 0 20px rgba(0, 255, 65, 0.15), 0 0 60px rgba(0, 255, 65, 0.05)",
              }}
            >
              {!isPro && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl border border-green-primary/30 transition-all duration-500 group-hover:border-green-primary/60"
                  style={{
                    boxShadow: "0 0 15px rgba(0, 255, 65, 0.2), inset 0 0 15px rgba(0, 255, 65, 0.05), 0 0 40px rgba(0, 255, 65, 0.1)",
                  }}
                />
              )}
              <div className={isPro ? "transition-all duration-500 group-hover:opacity-80" : "transition-all duration-500 group-hover:drop-shadow-[0_0_12px_rgba(0,255,65,0.4)]"}>
                <Image
                  src="/images/anthropic-wordmark.webp"
                  alt="Anthropic"
                  width={220}
                  height={60}
                  className="brightness-0 invert transition-all duration-500"
                />
              </div>
            </a>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
