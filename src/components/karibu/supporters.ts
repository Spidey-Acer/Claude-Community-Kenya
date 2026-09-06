/**
 * Shared supporter/partner roster for `SupporterWall` (home, /about). One
 * list so the two pages can't drift — see the 2026-09-05 structure-redesign
 * spec, section 4.
 */

import type { Supporter } from "@/components/karibu/SupporterWall";

export const SUPPORTERS: Supporter[] = [
  { name: "Anthropic", logo: "/images/anthropic-wordmark.webp", href: "https://anthropic.com", invertInDark: true },
  { name: "Hackhouse Africa" },
  { name: "Blockchain Centre" },
  { name: "Zone01 Kisumu" },
  { name: "Technical University of Mombasa" },
];
