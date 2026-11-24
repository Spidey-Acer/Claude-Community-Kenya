/**
 * Route knowledge for the "I'm attending" page, shared by the analytics
 * switch-off (GoogleAnalytics.tsx) and the Content-Security-Policy header
 * (next.config.ts). Pure strings, importable from both client and config.
 */

/** Next.js header-source pattern for the page, used by next.config.ts. */
export const ATTENDING_HEADER_SOURCE = "/events/:slug/attending"

const ATTENDING_PATH = /^\/events\/[^/]+\/attending\/?$/

/** True for /events/<slug>/attending. */
export function isAttendingPath(pathname: string | null): boolean {
  return pathname !== null && ATTENDING_PATH.test(pathname)
}

/**
 * Content-Security-Policy for the page. `connect-src 'self'` means script on
 * the page can only talk to this site (the email lookup), so a photo cannot be
 * sent anywhere else. Inline scripts and styles stay allowed because Next.js
 * hydration and next/font emit them and the site has no nonce pipeline;
 * `unsafe-eval` is added only in development for React's debugging tools.
 */
export function buildAttendingCsp(isDevelopment: boolean): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : [])].join(" ")
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ")
}
