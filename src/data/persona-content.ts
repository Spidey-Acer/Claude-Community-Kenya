export type Persona = "dev" | "pro";

type PersonaText = { dev: string; pro: string };

export interface SectionContent {
  heading?: string;
  subtitle?: string;
  description?: string;
  items?: string[];
}

interface SectionDef {
  heading?: PersonaText;
  subtitle?: PersonaText;
  description?: PersonaText;
  items?: { dev: string[]; pro: string[] };
}

type PageDef = Record<string, SectionDef>;

const CONTENT: Record<string, PageDef> = {
  // ─── HOME ───
  home: {
    heroSubtitle: {
      subtitle: {
        dev: "Anthropic-supported Claude developer community — building, learning, and shipping with Claude.",
        pro: "Anthropic-supported Claude community — learning, creating, and working with Claude AI.",
      },
    },
    events: {
      heading: {
        dev: "ls events/ --upcoming",
        pro: "Upcoming Events",
      },
      subtitle: {
        dev: "Upcoming meetups, workshops, and career talks across Kenya.",
        pro: "Upcoming meetups, workshops, and talks across Kenya.",
      },
    },
    whatWeDo: {
      heading: {
        dev: "man claude-community-kenya",
        pro: "What We Do",
      },
      subtitle: {
        dev: "How we bring Kenya's developer community together around Claude and AI.",
        pro: "How we bring Kenya's community together around Claude and AI.",
      },
    },
    testimonials: {
      heading: {
        dev: "cat community/voices.log",
        pro: "Community Voices",
      },
      subtitle: {
        dev: "What developers are saying about Claude Community Kenya.",
        pro: "What people are saying about Claude Community Kenya.",
      },
    },
    projects: {
      heading: {
        dev: "ls projects/ --featured",
        pro: "Featured Projects",
      },
      subtitle: {
        dev: "Real projects built by community members with Claude Code.",
        pro: "Real projects created by community members with Claude.",
      },
    },
    cta: {
      heading: {
        dev: "sudo join --community",
        pro: "Join the Community",
      },
      subtitle: {
        dev: "Whether you're an experienced AI developer or just getting started, there's a place for you in Claude Community Kenya.",
        pro: "Whether you're experienced with AI or just curious about what Claude can do, there's a place for you here.",
      },
    },
  },

  // ─── ABOUT ───
  about: {
    hero: {
      heading: { dev: "cat README.md", pro: "Our Story" },
      subtitle: {
        dev: "Kenya's independent, volunteer-run Claude developer community.",
        pro: "Kenya's independent, volunteer-run Claude community.",
      },
    },
    origin: {
      heading: { dev: "cat origin-story.md", pro: "How It Started" },
    },
    mission: {
      heading: { dev: "cat mission.json", pro: "What We Stand For" },
    },
    missionContent: {
      description: {
        dev: "Give developers across Africa the tools, knowledge, and community to build real things with Claude — from farm management systems to fintech, from healthtech to education.",
        pro: "Give people across Africa the tools, knowledge, and community to do real work with Claude — from software to research, from business to education.",
      },
    },
    visionContent: {
      description: {
        dev: "Make Kenya the launchpad for AI-first development across Africa. Not by talking about it — by shipping.",
        pro: "Make Kenya the launchpad for AI-powered work across Africa. Not by talking about it — by doing it.",
      },
    },
    team: {
      heading: { dev: "ls team/ --all", pro: "The Team" },
    },
    timeline: {
      heading: { dev: "git log --oneline", pro: "Milestones" },
      subtitle: {
        dev: "Our journey so far — every milestone tracked like a git commit.",
        pro: "Our journey so far — every milestone on the record.",
      },
    },
  },

  // ─── EVENTS ───
  events: {
    hero: {
      heading: { dev: "ls events/ -la --sort=date", pro: "Browse Events" },
      subtitle: {
        dev: "Meetups, workshops, hackathons, and career talks across Kenya. Find an event near you and join the community.",
        pro: "Meetups, workshops, and talks across Kenya. Find an event near you and join the community.",
      },
    },
  },

  // ─── BLOG ───
  blog: {
    hero: {
      heading: { dev: "tail -f community.log", pro: "Community Blog" },
      subtitle: {
        dev: "Updates, recaps, and thoughts from the community.",
        pro: "Updates, recaps, and thoughts from the community.",
      },
    },
  },

  // ─── PROJECTS ───
  projects: {
    hero: {
      heading: { dev: "ls projects/ -la", pro: "Community Projects" },
      subtitle: {
        dev: "Built by the community, powered by Claude.",
        pro: "Created by the community, powered by Claude.",
      },
    },
    submitCta: {
      heading: { dev: "Built something with Claude?", pro: "Created something with Claude?" },
      subtitle: {
        dev: "Share what you've built. Every project, big or small, inspires someone.",
        pro: "Share what you've created. Every project, big or small, inspires someone.",
      },
    },
  },

  // ─── COMMUNITY HUB ───
  community: {
    hero: {
      heading: { dev: "ls community/ --shared", pro: "Tools & Prompts" },
      subtitle: {
        dev: "MCPs, prompts, workflows, and tools built by the community. Browse what others have shared or submit your own.",
        pro: "Prompts, workflows, and tools shared by the community. Browse what others have created or submit your own.",
      },
    },
  },

  // ─── FAQ ───
  faq: {
    hero: {
      heading: { dev: "claude --help", pro: "Help & FAQ" },
    },
    still: {
      heading: { dev: 'echo "Still have questions?"', pro: "Still Have Questions?" },
    },
    categoryGeneral: {
      heading: { dev: "cat faq/general.txt", pro: "General" },
    },
    categoryEvents: {
      heading: { dev: "cat faq/events.txt", pro: "Events" },
    },
    categoryTechnical: {
      heading: { dev: "cat faq/technical.txt", pro: "Technical" },
    },
  },

  // ─── CODE OF CONDUCT ───
  codeOfConduct: {
    hero: {
      heading: { dev: "cat CODE_OF_CONDUCT.md", pro: "Code of Conduct" },
    },
  },

  // ─── 404 ───
  notFound: {
    hero: {
      heading: { dev: "cd /requested-page", pro: "Page Not Found" },
      subtitle: {
        dev: "bash: /requested-page: No such file or directory",
        pro: "The page you're looking for doesn't exist or has been moved.",
      },
    },
  },

  // ─── VOLUNTEER ───
  volunteer: {
    hero: {
      heading: { dev: "volunteer --apply", pro: "Volunteer With Us" },
      subtitle: {
        dev: "Help us grow Claude Community Kenya. We're looking for passionate volunteers to help manage social media, create content, coordinate events, and build community.",
        pro: "Help us grow Claude Community Kenya. We're looking for passionate volunteers to help manage social media, create content, coordinate events, and grow the community.",
      },
    },
  },

  // ─── RESOURCES INDEX ───
  resources: {
    hero: {
      heading: { dev: "man claude --resources", pro: "Resources" },
      subtitle: {
        dev: "Everything you need to start building with Claude",
        pro: "Everything you need to start using Claude",
      },
    },
    claudeCode: {
      description: {
        dev: "Master the CLI tool that's changing how developers build software.",
        pro: "Learn about the AI coding tool that helps developers write software faster.",
      },
    },
    workflows: {
      description: {
        dev: "Agentic patterns, plan mode, git worktrees, and production strategies.",
        pro: "Advanced strategies and patterns for getting more done with Claude.",
      },
    },
    apiGuide: {
      description: {
        dev: "Complete API reference — authentication, models, streaming, tool use, and code examples.",
        pro: "Technical reference for integrating Claude into applications.",
      },
    },
    productionGuide: {
      description: {
        dev: "Deploy Claude to production — error handling, rate limits, cost optimization, and security.",
        pro: "Guide to using Claude reliably at scale — costs, security, and best practices.",
      },
    },
  },

  // ─── GETTING STARTED ───
  gettingStarted: {
    hero: {
      heading: { dev: "cat getting-started.md", pro: "Getting Started" },
      subtitle: {
        dev: "Your guide to getting started with Claude AI — from zero to building.",
        pro: "Your guide to getting started with Claude AI — from zero to productive.",
      },
    },
    products: {
      heading: { dev: "ls ./claude-products/", pro: "Claude Products" },
    },
    setup: {
      heading: { dev: "./setup.sh --guided", pro: "Quick Setup" },
    },
    pricing: {
      heading: { dev: "claude --pricing", pro: "Pricing" },
    },
  },

  // ─── CLAUDE CODE ───
  claudeCode: {
    hero: {
      heading: { dev: "man claude-code", pro: "Claude Code Guide" },
      subtitle: {
        dev: "The complete guide to Anthropic's CLI for building software with Claude.",
        pro: "A guide to Anthropic's AI-powered coding assistant.",
      },
    },
    install: {
      heading: { dev: "./install.sh", pro: "Installation" },
    },
    commands: {
      heading: { dev: "claude /help", pro: "Key Commands" },
    },
    claudeMd: {
      heading: { dev: "cat CLAUDE.md", pro: "Project Configuration" },
    },
    multiInstance: {
      heading: { dev: "tmux split-window -h", pro: "Multi-Instance Workflows" },
    },
    resources: {
      heading: { dev: "cat ./resources.txt", pro: "Learn More" },
    },
  },

  // ─── WORKFLOWS ───
  workflows: {
    hero: {
      heading: { dev: "cat advanced-workflows.md", pro: "Advanced Workflows" },
      subtitle: {
        dev: "Level up your development with agentic patterns, parallel workflows, and production-grade strategies.",
        pro: "Advanced strategies for getting more done with Claude.",
      },
    },
    agentic: {
      heading: { dev: "explain --agentic-development", pro: "Agentic Development" },
    },
    planMode: {
      heading: { dev: "claude --plan", pro: "Plan Mode" },
    },
    worktrees: {
      heading: { dev: "git worktree --strategy", pro: "Parallel Workflows" },
    },
  },

  // ─── COURSES ───
  courses: {
    hero: {
      heading: { dev: "cat learning-paths.md", pro: "Learning Paths" },
      subtitle: {
        dev: "Free structured courses from Anthropic. Complete them in order for the best learning experience — or jump to the topic you need.",
        pro: "Free structured courses from Anthropic. Complete them in order for the best learning experience — or jump to the topic you need.",
      },
    },
  },

  // ─── LINKS ───
  links: {
    hero: {
      heading: { dev: "tree ./resources --links", pro: "Resource Directory" },
      subtitle: {
        dev: "A comprehensive directory of resources, tools, and communities — curated by Claude Community Kenya.",
        pro: "A comprehensive directory of resources, tools, and communities — curated by Claude Community Kenya.",
      },
    },
    contribute: {
      heading: { dev: "contribute --resource", pro: "Contribute a Resource" },
    },
  },

  // ─── API GUIDE ───
  apiGuide: {
    hero: {
      heading: { dev: "man claude-api", pro: "API Reference" },
      subtitle: {
        dev: "A complete reference for integrating Claude into your applications via the Anthropic API.",
        pro: "A complete reference for integrating Claude into your applications.",
      },
    },
    auth: {
      heading: { dev: 'export ANTHROPIC_API_KEY="..."', pro: "Authentication" },
    },
    models: {
      heading: { dev: "claude models --list", pro: "Available Models" },
    },
    basicUsage: {
      heading: { dev: "curl https://api.anthropic.com/v1/messages", pro: "Basic Usage" },
    },
    streaming: {
      heading: { dev: "claude --stream", pro: "Streaming Responses" },
    },
    tools: {
      heading: { dev: "claude --tools", pro: "Tool Use" },
    },
    systemPrompts: {
      heading: { dev: 'claude --system "You are..."', pro: "System Prompts" },
    },
    rateLimits: {
      heading: { dev: "claude --rate-limits", pro: "Rate Limits" },
    },
    sdk: {
      heading: { dev: "npm install @anthropic-ai/sdk", pro: "SDK Installation" },
    },
    nextSteps: {
      heading: { dev: "cat ./next-steps.md", pro: "Next Steps" },
    },
  },

  // ─── PRODUCTION GUIDE ───
  productionGuide: {
    hero: {
      heading: { dev: "deploy --production", pro: "Production Guide" },
      subtitle: {
        dev: "Everything you need to ship Claude-powered applications that are reliable, cost-efficient, and ready for real users.",
        pro: "Everything you need to run Claude-powered applications that are reliable, cost-efficient, and ready for real users.",
      },
    },
    architecture: {
      heading: { dev: "cat architecture.md", pro: "Architecture" },
    },
    errorHandling: {
      heading: { dev: "try {} catch { handle() }", pro: "Error Handling" },
    },
    rateLimits: {
      heading: { dev: "cat rate-limits.md", pro: "Rate Limits" },
    },
    prompts: {
      heading: { dev: "vim system-prompt.txt", pro: "Prompt Design" },
    },
    costs: {
      heading: { dev: "claude --cost-optimize", pro: "Cost Optimization" },
    },
    security: {
      heading: { dev: "chmod 600 .env", pro: "Security" },
    },
    monitoring: {
      heading: { dev: "tail -f production.log", pro: "Monitoring" },
    },
    checklist: {
      heading: { dev: "./pre-launch-checklist.sh", pro: "Launch Checklist" },
    },
    nextSteps: {
      heading: { dev: "cat ./next-steps.md", pro: "Next Steps" },
    },
  },
};

export function getPersonaContent(
  page: string,
  section: string,
  persona: "dev" | "pro",
): SectionContent {
  const pageDef = CONTENT[page];
  if (!pageDef) return {};
  const sectionDef = pageDef[section];
  if (!sectionDef) return {};

  return {
    heading: sectionDef.heading?.[persona],
    subtitle: sectionDef.subtitle?.[persona],
    description: sectionDef.description?.[persona],
    items: sectionDef.items?.[persona],
  };
}
