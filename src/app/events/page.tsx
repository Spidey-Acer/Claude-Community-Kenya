import type { Metadata } from "next";
import { EventsContent } from "./EventsContent";

export const metadata: Metadata = {
  title: "Events | Claude Community Kenya",
  description:
    "Upcoming meetups, workshops, and career talks across Kenya. Join the Claude developer community.",
  openGraph: {
    title: "Events | Claude Community Kenya",
    description:
      "Upcoming meetups, workshops, and career talks across Kenya. Join the Claude developer community.",
    url: "https://www.claudekenya.org/events",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

export default function EventsPage() {
  return <EventsContent />;
}
