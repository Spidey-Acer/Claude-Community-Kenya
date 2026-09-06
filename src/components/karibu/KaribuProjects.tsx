"use client";

/**
 * KaribuProjects — warm-light "Made in Kenya" section (ports Main.dc.html's
 * "MADE IN KENYA" block: up to two member-project cards plus an invite card
 * that is ALWAYS present, even with zero projects — the empty state is "Be
 * the first, share yours", never a section that vanishes for lack of data.
 */

import Link from "next/link";
import { ExternalLink, Github, Plus } from "lucide-react";
import type { ProjectView } from "@/lib/data";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

export function KaribuProjects({
  projectOfTheWeek,
  featuredProjects,
}: {
  projectOfTheWeek: ProjectView | null;
  featuredProjects: ProjectView[];
}) {
  // Two real project slots — project of the week first, then the next
  // featured project. "Not CCK's own" per spec §3.8, which named this
  // section's exact prior defect: both showcased projects were built BY
  // CCK itself (the Discord bot, this website), not by members. Drop those
  // here rather than fix it upstream in getProjects()/getProjectOfTheWeek(),
  // which other surfaces (e.g. /projects) may legitimately want to include.
  const isHouseProject = (p: ProjectView) => p.builder.trim().toLowerCase() === "claude community kenya";
  const candidates = [projectOfTheWeek, ...featuredProjects].filter(
    (p): p is ProjectView => p !== null && !isHouseProject(p),
  );
  const shown = candidates.filter((p, i) => candidates.findIndex((q) => q.id === p.id) === i).slice(0, 2);
  const hasAny = shown.length > 0;

  return (
    <section id="made-in-kenya" className={`${WRAP} py-14`} aria-label="Made with Claude, in Kenya">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={`${KICKER} mb-3.5`}>Built by the community</div>
            <h2 className="font-newsreader text-[40px] font-normal tracking-[-0.015em] text-ink">
              Made with Claude, in Kenya.
            </h2>
          </div>
          {hasAny && (
            <Link href="/projects" className="font-inter text-[14.5px] font-semibold text-clay hover:underline">
              All projects →
            </Link>
          )}
        </div>
      </Reveal>

      <Reveal className={hasAny ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex justify-center"}>
        {shown.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        <InviteCard emptyState={!hasAny} className={hasAny ? undefined : "max-w-md"} />
      </Reveal>
    </section>
  );
}

function ProjectCard({ project }: { project: ProjectView }) {
  // ProjectView has no screenshot field yet — no image slot to fake here.
  // A tinted initial tile stands in until the schema carries a real one,
  // rather than a placeholder claiming a screenshot exists.
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-sand bg-paper-card p-[26px]">
      <div
        className="flex items-center justify-center rounded-xl border border-sand bg-[linear-gradient(135deg,color-mix(in_oklab,var(--clay)_10%,var(--paper-alt)),var(--paper-alt))]"
        style={{ aspectRatio: "16 / 10" }}
        aria-hidden="true"
      >
        <span className="font-newsreader text-[40px] text-clay/70">{project.name.charAt(0)}</span>
      </div>
      <h3 className="mt-1.5 font-newsreader text-[24px] text-ink">{project.name}</h3>
      <div className="font-inter text-[13.5px] text-ink-muted">by {project.builder}</div>
      <p className="font-inter text-[15px] leading-[1.55] text-ink-soft">{project.description}</p>
      <StackChips stack={project.stack} />
      <ProjectLinks project={project} />
    </article>
  );
}

function InviteCard({ emptyState, className }: { emptyState: boolean; className?: string }) {
  return (
    <div
      className={`flex w-full flex-col items-start gap-3.5 rounded-2xl border-[1.5px] border-dashed border-clay bg-clay/[0.07] p-[26px] ${className ?? ""}`}
    >
      <Plus className="h-9 w-9 text-clay" strokeWidth={1.6} aria-hidden="true" />
      <h3 className="font-newsreader text-[26px] leading-[1.15] text-ink">Built something with Claude?</h3>
      <p className="font-inter text-[15px] leading-[1.55] text-ink-soft">
        {emptyState
          ? "Be the first to add yours — side project, client work, a bot for your chama. Doesn't have to be finished."
          : "Side project, client work, a bot for your chama. Doesn't have to be finished. This shelf is for your work, not ours."}
      </p>
      <Link href="/submit-project" className="font-inter text-[15px] font-semibold text-clay hover:underline">
        Share yours →
      </Link>
    </div>
  );
}

function StackChips({ stack }: { stack: string[] }) {
  if (!stack?.length) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {stack.slice(0, 4).map((s) => (
        <span key={s} className="rounded-full bg-paper-alt px-2.5 py-1 font-inter text-[11.5px] font-medium text-ink-muted">
          {s}
        </span>
      ))}
    </div>
  );
}

function ProjectLinks({ project }: { project: ProjectView }) {
  if (!project.demoUrl && !project.repoUrl) return null;
  return (
    <div className="flex shrink-0 items-center gap-3">
      {project.demoUrl && (
        <a
          href={project.demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-inter text-sm font-semibold text-clay hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Demo
        </a>
      )}
      {project.repoUrl && (
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-inter text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <Github className="h-4 w-4" /> Code
        </a>
      )}
    </div>
  );
}
