import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG } from "@/lib/constants";
import { KaribuJoin } from "@/components/karibu/KaribuJoin";

export const metadata: Metadata = {
  title: `Join | ${SITE_CONFIG.name}`,
  description:
    "Join Africa's only Claude developer community. Attend meetups in Nairobi and Mombasa, learn Claude Code, and build with AI.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/join`,
  },
  openGraph: {
    title: `Join | ${SITE_CONFIG.name}`,
    description:
      "Join Africa's only Claude developer community. Attend meetups in Nairobi and Mombasa, learn Claude Code, and build with AI.",
    url: `${SITE_CONFIG.url}/join`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function JoinPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Join" }]} />
      <KaribuJoin />
    </>
  );
}
