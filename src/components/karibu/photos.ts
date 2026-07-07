/**
 * Shared real-photo helpers for the Karibu pages.
 *
 * Optimized event photos live in /public/images/community (see _manifest.json).
 * When a DB event has no posterUrl, we fall back to a stable photo from the
 * pool (indexed, so the same card always shows the same image).
 */

export const HERO_PHOTO = "/images/community/hero-crowd.webp";

/** Landscape-ish community photos used for event covers when none is set. */
export const COMMUNITY_PHOTOS = [
  "/images/community/crowd-nairobi.webp",
  "/images/community/workshop-space.webp",
  "/images/community/mombasa-1.webp",
  "/images/community/first-meetup.webp",
  "/images/community/presenting.webp",
  "/images/community/group-standing.webp",
  "/images/community/audience.webp",
  "/images/community/workshop-room.webp",
  "/images/community/mombasa-2.webp",
  "/images/community/networking.webp",
] as const;

/** Portrait/gallery photos for the community-in-action collage. */
export const GALLERY_PHOTOS = {
  tall: "/images/community/mural-laptops.webp",
  topRight: "/images/community/audience.webp",
  bottomRight: "/images/community/group-standing.webp",
} as const;

/** Deterministic cover for an event: its own poster, else a pooled photo. */
export function eventCover(posterUrl: string | undefined, index: number): string {
  return posterUrl || COMMUNITY_PHOTOS[index % COMMUNITY_PHOTOS.length];
}
