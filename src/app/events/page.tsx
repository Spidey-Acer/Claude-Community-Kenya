import type { Metadata } from "next";
import { KaribuEvents } from "@/components/karibu/KaribuEvents";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getEvents } from "@/lib/data";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Events | Claude Community Kenya",
  description:
    "Claude developer meetups, workshops, and career talks in Nairobi and Mombasa. Join Claude Community Kenya events.",
  alternates: {
    canonical: "https://www.claudekenya.org/events",
  },
  openGraph: {
    title: "Events | Claude Community Kenya",
    description:
      "Claude developer meetups, workshops, and career talks in Nairobi and Mombasa. Join Claude Community Kenya events.",
    url: "https://www.claudekenya.org/events",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

export default async function EventsPage() {
  const events = await getEvents().catch(() => []);
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Events" }]} />
      <KaribuEvents events={events} />
    </>
  );
}
