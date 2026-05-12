"use client";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useSkin } from "@/contexts/SkinContext";
import type { ProjectView } from "@/lib/data";
import { ExternalLink, Github } from "lucide-react";

interface ProjectCardProps {
  project: ProjectView;
}

const statusLabels: Record<string, string> = {
  "in-production": "In Production",
  "in-development": "In Development",
  live: "Live",
};

const statusVariants: Record<string, "upcoming" | "registration-open" | "default"> = {
  "in-production": "upcoming",
  "in-development": "registration-open",
  live: "upcoming",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";
  const slug = project.name.toLowerCase().replace(/\s+/g, "-");

  if (isPro) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-[#2a2a28] transition-all duration-300",
          "hover:-translate-y-1 hover:border-[#3a3a37]",
          "hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]",
          // Glassmorphism
          "bg-[#1e1e1d]/60 backdrop-blur-xl",
        )}
      >
        {/* Subtle gradient shimmer on hover */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, rgba(217,119,87,0.04) 0%, transparent 50%, rgba(106,155,204,0.04) 100%)",
          }}
        />

        {/* Top accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d97757]/30 to-transparent" />

        <div className="relative p-6">
          {/* Status badge */}
          {project.status && (
            <div className="mb-3">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                project.status === "live"
                  ? "bg-[#788c5d]/15 text-[#788c5d]"
                  : "bg-[#6a9bcc]/15 text-[#6a9bcc]"
              )}>
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  project.status === "live" ? "bg-[#788c5d] animate-pulse" : "bg-[#6a9bcc]"
                )} />
                {statusLabels[project.status] ?? project.status}
              </span>
            </div>
          )}

          {/* Project name */}
          <h3 className="mb-1 text-lg font-semibold text-[#faf9f5] group-hover:text-[#d97757] transition-colors">
            {project.name}
          </h3>

          {/* Builder */}
          <p className="mb-3 text-xs text-[#7a7870]">
            by {project.builder}
          </p>

          {/* Description */}
          <p className="mb-5 text-sm leading-relaxed text-[#b0aea5] line-clamp-3">
            {project.description}
          </p>

          {/* Tech stack tags */}
          <div className="mb-5 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-[#2a2a28] bg-[#252524]/80 px-2.5 py-0.5 text-xs text-[#b0aea5]"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-[#d97757] hover:text-[#e8956e] transition-colors"
                aria-label={`View demo of ${project.name}`}
              >
                <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/link:scale-110" aria-hidden="true" />
                Demo
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-[#6a9bcc] hover:text-[#89b5d8] transition-colors"
                aria-label={`View source code of ${project.name}`}
              >
                <Github className="h-4 w-4 transition-transform duration-200 group-hover/link:scale-110" aria-hidden="true" />
                Repo
              </a>
            )}
          </div>

          {/* Built with Claude badge */}
          <div className="mt-5 border-t border-[#2a2a28] pt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7a7870]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d97757]" />
              Built with Claude
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Dev mode — original terminal style
  return (
    <div
      className={cn(
        "border border-border-default bg-bg-card transition-all duration-300",
        "hover:-translate-y-0.5",
        "hover:border-border-hover hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]"
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
        </div>
        <span className="ml-2 font-mono text-xs text-text-dim">
          project/{slug}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        {project.status && (
          <div className="mb-3">
            <Badge variant={statusVariants[project.status] ?? "default"}>
              {statusLabels[project.status] ?? project.status}
            </Badge>
          </div>
        )}

        <h3 className="mb-1 font-mono text-lg font-semibold text-green-primary">
          {project.name}
        </h3>

        <p className="mb-3 font-mono text-xs text-text-dim">
          by {project.builder}
        </p>

        <p className="mb-4 text-sm text-text-secondary line-clamp-3">
          {project.description}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="border border-border-default bg-bg-elevated px-2 py-0.5 font-mono text-xs text-text-dim"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5 font-mono text-sm text-green-primary hover:text-amber transition-colors duration-200"
              aria-label={`View demo of ${project.name}`}
            >
              <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/link:scale-110" aria-hidden="true" />
              Demo
            </a>
          )}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5 font-mono text-sm text-green-primary hover:text-amber transition-colors duration-200"
              aria-label={`View source code of ${project.name}`}
            >
              <Github className="h-4 w-4 transition-transform duration-200 group-hover/link:scale-110" aria-hidden="true" />
              Repo
            </a>
          )}
        </div>

        <div className="mt-4 border-t border-border-default pt-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-green-primary" />
            Built with Claude Code
          </span>
        </div>
      </div>
    </div>
  );
}
