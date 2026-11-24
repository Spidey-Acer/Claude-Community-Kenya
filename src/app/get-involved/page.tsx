import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";
import { parseRole } from "@/lib/get-involved";
import { KaribuGetInvolved } from "@/components/karibu/KaribuGetInvolved";

const DESCRIPTION =
  "Speak at a Claude Community Kenya meetup, volunteer with the team, or submit a project idea. One page, three ways to take part.";

export const metadata: Metadata = {
  title: `Get involved | ${SITE_CONFIG.name}`,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_CONFIG.url}/get-involved` },
  openGraph: {
    title: `Get involved | ${SITE_CONFIG.name}`,
    description: DESCRIPTION,
    url: `${SITE_CONFIG.url}/get-involved`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default async function GetInvolvedPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const { role } = await searchParams;
  return <KaribuGetInvolved initialRole={parseRole(role)} />;
}
