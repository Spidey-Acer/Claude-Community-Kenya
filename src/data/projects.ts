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
    id: "cck-website",
    name: "Claude Community Kenya Website",
    builder: "Claude Community Kenya",
    description:
      "This website. Built entirely with Claude Code as a showcase of AI-assisted development. Terminal-noir design, interactive animations, and community content.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    status: "live",
    demoUrl: "https://www.claudekenya.org",
    repoUrl: "https://github.com/Spidey-Acer/Claude-Community-Kenya",
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
    repoUrl: "https://github.com/Spidey-Acer/CCK-Discord-Bot",
    featured: true,
  },
  {
    id: "claude-kenya-theme",
    name: "Claude Kenya — Savanna Dusk & Dawn",
    builder: "Claude Community Kenya",
    description:
      "A stunning VS Code color theme inspired by Anthropic's brand palette fused with East African sunsets. Two variants: Savanna Dusk (dark) and Savanna Dawn (light).",
    stack: ["VS Code", "JSON", "TextMate"],
    status: "live",
    demoUrl: "https://marketplace.visualstudio.com/items?itemName=claude-community-kenya.claude-kenya-theme",
    repoUrl: "https://github.com/Spidey-Acer/claude-kenya-theme",
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
