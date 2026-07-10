"use client";

/**
 * KaribuProjects — warm-light "built by the community" section.
 *
 * Redesigns two sections the original home had (Project of the Week + the
 * featured-projects showcase) into one coherent block, wired to the same DB
 * data (getProjectOfTheWeek + getFeaturedProjects). Renders nothing when there
 * is no project data.
 */

import Link from "next/link";
import { Sparkles, ExternalLink, Github } from "lucide-react";
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
  const potw = projectOfTheWeek;
  const grid = featuredProjects.filter((p) => p.id !== potw?.id).slice(0, 4);

  if (!potw && grid.length === 0) return null;

  return (
    <section className={`${WRAP} py-14`} aria-label="Community projects">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={`${KICKER} mb-3.5`}>Built by the community</div>
            <h2 className="font-newsreader text-[40px] font-normal tracking-[-0.015em] text-ink">
              Made with Claude, in Kenya.
            </h2>
          </div>
          <Link href="/projects" className="font-inter text-[14.5px] font-semibold text-clay hover:underline">
            All projects →
          </Link>
        </div>
      </Reveal>

      {/* Project of the week — featured card */}
      {potw && (
        <Reveal>
          <div className="mb-4 rounded-2xl border border-clay/30 bg-paper-card p-7 sm:p-9">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-clay" aria-hidden="true" />
              <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
                Project of the week
              </span>
            </div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="mb-1.5 font-newsreader text-[28px] text-ink">{potw.name}</h3>
                <p className="mb-2 font-inter text-[13px] text-ink-muted">by {potw.builder}</p>
                <p className="mb-4 max-w-2xl font-inter text-[15px] leading-[1.6] text-ink-soft">
                  {potw.description}
                </p>
                <StackChips stack={potw.stack} />
              </div>
              <ProjectLinks project={potw} />
            </div>
          </div>
        </Reveal>
      )}

      {/* Featured grid */}
      {grid.length > 0 && (
        <Reveal className="grid gap-4 sm:grid-cols-2">
          {grid.map((p) => (
            <article key={p.id} className="flex flex-col rounded-2xl border border-sand bg-paper-card p-6">
              <h3 className="mb-1 font-newsreader text-[22px] text-ink">{p.name}</h3>
              <p className="mb-2 font-inter text-[12.5px] text-ink-muted">by {p.builder}</p>
              <p className="mb-4 flex-1 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                {p.description}
              </p>
              <StackChips stack={p.stack} />
              <ProjectLinks project={p} />
            </article>
          ))}
        </Reveal>
      )}
    </section>
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
