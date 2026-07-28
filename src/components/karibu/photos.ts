/**
 * Shared real-photo helpers for the Karibu pages.
 *
 * Optimized event photos live in /public/images/community (see _manifest.json).
 */

export const HERO_PHOTO = "/images/community/hero-crowd.webp";

/**
 * What HERO_PHOTO actually depicts. Rendered as a visible credit on the hero,
 * because an announcement chip sits on this photo and without a credit the
 * chip reads as a caption — which is how a Mombasa crowd spent a week on the
 * homepage implying it was a Nairobi hackathon. If you swap the photo above,
 * update this line in the same commit.
 */
export const HERO_PHOTO_CREDIT = "Mombasa AI & Career Talk";

/** Portrait/gallery photos for the community-in-action collage. */
export const GALLERY_PHOTOS = {
  tall: "/images/community/mural-laptops.webp",
  topRight: "/images/community/audience.webp",
  bottomRight: "/images/community/group-standing.webp",
} as const;

/**
 * An event's cover photo — but only its own. There used to be a pooled
 * fallback here that handed an event with no posterUrl a photo from a
 * shared community pool, indexed by card position. That meant a real photo
 * of real people at one meetup could end up captioned with a *different*
 * event's name — which is exactly what happened on the live site (a
 * Mombasa crowd shown as the Nairobi hackathon). A stock-photo-style
 * misattribution, except the photo was real, which made it worse.
 *
 * So: no fallback. If an event has no posterUrl, render
 * `<EventCoverPlaceholder />` instead of a photo. Do not reinstate a pool
 * here — add the event's real poster instead.
 */
export function eventCover(posterUrl: string | undefined | null): string | null {
  return posterUrl ?? null;
}
