"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ExternalLink } from "lucide-react";
import type { ProjectView } from "@/lib/data";

interface ProjectOfTheWeekProps {
  project: ProjectView | null;
}

/** Fraunces display-serif inline style */
const FRAUNCES: React.CSSProperties = {
  fontFamily: "var(--font-display), ui-serif, Georgia, serif",
  letterSpacing: "-0.025em",
};

/**
 * Hero-slot panel surfacing the current Project of the Week.
 * Renders nothing when no project is designated.
 */
export function ProjectOfTheWeek({ project }: ProjectOfTheWeekProps) {
  if (!project) return null;

  const projectLink = project.demoUrl ?? project.repoUrl ?? "/projects";

  return (
    <section
      className="mx-auto max-w-6xl px-4 pb-8 md:pb-10"
      aria-label="Project of the Week"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="card-featured rounded-2xl p-6 sm:p-8">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-2">
            <Sparkles
              className="h-3.5 w-3.5 text-[#d97757]"
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d97757]">
              Project of the Week
            </span>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: project info */}
            <div className="flex-1 min-w-0">
              {/* Project name */}
              <h2
                className="mb-1 text-2xl font-semibold text-[#faf9f5] sm:text-3xl"
                style={FRAUNCES}
              >
                {project.name}
              </h2>

              {/* Builder */}
              <p className="mb-3 text-sm text-[#9a9890]">
                by {project.builder}
              </p>

              {/* Description */}
              <p className="mb-4 max-w-xl text-sm leading-relaxed text-[#b0aea5]">
                {project.description.length > 160
                  ? project.description.slice(0, 157) + "…"
                  : project.description}
              </p>

              {/* Stack chips */}
              {project.stack.length > 0 && (
                <div
                  className="flex flex-wrap gap-2"
                  role="list"
                  aria-label="Tech stack"
                >
                  {project.stack.slice(0, 6).map((tech) => (
                    <span
                      key={tech}
                      role="listitem"
                      className="inline-flex items-center rounded-full border border-[#2a2a28] bg-[#1e1e1d]/80 px-3 py-1 text-[12px] font-medium text-[#9a9890]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: CTA */}
            <div className="flex shrink-0 items-start sm:items-center">
              {project.demoUrl || project.repoUrl ? (
                <a
                  href={projectLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-[#faf9f5] transition-colors hover:bg-[#c06848]"
                  aria-label={`See ${project.name} project`}
                >
                  See project
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-[#faf9f5] transition-colors hover:bg-[#c06848]"
                >
                  See project →
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
