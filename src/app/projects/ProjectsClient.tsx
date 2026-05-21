"use client";

import React from "react";
import Link from "next/link";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { ScrollReveal } from "@/components/terminal";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
import { useSkin } from "@/contexts/SkinContext";
import type { ProjectView } from "@/lib/data";

interface ProjectsClientProps {
  projects: ProjectView[];
}

export function ProjectsClient({ projects }: ProjectsClientProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <ScrollReveal>
          <section className="mb-12">
            <PersonaHeading
              page="projects"
              section="hero"
              as="h1"
              className={
                isPro
                  ? "mb-4 text-3xl font-bold text-[#faf9f5] sm:text-4xl"
                  : "mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl"
              }
            />
            <PersonaText
              page="projects"
              section="hero"
              field="subtitle"
              className="max-w-2xl font-sans text-lg text-text-secondary"
            />
          </section>
        </ScrollReveal>

        {/* Submit Project Section */}
        <ScrollReveal>
          <section className={isPro ? "card-elevated rounded-2xl p-8 text-center mb-12" : "mb-12 border border-border-default bg-bg-card p-8 text-center"}>
            {!isPro && (
              <div className="flex items-center justify-center gap-1.5 mb-4" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-red" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
              </div>
            )}
            <PersonaHeading
              page="projects"
              section="submitCta"
              as="h2"
              className={
                isPro
                  ? "mb-4 text-2xl font-bold text-[#faf9f5]"
                  : "mb-4 font-mono text-2xl font-bold text-green-primary"
              }
            />
            <PersonaText
              page="projects"
              section="submitCta"
              field="subtitle"
              className="mx-auto mb-8 max-w-lg font-sans text-text-secondary"
            />
            {isPro ? (
              <Link
                href="/submit-project"
                className="btn-primary-shadow inline-flex items-center gap-2 rounded-full bg-[#d97757] px-6 py-3 text-[14px] font-semibold text-[#faf9f5] hover:bg-[#c06848]"
              >
                Submit a project <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Link
                href="/submit-project"
                className="inline-flex items-center gap-2 border border-green-primary px-5 py-2.5 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <span aria-hidden="true">&gt;</span>
                SUBMIT_PROJECT
              </Link>
            )}
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
