export interface Project {
  id: string;
  name: string;
  builder: string;
  description: string;
  stack: string[];
  status: "in-production" | "in-development" | "live" | null;
  demoUrl?: string;
  repoUrl?: string;
  featured: boolean;
}

export const projects: Project[] = [
  {
    id: "mulinga",
    name: "Mulinga Farm Management System",
    builder: "Peter Kibet",
    description:
      "A comprehensive farm management platform tracking 26,000+ coffee plants and poultry operations across multiple farms in Kenya. Manages growth cycles, harvest yields, worker assignments, and financial records — all built with Claude Code.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Claude Code"],
    status: "in-production",
    demoUrl: "#",
    featured: true,
  },
  {
    id: "cck-discord-bot",
    name: "Community Discord Bot",
    builder: "Claude Community Kenya",
    description:
      "An AI-powered Discord bot for the community server. Handles FAQs, event reminders, and resource lookups.",
    stack: ["Node.js", "Discord.js", "Claude API"],
    status: "in-development",
    featured: false,
  },
  {
    id: "cck-website",
    name: "Claude Community Kenya Website",
    builder: "Peter Kibet",
    description:
      "This website. Built entirely with Claude Code as a showcase of AI-assisted development. Terminal-noir design, interactive animations, and community content.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    status: "live",
    demoUrl: "https://claudecommunitykenya.com",
    featured: true,
  },
  {
    id: "your-project",
    name: "Your Project Here",
    builder: "You?",
    description:
      "Built something with Claude? We want to feature it! Share your project with the community and inspire other developers. Every project, big or small, matters.",
    stack: ["Claude Code", "Your Stack"],
    status: null,
    featured: false,
  },
];

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured);
}
