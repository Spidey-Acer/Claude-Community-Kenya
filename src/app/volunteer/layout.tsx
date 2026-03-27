import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Volunteer | ${SITE_CONFIG.name}`,
  description:
    "Volunteer with Claude Community Kenya. Help organize meetups, manage social media, create content, or coordinate events in Nairobi and Mombasa.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/volunteer`,
  },
  openGraph: {
    title: `Volunteer | ${SITE_CONFIG.name}`,
    description:
      "Volunteer with Claude Community Kenya. Help organize meetups, manage social media, create content, or coordinate events in Nairobi and Mombasa.",
    url: `${SITE_CONFIG.url}/volunteer`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
