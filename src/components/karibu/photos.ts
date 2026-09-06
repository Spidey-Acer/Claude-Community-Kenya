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

/** The founding meetup photo — "Who we are" on home and /about. */
export const FIRST_MEETUP_PHOTO = "/images/community/first-meetup.webp";

/** Poster for the "Community in action" phone-framed reel slot. No video
 * file exists yet (2026-09-05 spec, Decision 2) — this is the still shown
 * until one does. */
export const REEL_POSTER_PHOTO = GALLERY_PHOTOS.tall;

/**
 * "Faces of the community" grid — every real, already-optimized event photo
 * on disk (see /public/images/community). All 12 are named tiles, not a
 * pool indexed by position, so each keeps a caption that's actually true of
 * it.
 */
export const FACES_PHOTOS: { src: string; alt: string }[] = [
  { src: "/images/community/audience.webp", alt: "An engaged audience at a CCK meetup" },
  { src: "/images/community/laptops.webp", alt: "Members building on their laptops at a CCK event" },
  { src: "/images/community/group-standing.webp", alt: "A CCK community group photo" },
  { src: "/images/community/mombasa-1.webp", alt: "Attendees at a CCK Mombasa event" },
  { src: "/images/community/presenting.webp", alt: "A member presenting at a CCK event" },
  { src: "/images/community/workshop-room.webp", alt: "A full room at a CCK workshop" },
  { src: "/images/community/networking.webp", alt: "Members networking between sessions" },
  { src: "/images/community/duo.webp", alt: "Two members working together at a CCK event" },
  { src: "/images/community/mic-question.webp", alt: "A member asking a question at a CCK event" },
  { src: "/images/community/crowd-nairobi.webp", alt: "A crowd at a CCK Nairobi event" },
  { src: "/images/community/founder-talk.webp", alt: "Peter Kibet speaking at a CCK event" },
  { src: "/images/community/mombasa-2.webp", alt: "Attendees at a CCK Mombasa event" },
];

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
