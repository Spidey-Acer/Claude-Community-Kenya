/**
 * Footer link lists (spec S1). Every `href` must be a route that exists under
 * `src/app`; `__tests__/footer-links.test.ts` checks it. "Your data" is
 * `/account/data`. Socials are not listed here: they come from the
 * admin-configured `useSocialLinks()` so an unset platform is omitted.
 */

export interface FooterLink {
  label: string;
  href: string;
}

export const FOOTER_EXPLORE: readonly FooterLink[] = [
  { label: "Events", href: "/events" },
  { label: "Learn", href: "/resources" },
  { label: "Showcase", href: "/showcase" },
  { label: "Reports", href: "/reports" },
  { label: "About", href: "/about" },
];

export const FOOTER_GET_INVOLVED: readonly FooterLink[] = [
  { label: "Get involved", href: "/get-involved" },
  { label: "FAQ", href: "/faq" },
  { label: "Code of conduct", href: "/code-of-conduct" },
  { label: "Your data", href: "/account/data" },
];
