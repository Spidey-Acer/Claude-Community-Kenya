/**
 * Client-safe metadata + validation for admin-configurable social links.
 *
 * Deliberately has no Prisma import — this module is shared by the admin
 * editor (client component) and the API route (server), and the accessor
 * in `social-links.ts` (server-only, reads the DB) imports the metadata
 * from here too. Keeping Prisma out of this file keeps it out of the
 * client bundle.
 */

import { z } from "zod";
import { SOCIAL_LINKS } from "@/lib/constants";

/** Platform keys, in the order they should appear in the admin UI. */
export const SOCIAL_PLATFORM_KEYS = [
  "whatsapp",
  "discord",
  "twitter",
  "linkedin",
  "instagram",
  "youtube",
  "github",
  "lumaNairobi",
  "lumaMombasa",
] as const;

export type SocialPlatformKey = (typeof SOCIAL_PLATFORM_KEYS)[number];

/** Resolved shape returned by `getSocialLinks()` — one nullable URL per platform. */
export type SocialLinks = Record<SocialPlatformKey, string | null>;

/** DB column name for each platform, matching the `SiteSettings` model. */
export const SOCIAL_PLATFORM_DB_FIELD: Record<SocialPlatformKey, string> = {
  whatsapp: "whatsappUrl",
  discord: "discordUrl",
  twitter: "twitterUrl",
  linkedin: "linkedinUrl",
  instagram: "instagramUrl",
  youtube: "youtubeUrl",
  github: "githubUrl",
  lumaNairobi: "lumaNairobiUrl",
  lumaMombasa: "lumaMombasaUrl",
};

/** Hardcoded fallback for each platform — undefined where no constant exists (youtube, github). */
export const SOCIAL_PLATFORM_FALLBACK: Record<SocialPlatformKey, string | undefined> = {
  whatsapp: SOCIAL_LINKS.whatsapp,
  discord: SOCIAL_LINKS.discord,
  twitter: SOCIAL_LINKS.twitter,
  linkedin: SOCIAL_LINKS.linkedin,
  instagram: SOCIAL_LINKS.instagram,
  youtube: undefined,
  github: undefined,
  lumaNairobi: SOCIAL_LINKS.lumaNairobi,
  lumaMombasa: SOCIAL_LINKS.lumaMombasa,
};

interface PlatformMeta {
  key: SocialPlatformKey;
  label: string;
  placeholder: string;
  /** Accepted hostnames (exact match or subdomain of). A pasted link from the wrong platform is rejected. */
  allowedHosts: readonly string[];
}

export const SOCIAL_PLATFORM_META: readonly PlatformMeta[] = [
  { key: "whatsapp", label: "WhatsApp Group", placeholder: "https://chat.whatsapp.com/...", allowedHosts: ["chat.whatsapp.com", "wa.me"] },
  { key: "discord", label: "Discord", placeholder: "https://discord.gg/...", allowedHosts: ["discord.gg", "discord.com"] },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/...", allowedHosts: ["x.com", "twitter.com"] },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/...", allowedHosts: ["linkedin.com"] },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/...", allowedHosts: ["instagram.com"] },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@...", allowedHosts: ["youtube.com", "youtu.be"] },
  { key: "github", label: "GitHub Org", placeholder: "https://github.com/...", allowedHosts: ["github.com"] },
  { key: "lumaNairobi", label: "Luma — Nairobi", placeholder: "https://luma.com/...", allowedHosts: ["luma.com"] },
  { key: "lumaMombasa", label: "Luma — Mombasa", placeholder: "https://luma.com/...", allowedHosts: ["luma.com"] },
];

/** Hostname check that also accepts subdomains (e.g. `www.linkedin.com` for an allowed host of `linkedin.com`). */
function hostMatches(hostname: string, allowedHosts: readonly string[]): boolean {
  return allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

/** Builds a Zod schema that accepts an https URL on the platform's allowed hosts, or "" (cleared). */
function platformUrlSchema(meta: PlatformMeta) {
  return z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => {
        if (value === "") return true; // empty = "not configured"
        try {
          const url = new URL(value);
          return url.protocol === "https:" && hostMatches(url.hostname, meta.allowedHosts);
        } catch {
          return false;
        }
      },
      {
        message: `Must be a https:// link to ${meta.allowedHosts.join(" or ")} (or empty to clear it)`,
      }
    )
    // Empty string means "not configured" — normalize to null so the DB
    // column and the API response agree with the accessor's semantics.
    .transform((value) => (value === "" ? null : value));
}

type OptionalPlatformSchema = z.ZodOptional<ReturnType<typeof platformUrlSchema>>;

/** PATCH body schema for /api/admin/settings/socials — every field optional so partial saves work. */
export const socialLinksUpdateSchema = z.object(
  Object.fromEntries(
    SOCIAL_PLATFORM_META.map((meta) => [meta.key, platformUrlSchema(meta).optional()])
  ) as Record<SocialPlatformKey, OptionalPlatformSchema>
);

export type SocialLinksUpdateInput = z.infer<typeof socialLinksUpdateSchema>;
