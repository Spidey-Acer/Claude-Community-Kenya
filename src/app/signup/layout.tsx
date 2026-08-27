import type { Metadata, Viewport } from "next";

/**
 * /signup is a client component, so its metadata lives here — the same shape
 * its four sibling auth routes (login, forgot-password, reset-password,
 * verify-email) already use.
 *
 * `robots: index:false` matters more than the title: an account-creation form
 * has nothing to offer a search result, and sitemap.ts already documents auth
 * routes as deliberately omitted on the understanding that the routes
 * themselves carry the noindex. This was the one that didn't.
 */
export const metadata: Metadata = {
  title: "Create an account | Claude Community Kenya",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#141413",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
