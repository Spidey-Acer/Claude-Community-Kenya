// ─── Site Metadata ───
export const SITE_CONFIG = {
  name: "Claude Community Kenya",
  shortName: "CCK",
  title: "Claude Community Kenya",
  description:
    "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
  url: "https://claudecommunitykenya.com",
  logo: "/logo.svg",
  locale: "en_KE",
  twitterHandle: "@ClaudeCommunityKE",
  social: {
    twitter: "https://twitter.com/ClaudeCommunityKE",
    github: "https://github.com/claude-community-kenya",
    discord: "https://discord.gg/claude-community-ke",
    linkedin: "https://linkedin.com/company/claude-community-kenya",
    luma: "https://lu.ma/claude-community-kenya",
    instagram: "https://instagram.com/claudecommunitykenya",
    facebook: "https://facebook.com/claudecommunitykenya",
  },
  contact: {
    email: "claudecommunitykenya@gmail.com",
    city: "Nairobi, Kenya",
  },
} as const;

// ─── Navigation Links ───
export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Resources", href: "/resources" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Join", href: "/join" },
] as const;

// ─── Social Links ───
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/ClaudeCommunityKE",
  github: "https://github.com/claude-community-kenya",
  discord: "https://discord.gg/claude-community-ke",
  linkedin: "https://linkedin.com/company/claude-community-kenya",
  luma: "https://lu.ma/claude-community-kenya",
} as const;

// ─── API Endpoints (v1 placeholders) ───
export const API_ENDPOINTS = {
  events: "/api/events",
  newsletter: "/api/newsletter",
  contact: "/api/contact",
} as const;

// ─── Footer Links ───
export const FOOTER_SECTIONS = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "/" },
      { label: "Events", href: "/events" },
      { label: "Projects", href: "/projects" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Join", href: "/join" },
      { label: "Discord", href: SOCIAL_LINKS.discord },
      { label: "Twitter", href: SOCIAL_LINKS.twitter },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Getting Started", href: "/resources/getting-started" },
      { label: "Claude Code", href: "/resources/claude-code" },
      { label: "Workflows", href: "/resources/workflows" },
      { label: "Useful Links", href: "/resources/links" },
    ],
  },
] as const;

// ─── Contact ───
export const CONTACT = {
  email: "claudecommunitykenya@gmail.com",
  city: "Nairobi, Kenya",
} as const;

// ─── Partners ───
export const partners = [
  { name: "Anthropic", url: "https://anthropic.com" },
  { name: "Technical University of Mombasa", url: "https://tum.ac.ke" },
  { name: "Swahilipot Hub Foundation", url: "https://swahilipothub.co.ke" },
] as const;

// ─── Official Resource Links ───
export const resources = {
  claude: "https://claude.ai",
  claudeCode: "https://docs.anthropic.com/en/docs/claude-code",
  anthropic: "https://anthropic.com",
  docs: "https://docs.anthropic.com",
  api: "https://docs.anthropic.com/en/docs/api-reference",
} as const;

// ─── Navigation Links (extended) ───
export const NAVIGATION_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Resources", href: "/resources" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Join", href: "/join" },
] as const;

// ─── Resource Links ───
export const RESOURCE_LINKS = {
  official: [
    { label: "Claude.ai", href: "https://claude.ai" },
    { label: "Anthropic Docs", href: "https://docs.anthropic.com" },
    { label: "Claude Code Docs", href: "https://docs.anthropic.com/en/docs/claude-code" },
    { label: "API Reference", href: "https://docs.anthropic.com/en/docs/api-reference" },
  ],
  learning: [
    { label: "Prompt Engineering Guide", href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering" },
    { label: "Claude Code Tutorial", href: "https://docs.anthropic.com/en/docs/claude-code/getting-started" },
    { label: "Anthropic Cookbook", href: "https://github.com/anthropics/anthropic-cookbook" },
  ],
} as const;
