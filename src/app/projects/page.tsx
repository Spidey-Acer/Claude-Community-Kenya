import type { Metadata } from "next";
import { getProjects } from "@/lib/data";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG } from "@/lib/constants";
import { ProjectsClient } from "./ProjectsClient";

export const metadata: Metadata = {
  title: `Projects | ${SITE_CONFIG.name}`,
  description:
    "Explore real projects built by Kenyan developers using Claude Code. See what's possible with AI-assisted development in Africa.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/projects`,
  },
  openGraph: {
    title: `Projects | ${SITE_CONFIG.name}`,
    description:
      "Explore real projects built by Kenyan developers using Claude Code. See what's possible with AI-assisted development in Africa.",
    url: `${SITE_CONFIG.url}/projects`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export const revalidate = 3600;

export default async function ProjectsPage() {
  const projects = await getProjects().catch(() => []);

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Projects" }]} />
      <ProjectsClient projects={projects} />
    </>
  );
}
