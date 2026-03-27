import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Submit a Project | ${SITE_CONFIG.name}`,
  description:
    "Submit your Claude-powered project or startup idea to Claude Community Kenya. Get featured, find collaborators, and connect with the developer community.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/submit-idea`,
  },
  openGraph: {
    title: `Submit a Project | ${SITE_CONFIG.name}`,
    description:
      "Submit your Claude-powered project or startup idea to Claude Community Kenya. Get featured, find collaborators, and connect with the developer community.",
    url: `${SITE_CONFIG.url}/submit-idea`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function SubmitIdeaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
