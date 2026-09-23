/**
 * "What was built" — the public Projects tab on an event page: every team
 * that submitted a project in the linked cohort's published run, in the
 * teams' own words. Data, ordering and the public allowlist all come from
 * `loadEventProjects` (`@/lib/impact-lab/event-projects`) — this component
 * only lays out what it is handed.
 *
 * Presentational and static, like KaribuWinnersSection: the snapshot is
 * immutable once published, so this is server-rendered with the page.
 */

import type { EventProject } from "@/lib/impact-lab/event-projects";
import { REVIEW_PROVENANCE_PUBLIC } from "@/lib/impact-lab/reviews";

const FIRST_PARAGRAPHS = 3;

export function KaribuProjectsSection({ projects }: { projects: EventProject[] }) {
  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="projects-heading">
      <h2 id="projects-heading" className="mb-1.5 font-newsreader text-[24px] font-medium text-ink">
        What was built
      </h2>
      <p className="mb-6 font-inter text-[14.5px] leading-[1.6] text-ink-soft">
        Every project submitted before the lock. Teams that opted in share their full write-up and code.
      </p>
      <ul className="space-y-4">
        {projects.map((project) => (
          <li key={project.teamId}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectCard({ project }: { project: EventProject }) {
  return (
    <div className="space-y-3 rounded-2xl border border-sand bg-paper-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-newsreader text-[19px] text-ink">{project.name}</span>
        <span className="flex items-baseline gap-2 whitespace-nowrap font-inter text-[12.5px] text-ink-muted">
          <span>{project.track}</span>
          {project.honour && <span className="font-semibold text-clay">{project.honour}</span>}
        </span>
      </div>

      {project.pitch && (
        <p className="font-inter text-[15px] leading-[1.5] text-ink">{project.pitch}</p>
      )}

      {project.descriptionParagraphs.length > 0 && (
        <DescriptionBlock paragraphs={project.descriptionParagraphs} />
      )}

      {project.review && (
        <div>
          <p className="font-inter text-[14.5px] italic leading-[1.6] text-ink-soft">
            {project.review.text}
          </p>
          <p className="mt-1 font-inter text-[13px] text-ink-muted">{project.review.signedBy}</p>
          <p className="font-inter text-[13px] text-ink-muted">{REVIEW_PROVENANCE_PUBLIC}</p>
        </div>
      )}

      {project.members && (
        <p className="font-inter text-[13px] text-ink-muted">{project.members}</p>
      )}

      {project.links.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {project.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-inter text-[13.5px] font-semibold text-clay hover:underline"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** The first three paragraphs shown up front; the rest behind a no-JS `<details>` disclosure. */
function DescriptionBlock({ paragraphs }: { paragraphs: string[] }) {
  const shown = paragraphs.slice(0, FIRST_PARAGRAPHS);
  const rest = paragraphs.slice(FIRST_PARAGRAPHS);
  return (
    <div className="space-y-2">
      {shown.map((p, i) => (
        <p key={i} className="font-inter text-[14.5px] leading-[1.6] text-ink-soft">
          {p}
        </p>
      ))}
      {rest.length > 0 && (
        <details>
          <summary className="cursor-pointer font-inter text-[13px] font-semibold text-clay hover:underline [&::-webkit-details-marker]:hidden">
            Read more
          </summary>
          <div className="mt-2 space-y-2">
            {rest.map((p, i) => (
              <p key={i} className="font-inter text-[14.5px] leading-[1.6] text-ink-soft">
                {p}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
