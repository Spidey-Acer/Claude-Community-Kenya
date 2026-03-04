// ─── Site Metadata ───
export const SITE_CONFIG = {
  name: "Claude Community Kenya",
  shortName: "CCK",
  title: "Claude Community Kenya",
  description:
    "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
  url: "https://www.claudekenya.org",
  logo: "/logo.svg",
  locale: "en_KE",
  twitterHandle: "@ClaudeCommunityKE",
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
  discord: "https://discord.gg/AVAyYCbJ",
  whatsapp: "https://chat.whatsapp.com/Hpx42q1ADsrFNN3hHtZcQa",
  linkedin: "https://linkedin.com/company/claude-community-kenya",
  lumaNairobi: "https://luma.com/sbsa789m",
  lumaMombasa: "https://luma.com/vsf5re14",
  lumaGlobal: "https://luma.com/claudecommunity",
  instagram: "https://instagram.com/claudecommunitykenya",
  facebook: "https://facebook.com/claudecommunitykenya",
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
      { label: "WhatsApp", href: SOCIAL_LINKS.whatsapp },
      { label: "Twitter", href: SOCIAL_LINKS.twitter },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Getting Started", href: "/resources/getting-started" },
      { label: "Claude Code", href: "/resources/claude-code" },
      { label: "Courses", href: "/resources/courses" },
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

// ─── Official Resource URLs ───
export const RESOURCE_URLS = {
  claude: "https://claude.ai",
  claudeCode: "https://docs.anthropic.com/en/docs/claude-code",
  anthropic: "https://anthropic.com",
  docs: "https://docs.anthropic.com",
  api: "https://docs.anthropic.com/en/docs/api-reference",
} as const;
