/**
 * Permanent redirects for the public paths cut in the site revamp.
 *
 * `PUBLIC_REDIRECTS` is the table handed to Next's `redirects()` in
 * next.config.ts. `resolveRedirect` mirrors the matching rules in pure code so
 * the table can be unit-tested, including the trailing-slash case Next's own
 * matcher treats differently (Review Focus 5).
 *
 * Rule: a row is added only in the task that builds its destination page, so a
 * redirect never lands on a 404 between merges (Review Focus 6).
 */

export interface PublicRedirect {
  source: string;
  destination: string;
  permanent: true;
}

export const PUBLIC_REDIRECTS: ReadonlyArray<PublicRedirect> = [
  { source: "/community", destination: "/showcase", permanent: true },
  { source: "/community/submit", destination: "/showcase/submit", permanent: true },
  { source: "/community/:slug", destination: "/showcase/:slug", permanent: true },
  { source: "/gallery", destination: "/events", permanent: true },
  { source: "/gallery/:slug", destination: "/events/:slug", permanent: true },
  { source: "/newsletter", destination: "/blog", permanent: true },
  { source: "/newsletter/:slug", destination: "/blog", permanent: true },
  { source: "/impact-lab", destination: "/reports", permanent: true },
  { source: "/conversations", destination: "/reports", permanent: true },
  { source: "/chat", destination: "/", permanent: true },
  { source: "/merch", destination: "/", permanent: true },
];

/** Drops one trailing slash, keeping the root path "/" intact. */
function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * Matches `pathname` against one source pattern. A `:name` segment matches
 * exactly one path segment. Returns the captured params, or null on no match.
 */
function matchSource(source: string, pathname: string): Record<string, string> | null {
  const sourceParts = source.split("/");
  const pathParts = pathname.split("/");
  if (sourceParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < sourceParts.length; index += 1) {
    const sourcePart = sourceParts[index];
    if (sourcePart.startsWith(":")) {
      if (pathParts[index] === "") return null;
      params[sourcePart.slice(1)] = pathParts[index];
    } else if (sourcePart !== pathParts[index]) {
      return null;
    }
  }
  return params;
}

/** Substitutes `:name` params into a destination pattern. */
function fillDestination(destination: string, params: Record<string, string>): string {
  return destination.replace(/:(\w+)/g, (_, name: string) => params[name] ?? "");
}

/**
 * Returns the redirect destination for `pathname`, or null when the path is
 * not redirected. Literal sources win over `:param` sources.
 */
export function resolveRedirect(pathname: string): string | null {
  const normalized = stripTrailingSlash(pathname);
  const literalFirst = [...PUBLIC_REDIRECTS].sort(
    (a, b) => Number(a.source.includes(":")) - Number(b.source.includes(":")),
  );
  for (const redirect of literalFirst) {
    const params = matchSource(redirect.source, normalized);
    if (params) return fillDestination(redirect.destination, params);
  }
  return null;
}
