export const AUDIENCES = ["dev", "non_tech_pro", "student", "founder", "creator"] as const;
export type Audience = typeof AUDIENCES[number];

export const INTENTS = [
  "learn_basics",
  "find_event",
  "find_collaborators",
  "build",
  "hire_or_partner",
  "other",
] as const;
export type Intent = typeof INTENTS[number];

export const EXPERIENCES = ["never_used", "claude_ai", "claude_code", "api_builder"] as const;
export type Experience = typeof EXPERIENCES[number];

export const AUDIENCE_COOKIE_VALUES = [...AUDIENCES, "skipped"] as const;
export type AudienceCookieValue = typeof AUDIENCE_COOKIE_VALUES[number];

/**
 * Type guard — returns true if `v` is a valid {@link Audience} value.
 * Used to safely narrow unknown cookie/query-param values before use.
 */
export function isAudience(v: unknown): v is Audience {
  return typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);
}

/**
 * Type guard — returns true if `v` is a valid {@link AudienceCookieValue}
 * (i.e. one of the audience slugs OR the sentinel "skipped").
 * Used when reading the karibu cookie to handle the skip path gracefully.
 */
export function isAudienceCookieValue(v: unknown): v is AudienceCookieValue {
  return typeof v === "string" && (AUDIENCE_COOKIE_VALUES as readonly string[]).includes(v);
}
