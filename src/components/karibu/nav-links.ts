/**
 * Primary navigation for the public site (spec S1): the five doors plus the
 * Join button, and the phone bottom bar. One list feeds the desktop bar, the
 * mobile sheet and the bottom bar, so they cannot drift. Every `href` must be
 * a route that exists under `src/app`; `__tests__/nav-links.test.ts` checks it.
 */

export interface NavItem {
  label: string;
  href: string;
  /** Extra path prefixes that count as "on this door" (pages that hang off it). */
  alsoActiveOn?: readonly string[];
}

/** Desktop bar and mobile sheet, in order. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Events", href: "/events" },
  { label: "Learn", href: "/resources" },
  { label: "Showcase", href: "/showcase" },
  { label: "Reports", href: "/reports", alsoActiveOn: ["/impact-lab", "/conversations"] },
  { label: "About", href: "/about" },
];

/** The one button: join the community. */
export const JOIN_NAV: NavItem = { label: "Join", href: "/join" };

/** Phone bottom bar: Home, Events, Learn, Showcase, then Join (rendered apart). */
export const BOTTOM_BAR_NAV: readonly NavItem[] = [
  { label: "Home", href: "/" },
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  PRIMARY_NAV[2],
];

/** True when `pathname` is the item's page or a page beneath it. */
export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.alsoActiveOn ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
