export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
  website?: string;
  avatar?: string;
}

export const team: TeamMember[] = [
  {
    id: "peter-kibet",
    name: "Peter Kibet",
    role: "Founder & Community Lead",
    bio: "Software Engineer and CEO of NexaForge Digital. Claude Community Ambassador for Kenya — part of Anthropic's founding global cohort across 74 cities in 33 countries. Builder of the Mulinga Farm Management System — a production system managing 26,000+ coffee plants with GIS mapping, blockchain traceability, and AI-powered compliance. Organized 5 Claude events across Nairobi and Mombasa with 700+ total registrations.",
    twitter: "https://twitter.com/spideyinc",
    github: "https://github.com/Spidey-Acer",
    linkedIn: "https://linkedin.com/in/peter-kibet",
    website: "https://www.peterkibet.co.ke",
    avatar: "/images/peter-professional.webp",
  },
];
