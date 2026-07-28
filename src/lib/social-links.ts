/**
 * Server-only accessor for admin-configurable social links.
 *
 * Fallback chain per platform: DB value (if set) → hardcoded constant in
 * `src/lib/constants.ts` → absent (null). A null value means every consumer
 * renders nothing for that platform — no dead icons, no `#` hrefs.
 *
 * This function must never throw: it is called from `src/app/layout.tsx`,
 * so an unhandled rejection here would 500 every page. DB failures fall
 * back to the constants-only shape, same as the rest of the data layer
 * (see `src/lib/chat/community-context.ts`).
 *
 * Cached in-memory for a short TTL (mirrors the pattern in
 * `src/lib/karibu/system-prompt.ts`) so every request in a render doesn't
 * hit the DB. Call `invalidateSocialLinksCache()` after a write so the
 * admin panel doesn't appear to "not save" for up to the TTL.
 */

import { prisma } from "@/lib/prisma";
import {
  SOCIAL_PLATFORM_KEYS,
  SOCIAL_PLATFORM_DB_FIELD,
  SOCIAL_PLATFORM_FALLBACK,
  type SocialLinks,
} from "@/lib/social-links-schema";

const CACHE_TTL_MS = 60 * 1000;
let cached: { data: SocialLinks; expiresAt: number } | null = null;

function fallbackOnly(): SocialLinks {
  return Object.fromEntries(
    SOCIAL_PLATFORM_KEYS.map((key) => [key, SOCIAL_PLATFORM_FALLBACK[key] ?? null])
  ) as SocialLinks;
}

/**
 * Returns the resolved social links: DB override if set, else the
 * hardcoded constant, else null. Safe to call from Server Components,
 * route handlers, and prompt builders — never throws.
 */
export async function getSocialLinks(): Promise<SocialLinks> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  let resolved: SocialLinks;
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    resolved = Object.fromEntries(
      SOCIAL_PLATFORM_KEYS.map((key) => {
        const dbValue = row?.[SOCIAL_PLATFORM_DB_FIELD[key] as keyof typeof row] as string | null | undefined;
        return [key, dbValue || SOCIAL_PLATFORM_FALLBACK[key] || null];
      })
    ) as SocialLinks;
  } catch (error) {
    console.error("[SOCIAL_LINKS] Failed to read site_settings, using constants fallback:", error);
    resolved = fallbackOnly();
  }

  cached = { data: resolved, expiresAt: now + CACHE_TTL_MS };
  return resolved;
}

/** Clears the in-memory cache. Call after a successful admin write. */
export function invalidateSocialLinksCache(): void {
  cached = null;
}
