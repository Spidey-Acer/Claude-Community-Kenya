export interface Resource {
  id: string;
  title: string;
  url: string;
  category: string;
  description?: string;
}

export const resources: Resource[] = [
  // ─── Official Anthropic ───
  {
    id: "claude-ai",
    title: "Claude.ai",
    url: "https://claude.ai",
    category: "Official Anthropic",
    description: "The main Claude AI interface — chat, analyze, and create.",
  },
  {
    id: "anthropic-docs",
    title: "Anthropic API Documentation",
    url: "https://docs.anthropic.com",
    category: "Official Anthropic",
    description:
      "Complete documentation for Claude models, APIs, and developer tools.",
  },
  {
    id: "claude-code-docs",
    title: "Claude Code Documentation",
    url: "https://docs.anthropic.com/en/docs/claude-code",
    category: "Official Anthropic",
    description:
      "Official guide for Claude Code — Anthropic's agentic coding tool for the terminal.",
  },
  {
    id: "api-reference",
    title: "API Reference",
    url: "https://docs.anthropic.com/en/api/getting-started",
    category: "Official Anthropic",
    description:
      "Full API reference with endpoints, parameters, and example requests.",
  },
  {
    id: "anthropic-models",
    title: "Claude Models Overview",
    url: "https://docs.anthropic.com/en/docs/about-claude/models",
    category: "Official Anthropic",
    description:
      "Compare Claude model capabilities, context windows, and pricing across the model family.",
  },
  {
    id: "anthropic-pricing",
    title: "Claude Pricing",
    url: "https://www.anthropic.com/pricing",
    category: "Official Anthropic",
    description:
      "Pricing details for Claude Pro, Team, and API usage tiers.",
  },
  {
    id: "anthropic-news",
    title: "Anthropic News & Blog",
    url: "https://www.anthropic.com/news",
    category: "Official Anthropic",
    description:
      "Latest announcements, product updates, and research from Anthropic.",
  },
  {
    id: "anthropic-cookbook",
    title: "Anthropic Cookbook",
    url: "https://github.com/anthropics/anthropic-cookbook",
    category: "Official Anthropic",
    description:
      "Code examples and guides from basic API usage to advanced patterns like RAG and agents.",
  },
  {
    id: "anthropic-courses",
    title: "Anthropic Courses",
    url: "https://github.com/anthropics/courses",
    category: "Official Anthropic",
    description:
      "Free educational courses from Anthropic covering prompt engineering, tool use, and more.",
  },

  // ─── SDKs & Developer Tools ───
  {
    id: "anthropic-sdk-python",
    title: "Anthropic Python SDK",
    url: "https://github.com/anthropics/anthropic-sdk-python",
    category: "Developer Tools",
    description: "Official Python SDK for the Anthropic API.",
  },
  {
    id: "anthropic-sdk-ts",
    title: "Anthropic TypeScript SDK",
    url: "https://github.com/anthropics/anthropic-sdk-typescript",
    category: "Developer Tools",
    description: "Official TypeScript/JavaScript SDK for the Anthropic API.",
  },
  {
    id: "mcp-docs",
    title: "Model Context Protocol (MCP)",
    url: "https://modelcontextprotocol.io",
    category: "Developer Tools",
    description:
      "Open protocol for connecting AI models to external data sources and tools.",
  },
  {
    id: "mcp-github",
    title: "MCP GitHub Organization",
    url: "https://github.com/modelcontextprotocol",
    category: "Developer Tools",
    description:
      "Open-source MCP servers, SDKs, and reference implementations.",
  },
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

  // ─── Learning & Tutorials ───
  {
    id: "prompt-engineering",
    title: "Prompt Engineering Guide",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering",
    category: "Learning & Tutorials",
    description:
      "Official guide to writing effective prompts — techniques, best practices, and examples.",
  },
  {
    id: "tool-use",
    title: "Tool Use (Function Calling)",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
    category: "Learning & Tutorials",
    description:
      "Learn how to build agents and give Claude access to external tools and APIs.",
  },
  {
    id: "vision-guide",
    title: "Vision & Image Analysis",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/vision",
    category: "Learning & Tutorials",
    description:
      "Use Claude to analyze images, charts, documents, and visual content.",
  },
  {
    id: "extended-thinking",
    title: "Extended Thinking",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking",
    category: "Learning & Tutorials",
    description:
      "Enable Claude to think step-by-step for complex reasoning tasks.",
  },
  {
    id: "prompt-caching",
    title: "Prompt Caching",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching",
    category: "Learning & Tutorials",
    description:
      "Reduce costs and latency by caching frequently used prompt prefixes.",
  },
  {
    id: "pdf-support",
    title: "PDF Support",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/pdf-support",
    category: "Learning & Tutorials",
    description:
      "Process and analyze PDF documents directly with Claude's API.",
  },

  // ─── Community & Social ───
  {
    id: "cck-discord",
    title: "CCK Discord Server",
    url: "https://discord.gg/MdEhxH88",
    category: "Community & Social",
    description: "Our home base — join the conversation.",
  },
  {
    id: "cck-luma-nairobi",
    title: "CCK Nairobi Events (Luma)",
    url: "https://luma.com/sbsa789m",
    category: "Community & Social",
    description: "Subscribe to Nairobi chapter events.",
  },
  {
    id: "cck-luma-mombasa",
    title: "CCK Mombasa Events (Luma)",
    url: "https://luma.com/vsf5re14",
    category: "Community & Social",
    description: "Subscribe to Mombasa chapter events.",
  },
  {
    id: "claude-community-global",
    title: "Global Claude Community Events",
    url: "https://luma.com/claudecommunity",
    category: "Community & Social",
    description: "Browse all Claude Community events worldwide.",
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

  // ─── Kenya Tech ───
  {
    id: "swahilipot",
    title: "Swahilipot Hub Foundation",
    url: "https://swahilipothub.co.ke",
    category: "Kenya Tech",
    description: "Mombasa's technology and innovation community hub.",
  },

  // ─── AI Safety & Ethics ───
  {
    id: "anthropic-safety",
    title: "Anthropic's Safety Research",
    url: "https://www.anthropic.com/research",
    category: "AI Safety & Ethics",
    description:
      "Learn about Anthropic's approach to AI safety and alignment research.",
  },
];

export function getResourcesByCategory(category: string): Resource[] {
  return resources.filter((r) => r.category === category);
}

export function getResourceCategories(): string[] {
  return [...new Set(resources.map((r) => r.category))];
}
