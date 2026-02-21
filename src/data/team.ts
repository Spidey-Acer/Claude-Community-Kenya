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
  {
    id: "edwin-lungatso",
    name: "Edwin Lungatso",
    role: "Co-Organizer (Nairobi)",
    bio: "Software engineer and community builder based in Nairobi. Co-organizes meetups and helps developers get started with Claude Code.",
    linkedIn: "#",
    github: "#",
    avatar: "/images/team/edwin-lungatso.jpg",
  },
  {
    id: "dr-fullgence-mwakondo",
    name: "Dr. Fullgence Mwakondo",
    role: "Academic Partner (Mombasa)",
    bio: "Senior lecturer at the Technical University of Mombasa. Bridges the gap between academia and industry through Claude Community Kenya.",
    linkedIn: "https://linkedin.com/in/fullgence-mwakondo",
    avatar: "/images/team/dr-fullgence.jpg",
  },
  {
    id: "joshua-wekesa",
    name: "Joshua Wekesa",
    role: "Community Partner (Mombasa)",
    bio: "Tech community organizer at Swahilipot Hub Foundation. Connects Claude Community Kenya with the coastal tech ecosystem.",
    twitter: "https://twitter.com/joshuawekesa",
    linkedIn: "https://linkedin.com/in/joshua-wekesa",
    avatar: "/images/team/joshua-wekesa.jpg",
  },
];
