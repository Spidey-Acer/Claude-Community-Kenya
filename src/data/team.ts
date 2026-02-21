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
    role: "Founder & Lead Organizer",
    bio: "Founder and lead organizer of Claude Community Kenya. Organized Kenya's first Claude Code meetup and is passionate about bringing AI-powered development tools to every Kenyan developer.",
    twitter: "https://twitter.com/peterkilbet",
    github: "https://github.com/Spidey-Acer",
    linkedIn: "https://linkedin.com/in/peterkilbet",
    website: "https://www.peterkibet.co.ke",
    avatar: "/images/team/peter-kibet.jpg",
  },
];
