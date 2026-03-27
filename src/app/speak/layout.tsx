import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Speak at a Meetup | ${SITE_CONFIG.name}`,
  description:
    "Apply to speak at a Claude Community Kenya meetup. Share your Claude project, give a technical talk, or lead a workshop in Nairobi or Mombasa.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/speak`,
  },
  openGraph: {
    title: `Speak at a Meetup | ${SITE_CONFIG.name}`,
    description:
      "Apply to speak at a Claude Community Kenya meetup. Share your Claude project, give a technical talk, or lead a workshop in Nairobi or Mombasa.",
    url: `${SITE_CONFIG.url}/speak`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function SpeakLayout({ children }: { children: React.ReactNode }) {
  return children;
}
