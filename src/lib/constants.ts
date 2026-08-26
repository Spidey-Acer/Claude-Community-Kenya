// ─── Site Metadata ───
export const SITE_CONFIG = {
  name: "Claude Community Kenya",
  shortName: "CCK",
  title: "Claude Community Kenya",
  description:
    "Anthropic-supported Claude developer community — building, learning, and shipping with Claude.",
  url: "https://www.claudekenya.org",
  locale: "en_KE",
  twitterHandle: "@ClaudeCommunityKE",
} as const;

// ─── Navigation Links ───
export interface NavLink {
  label: string;
  href: string;
  description?: string;
  children?: ReadonlyArray<NavLink>;
}

export const NAV_LINKS: ReadonlyArray<NavLink> = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  {
    label: "Events",
    href: "/events",
    children: [
      { label: "All Events", href: "/events", description: "Upcoming meetups, workshops, and past recaps." },
      { label: "Gallery", href: "/gallery", description: "Photos from every meetup we've hosted." },
    ],
  },
  {
    label: "Learn",
    href: "/resources",
    children: [
      { label: "Resources", href: "/resources", description: "Guides for Claude Code, the API, and production." },
      { label: "Blog", href: "/blog", description: "Posts from the community and organizers." },
      { label: "Newsletter", href: "/newsletter", description: "Past digests + subscribe." },
      { label: "FAQ", href: "/faq", description: "Common questions about CCK." },
    ],
  },
  {
    label: "Community",
    href: "/community",
    children: [
      { label: "Team", href: "/team", description: "Organisers, ambassadors, and contributors." },
      { label: "Projects", href: "/projects", description: "What members are shipping with Claude." },
      { label: "Community Hub", href: "/community", description: "MCPs, prompts, workflows shared by the community." },
      { label: "Showcase", href: "/showcase", description: "Member project posts — demos, launches, works in progress." },
    ],
  },
] as const;

// ─── Social Links ───
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/ClaudeCommunityKE",
  discord: "https://discord.gg/CkD9QWjsHm",
  // Points at the currently joinable group. The first group (Hpx42q1A…) is full
  // but still active — members stay, new joiners come here.
  whatsapp: "https://chat.whatsapp.com/HSNkqvKklyZBvI3zcpEMhX",
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
      { label: "Gallery", href: "/gallery" },
      { label: "Projects", href: "/projects" },
      { label: "Showcase", href: "/showcase" },
      { label: "Blog", href: "/blog" },
      { label: "Newsletter", href: "/newsletter" },
      { label: "FAQ", href: "/faq" },
      { label: "Merch", href: "/merch" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Team", href: "/team" },
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
  {
    title: "Cities",
    links: [
      { label: "Nairobi", href: SOCIAL_LINKS.lumaNairobi },
      { label: "Mombasa", href: SOCIAL_LINKS.lumaMombasa },
      { label: "More cities — request one", href: "/join" },
    ],
  },
] as const;

// ─── Contact ───
// ─── Feeds ───
/** Page size shared by the community/showcase feed queries and their pagination UI. */
export const FEED_PAGE_SIZE = 20;

export const CONTACT = {
  email: "claudecommunitykenya@gmail.com",
  phone: "+254 707 311 659",
  city: "Nairobi, Kenya",
} as const;

// ─── Official Resource URLs ───
export const RESOURCE_URLS = {
  claude: "https://claude.ai",
  claudeCode: "https://docs.anthropic.com/en/docs/claude-code",
  anthropic: "https://anthropic.com",
  docs: "https://docs.anthropic.com",
  api: "https://docs.anthropic.com/en/docs/api-reference",
} as const;
