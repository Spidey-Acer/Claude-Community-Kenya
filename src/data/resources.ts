export interface Resource {
  id: string;
  title: string;
  url: string;
  category: string;
  description?: string;
}

export const resources: Resource[] = [
  // Official Anthropic Resources
  {
    id: "claude-ai",
    title: "Claude.ai",
    url: "https://claude.ai",
    category: "Official Anthropic",
    description: "The main Claude AI interface — chat, analyze, and create.",
  },
  {
    id: "claude-docs",
    title: "Anthropic API Docs",
    url: "https://docs.anthropic.com",
    category: "Official Anthropic",
    description: "Official documentation for Claude models and APIs.",
  },
  {
    id: "claude-code-docs",
    title: "Claude Code Documentation",
    url: "https://docs.anthropic.com/en/docs/claude-code",
    category: "Official Anthropic",
    description: "Official guide for Claude Code CLI tool.",
  },
  {
    id: "anthropic-cookbook",
    title: "Anthropic Cookbook",
    url: "https://github.com/anthropics/anthropic-cookbook",
    category: "Official Anthropic",
    description: "Code examples and guides from basic to advanced patterns.",
  },
  {
    id: "anthropic-sdk",
    title: "Anthropic Python SDK",
    url: "https://github.com/anthropics/anthropic-sdk-python",
    category: "Official Anthropic",
    description: "Official Python SDK for the Anthropic API.",
  },
  {
    id: "anthropic-sdk-ts",
    title: "Anthropic TypeScript SDK",
    url: "https://github.com/anthropics/anthropic-sdk-typescript",
    category: "Official Anthropic",
    description: "Official TypeScript/JavaScript SDK for the Anthropic API.",
  },
  // Learning & Tutorials
  {
    id: "prompt-engineering",
    title: "Prompt Engineering Guide",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering",
    category: "Learning & Tutorials",
    description: "Learn how to write effective prompts for Claude.",
  },
  {
    id: "tool-use",
    title: "Tool Use (Function Calling)",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
    category: "Learning & Tutorials",
    description: "Build agents and tools that Claude can use.",
  },
  {
    id: "vision-guide",
    title: "Vision & Image Analysis",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/vision",
    category: "Learning & Tutorials",
    description: "Use Claude to analyze images and visual content.",
  },
  // Community & Social
  {
    id: "cck-discord",
    title: "CCK Discord Server",
    url: "https://discord.gg/claude-community-ke",
    category: "Community & Social",
    description: "Our home base — join the conversation.",
  },
  {
    id: "cck-twitter",
    title: "CCK on Twitter/X",
    url: "https://twitter.com/ClaudeCommunityKE",
    category: "Community & Social",
    description: "Follow us for updates, tips, and news.",
  },
  {
    id: "cck-linkedin",
    title: "CCK on LinkedIn",
    url: "https://linkedin.com/company/claude-community-kenya",
    category: "Community & Social",
    description: "Professional updates and networking.",
  },
  {
    id: "cck-luma",
    title: "CCK Events on Luma",
    url: "https://lu.ma/claude-community-kenya",
    category: "Community & Social",
    description: "Subscribe to our event calendar.",
  },
  // Developer Tools
  {
    id: "cursor-ai",
    title: "Cursor IDE",
    url: "https://cursor.sh",
    category: "Developer Tools",
    description: "AI-powered code editor with Claude integration.",
  },
  {
    id: "vercel",
    title: "Vercel",
    url: "https://vercel.com",
    category: "Developer Tools",
    description: "Deploy Next.js and frontend projects instantly.",
  },
  // Kenya Tech Resources
  {
    id: "ihub",
    title: "iHub Nairobi",
    url: "https://ihub.co.ke",
    category: "Kenya Tech",
    description: "Nairobi's premier innovation hub and tech community.",
  },
  {
    id: "swahilipot",
    title: "Swahilipot Hub Foundation",
    url: "https://swahilipothub.co.ke",
    category: "Kenya Tech",
    description: "Mombasa's technology and innovation community hub.",
  },
  // AI Safety & Ethics
  {
    id: "anthropic-safety",
    title: "Anthropic's Safety Research",
    url: "https://www.anthropic.com/research",
    category: "AI Safety & Ethics",
    description: "Learn about Anthropic's approach to AI safety.",
  },
  {
    id: "responsible-scaling",
    title: "Responsible Scaling Policy",
    url: "https://www.anthropic.com/index/anthropics-responsible-scaling-policy",
    category: "AI Safety & Ethics",
    description: "How Anthropic scales AI development responsibly.",
  },
];

export function getResourcesByCategory(category: string): Resource[] {
  return resources.filter((r) => r.category === category);
}

export function getResourceCategories(): string[] {
  return [...new Set(resources.map((r) => r.category))];
}
