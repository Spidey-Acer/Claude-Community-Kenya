import type { Metadata } from "next";
import { KaribuHome } from "@/components/karibu/KaribuHome";
import { loadHomeData } from "@/lib/home/home-data";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.claudekenya.org" },
  title: "Claude Community Kenya — Build with Claude AI",
  description:
    "Kenya's independent, volunteer-run Claude developer community. Join meetups, workshops, and build with Claude AI.",
  openGraph: {
    title: "Claude Community Kenya — Build with Claude AI",
    description:
      "Kenya's independent, volunteer-run Claude developer community. Join meetups, workshops, and build with Claude AI.",
    url: "https://www.claudekenya.org",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya — Build with Claude AI",
    description:
      "Kenya's independent, volunteer-run Claude developer community. Join meetups, workshops, and build with Claude AI.",
  },
};

export const revalidate = 3600;

export default async function Home() {
  const homeData = await loadHomeData();
  return <KaribuHome {...homeData} />;
}
