import type { Metadata } from "next";
import { EventsContent } from "./EventsContent";

export const metadata: Metadata = {
  title: "Events | Claude Community Kenya",
  description:
    "Claude developer meetups, workshops, and career talks in Nairobi and Mombasa. Join Kenya's official Claude community events.",
  alternates: {
    canonical: "https://www.claudekenya.org/events",
  },
  openGraph: {
    title: "Events | Claude Community Kenya",
    description:
      "Claude developer meetups, workshops, and career talks in Nairobi and Mombasa. Join Kenya's official Claude community events.",
    url: "https://www.claudekenya.org/events",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

export default function EventsPage() {
  return <EventsContent />;
}
