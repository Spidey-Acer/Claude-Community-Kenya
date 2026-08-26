import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getAlbumEvent, getEventPhotos } from "@/lib/data";
import { publicUrl } from "@/lib/gallery/r2";
import { KaribuAlbum } from "@/components/karibu/KaribuAlbum";
import { formatBytes } from "@/components/karibu/KaribuGalleryIndex";
import { CONTACT } from "@/lib/constants";

export const revalidate = 1800;

interface AlbumPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getAlbumEvent(slug).catch(() => null);
  if (!event) return { title: "Album not found" };

  const title = `${event.title} — photos`;
  const description = `Photos from ${event.title} in ${event.city}.`;
  const url = `https://www.claudekenya.org/gallery/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Claude Community Kenya", type: "website" },
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug } = await params;

  const [event, photos] = await Promise.all([
    getAlbumEvent(slug).catch(() => null),
    getEventPhotos(slug).catch(() => []),
  ]);

  // An event with no photos is not an album. Better a 404 than an empty page
  // that looks like the photos are missing.
  if (!event || photos.length === 0) notFound();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Gallery", url: "/gallery" },
          { name: event.title },
        ]}
      />
      <KaribuAlbum
        event={event}
        photos={photos}
        bundleUrl={event.bundleKey ? publicUrl(event.bundleKey) : null}
        bundleLabel={event.bundleBytes ? formatBytes(event.bundleBytes) : null}
        takedownEmail={CONTACT.email}
      />
    </>
  );
}
