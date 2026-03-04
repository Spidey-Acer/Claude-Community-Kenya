import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/projects";
import { ExternalLink, Github } from "lucide-react";

interface ProjectCardProps {
  project: Project;
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
  const isPlaceholder = project.id === "your-project";

  return (
    <div
      className={cn(
        "border bg-bg-card transition-all duration-300",
        "hover:-translate-y-0.5",
        isPlaceholder
          ? "border-dashed border-amber/50 hover:border-amber hover:shadow-[0_4px_20px_rgba(255,176,0,0.08)]"
          : "border-border-default hover:border-border-hover hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]"
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
          project/{project.id}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Status badge */}
        {project.status && (
          <div className="mb-3">
            <Badge variant={statusVariants[project.status] ?? "default"}>
              {statusLabels[project.status] ?? project.status}
            </Badge>
          </div>
        )}

        {/* Project name */}
        <h3
          className={cn(
            "mb-1 font-mono text-lg font-semibold",
            isPlaceholder ? "text-amber" : "text-green-primary"
          )}
        >
          {project.name}
        </h3>

        {/* Builder */}
        <p className="mb-3 font-mono text-xs text-text-dim">
          by {project.builder}
        </p>

        {/* Description */}
        <p className="mb-4 text-sm text-text-secondary line-clamp-3">
          {project.description}
        </p>

        {/* Tech stack tags */}
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

        {/* Links or CTA */}
        {isPlaceholder ? (
          <a
            href="https://discord.gg/AVAyYCbJ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-sm font-medium text-amber hover:text-green-primary transition-colors duration-200"
          >
            <span className="text-text-dim">&gt;</span>
            Submit Your Project on Discord &rarr;
          </a>
        ) : (
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
        )}

        {/* Built with Claude Code badge */}
        {!isPlaceholder && (
          <div className="mt-4 border-t border-border-default pt-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-green-primary" />
              Built with Claude Code
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
