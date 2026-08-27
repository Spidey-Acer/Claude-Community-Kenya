import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Submit Resource | Tools & Prompts | ${SITE_CONFIG.name}`,
  description:
    "Share your MCP server, prompt template, workflow, or Claude-powered tool with the Claude Community Kenya. Contribute to Tools & Prompts.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/community/submit`,
  },
  openGraph: {
    title: `Submit Resource | Tools & Prompts | ${SITE_CONFIG.name}`,
    description:
      "Share your MCP server, prompt template, workflow, or Claude-powered tool with the Claude Community Kenya. Contribute to Tools & Prompts.",
    url: `${SITE_CONFIG.url}/community/submit`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function CommunitySubmitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
