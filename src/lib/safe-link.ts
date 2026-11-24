/**
 * safe-link: decides whether a link or image target taken from user-authored
 * markdown may reach an `href` or `src`. Allowed: `http:`, `https:`, optionally
 * `mailto:`, and site-relative targets (`/path`, `#anchor`). Everything else
 * (`javascript:`, `data:`, `vbscript:`, bare words, protocol-relative `//host`)
 * is rejected so the caller renders plain text instead.
 */

const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/i;
// Whitespace and control characters that browsers ignore inside a scheme.
const HIDDEN_CHARACTERS = new RegExp("[\u0000-\u0020\u007f-\u009f]", "g");

/** Returns the trimmed target when it is safe to render, otherwise `null`. */
export function safeLinkTarget(target: string, allowMailto: boolean): string | null {
  if (typeof target !== "string") return null;
  const trimmed = target.trim();
  if (!trimmed) return null;
  // Read the target the way a browser would: "java\tscript:" is javascript:.
  const compact = trimmed.replace(HIDDEN_CHARACTERS, "");
  if (compact.startsWith("//")) return null;
  if (compact.startsWith("/") || compact.startsWith("#")) return trimmed;
  const scheme = SCHEME_PATTERN.exec(compact);
  if (!scheme) return null;
  const protocol = `${scheme[1].toLowerCase()}:`;
  if (protocol === "http:" || protocol === "https:") return trimmed;
  if (protocol === "mailto:" && allowMailto) return trimmed;
  return null;
}

/** Image sources: `https:` and site-relative only (no http, no mailto). */
export function safeImageSource(target: string): string | null {
  const safe = safeLinkTarget(target, false);
  if (safe === null) return null;
  const compact = safe.replace(HIDDEN_CHARACTERS, "").toLowerCase();
  return compact.startsWith("http:") ? null : safe;
}
