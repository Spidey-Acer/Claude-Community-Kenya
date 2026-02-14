import type { Metadata } from "next";
import { EventsContent } from "./EventsContent";

export const metadata: Metadata = {
  title: "Events | Claude Community Kenya",
  description:
    "Upcoming meetups, workshops, and career talks across Kenya. Join the Claude developer community.",
};

export default function EventsPage() {
  return <EventsContent />;
}
