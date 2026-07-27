import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getGalleryAlbums } from "@/lib/data";
import { KaribuGalleryIndex } from "@/components/karibu/KaribuGalleryIndex";

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

  // The flat gallery used ?event= to filter one grid. Those links are in
  // WhatsApp threads and Luma posts that nobody is going back to edit, so they
  // redirect to the album rather than 404.
  const legacyFilter = typeof params.event === "string" ? params.event : null;
  if (legacyFilter) redirect(`/gallery/${legacyFilter}`);

  const albums = await getGalleryAlbums().catch(() => []);

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Gallery" }]} />
      <KaribuGalleryIndex albums={albums} />
    </>
  );
}
