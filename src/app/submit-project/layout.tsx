import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Submit a Project | ${SITE_CONFIG.name}`,
  description:
    "Submit your Claude-powered project to Claude Community Kenya. Get featured on our projects page and inspire the developer community.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/submit-project`,
  },
  openGraph: {
    title: `Submit a Project | ${SITE_CONFIG.name}`,
    description:
      "Submit your Claude-powered project to Claude Community Kenya. Get featured on our projects page and inspire the developer community.",
    url: `${SITE_CONFIG.url}/submit-project`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function SubmitProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
