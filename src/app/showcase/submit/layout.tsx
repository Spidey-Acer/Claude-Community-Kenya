import type { Metadata } from "next"
import { SITE_CONFIG } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Post to the Showcase | ${SITE_CONFIG.name}`,
  description:
    "Share what you've built with Claude — cover image, demo clip, and what you need help with next.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/showcase/submit`,
  },
  openGraph: {
    title: `Post to the Showcase | ${SITE_CONFIG.name}`,
    description:
      "Share what you've built with Claude — cover image, demo clip, and what you need help with next.",
    url: `${SITE_CONFIG.url}/showcase/submit`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
}

export default function ShowcaseSubmitLayout({ children }: { children: React.ReactNode }) {
  return children
}
