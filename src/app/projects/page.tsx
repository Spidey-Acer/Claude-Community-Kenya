import type { Metadata } from "next";
import Link from "next/link";
import { getProjects } from "@/lib/data";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { ScrollReveal } from "@/components/terminal";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG } from "@/lib/constants";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";

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

export const revalidate = 3600;

export default async function ProjectsPage() {
  const projects = await getProjects().catch(() => []);

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Projects" }]} />
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <ScrollReveal>
          <section className="mb-12">
            <PersonaHeading
              page="projects"
              section="hero"
              as="h1"
              className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl"
            />
            <PersonaText
              page="projects"
              section="hero"
              field="subtitle"
              className="max-w-2xl font-sans text-lg text-text-secondary"
            />
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
            <PersonaHeading
              page="projects"
              section="submitCta"
              as="h2"
              className="mb-4 font-mono text-2xl font-bold text-green-primary"
            />
            <PersonaText
              page="projects"
              section="submitCta"
              field="subtitle"
              className="mx-auto mb-8 max-w-lg font-sans text-text-secondary"
            />
            <Link
              href="/submit-project"
              className="inline-flex items-center gap-2 border border-green-primary px-5 py-2.5 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              <span aria-hidden="true">&gt;</span>
              SUBMIT_PROJECT
            </Link>
          </section>
        </ScrollReveal>

        {/* Projects grid */}
        <ScrollReveal stagger={100} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </ScrollReveal>
      </div>
    </main>
  );
}
