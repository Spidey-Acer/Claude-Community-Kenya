/**
 * Decides whether the onboarding modal may open on a page. /login and /signup
 * wear the public chrome, but a modal over a sign-in form is in the way (and
 * covers the form), so those two paths never show it.
 */

const NO_ONBOARDING_PREFIXES = ["/login", "/signup"] as const;

/** True when the modal is wanted (`showKaribu`) and this path is not a sign-in page. */
export function shouldShowOnboarding(pathname: string, showKaribu: boolean): boolean {
  if (!showKaribu) return false;
  return !NO_ONBOARDING_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
