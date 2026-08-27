"use client";

/**
 * KaribuProjectsPage — warm-light /projects listing for the Karibu identity.
 *
 * Preserves the original page's sections (header, submit-a-project CTA, full
 * project grid), restyled. Data from getProjects().
 */

import Link from "next/link";
import { ExternalLink, Github, Plus } from "lucide-react";
import type { ProjectView } from "@/lib/data";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

function statusLabel(status: string): string {
  return status
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function KaribuProjectsPage({ projects }: { projects: ProjectView[] }) {
  return (
    <>
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Projects header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Projects</div>
          <h1 className="mb-4 font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[52px]">
            Built with Claude, in Kenya.
          </h1>
          <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Real projects shipped by community members — tools, bots, apps and
            experiments. See what&apos;s possible with AI-assisted development.
          </p>
        </Reveal>
      </section>

      {/* Submit CTA */}
      <section className={`${WRAP} py-4`}>
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-clay/30 bg-paper-card p-7 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="font-newsreader text-[24px] text-ink">Shipped something with Claude?</h2>
              <p className="font-inter text-[14.5px] text-ink-soft">Add it to the showcase — we love seeing what you build.</p>
            </div>
            <Link
              href="/submit-project"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              <Plus className="h-4 w-4" /> Submit a project
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Grid */}
      <section className={`${WRAP} pb-16 pt-4`} aria-label="Projects">
        {projects.length > 0 ? (
          <Reveal className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <article key={p.id} className="flex h-full flex-col rounded-2xl border border-sand bg-paper-card p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11.5px] text-ink-muted">project</span>
                  <span className="rounded-full bg-clay/10 px-2.5 py-1 font-inter text-[11.5px] font-semibold text-clay">
                    {statusLabel(p.status)}
                  </span>
                </div>
                <h3 className="mb-1 font-newsreader text-[22px] text-ink">{p.name}</h3>
                <p className="mb-3 font-inter text-[12.5px] text-ink-muted">by {p.builder}</p>
                <p className="mb-4 flex-1 font-inter text-[14px] leading-[1.55] text-ink-soft">{p.description}</p>
                {p.stack.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {p.stack.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full bg-paper-alt px-2.5 py-1 font-inter text-[11.5px] font-medium text-ink-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {(p.demoUrl || p.repoUrl) && (
                  <div className="flex items-center gap-3 border-t border-sand pt-3">
                    {p.demoUrl && (
                      <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-inter text-sm font-semibold text-clay hover:underline">
                        <ExternalLink className="h-4 w-4" /> Demo
                      </a>
                    )}
                    {p.repoUrl && (
                      <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-inter text-sm font-semibold text-ink-soft hover:text-ink">
                        <Github className="h-4 w-4" /> Code
                      </a>
                    )}
                  </div>
                )}
              </article>
            ))}
          </Reveal>
        ) : (
          <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
            <p className="mb-4 font-newsreader text-[24px] text-ink">No projects yet.</p>
            <Link href="/submit-project" className="inline-flex rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark">
              Submit the first one
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
