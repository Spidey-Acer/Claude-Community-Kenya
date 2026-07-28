"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SOCIAL_PLATFORM_KEYS, SOCIAL_PLATFORM_FALLBACK, type SocialLinks } from "@/lib/social-links-schema";

/**
 * Constants-only fallback, used only if a client component renders outside
 * a `SocialLinksProvider` (shouldn't happen — `layout.tsx` always wraps the
 * tree). Keeps `useSocialLinks()` safe to call unconditionally.
 */
const DEFAULT: SocialLinks = Object.fromEntries(
  SOCIAL_PLATFORM_KEYS.map((key) => [key, SOCIAL_PLATFORM_FALLBACK[key] ?? null])
) as SocialLinks;

const SocialLinksContext = createContext<SocialLinks>(DEFAULT);

/**
 * Provides server-resolved social links (DB override, or constant fallback,
 * or null) to client components. `value` is computed once per request in
 * `src/app/layout.tsx` via `getSocialLinks()` and passed down through
 * `ConditionalLayout` — the same server-to-client channel `AudienceContext`
 * uses for Karibu personalization.
 */
export function SocialLinksProvider({
  value,
  children,
}: {
  value: SocialLinks;
  children: ReactNode;
}) {
  return <SocialLinksContext.Provider value={value}>{children}</SocialLinksContext.Provider>;
}

/**
 * Returns the current resolved social links. A null value means "not
 * configured" — render nothing for that platform, never a `#` href.
 */
export function useSocialLinks(): SocialLinks {
  return useContext(SocialLinksContext);
}
