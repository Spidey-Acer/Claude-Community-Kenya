import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { KaribuNewsletter } from "@/components/karibu/KaribuNewsletter";
import { getNewsletterIssues } from "@/lib/data";
import { SITE_CONFIG } from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Newsletter | ${SITE_CONFIG.name}`,
  description:
    "Monthly digest from Claude Community Kenya — Claude tips, community projects, event recaps, and what's shipping in the Kenyan AI scene.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/newsletter`,
  },
  openGraph: {
    title: `Newsletter | ${SITE_CONFIG.name}`,
    description:
      "Monthly digest from Claude Community Kenya — Claude tips, community projects, event recaps, and what's shipping in the Kenyan AI scene.",
    url: `${SITE_CONFIG.url}/newsletter`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default async function NewsletterPage() {
  const issues = await getNewsletterIssues().catch(() => []);

  return (
    <>
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Newsletter" }]}
      />
      <KaribuNewsletter issues={issues} />
    </>
  );
}
