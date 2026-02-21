import type { Metadata } from "next";
import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { ScrollReveal, CommandPrefix } from "@/components/terminal";
import { SITE_CONFIG, SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Projects | ${SITE_CONFIG.name}`,
  description:
    "Explore real projects built by Kenyan developers using Claude Code. See what's possible with AI-assisted development in East Africa.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/projects`,
  },
  openGraph: {
    title: `Projects | ${SITE_CONFIG.name}`,
    description:
      "Explore real projects built by Kenyan developers using Claude Code. See what's possible with AI-assisted development in East Africa.",
    url: `${SITE_CONFIG.url}/projects`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <ScrollReveal>
          <section className="mb-12">
            <h1 className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl">
              <CommandPrefix />
              ls projects/ -la
            </h1>
            <p className="max-w-2xl font-sans text-lg text-text-secondary">
              Built by the community, powered by Claude.
            </p>
          </section>
        </ScrollReveal>

        {/* Submit Project Section — pinned at top */}
        <ScrollReveal>
          <section className="mb-12 border border-border-default bg-bg-card p-8 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
            </div>
            <h2 className="mb-4 font-mono text-2xl font-bold text-green-primary">
              Built something with Claude?
            </h2>
            <p className="mx-auto mb-8 max-w-lg font-sans text-text-secondary">
              Share what you&apos;ve built. Every project, big or small, inspires
              someone.
            </p>
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-green-primary px-5 py-2.5 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              <span aria-hidden="true">&gt;</span>
              SUBMIT_PROJECT
            </a>
          </section>
        </ScrollReveal>

        {/* Projects grid */}
        <ScrollReveal stagger={100} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </ScrollReveal>
      </div>
    </main>
  );
}
