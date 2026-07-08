import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getGalleryPhotos, getEventsWithPhotos } from "@/lib/data";
import { KaribuGallery } from "@/components/karibu/KaribuGallery";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Gallery | Claude Community Kenya",
  description:
    "Photos from Claude Community Kenya meetups, workshops, and gatherings in Nairobi, Mombasa, and beyond.",
  alternates: {
    canonical: "https://www.claudekenya.org/gallery",
  },
  openGraph: {
    title: "Gallery | Claude Community Kenya",
    description:
      "Photos from Claude Community Kenya meetups, workshops, and gatherings.",
    url: "https://www.claudekenya.org/gallery",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

interface GalleryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const eventFilter = typeof params.event === "string" ? params.event : null;

  const [photos, eventChips] = await Promise.all([
    getGalleryPhotos().catch(() => []),
    getEventsWithPhotos().catch(() => []),
  ]);

  return (
    <>
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Gallery" }]}
      />
      <KaribuGallery
        photos={photos}
        eventChips={eventChips}
        initialFilter={eventFilter}
      />
    </>
  );
}
