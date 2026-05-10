const TRUE_VALUES = new Set(["true", "1", "yes"]);

/**
 * Returns true when the Karibu onboarding feature is active.
 * Reads KARIBU_ENABLED env var; accepts "true", "1", or "yes" (case-insensitive).
 */
export function isKaribuEnabled(): boolean {
  return TRUE_VALUES.has((process.env.KARIBU_ENABLED ?? "").toLowerCase());
}

/**
 * Deterministically buckets a visitor into the canary cohort using a
 * 32-bit polynomial hash of the cookie id modulo 100.
 *
 * @param visitorCookieId - The cck-visitor UUID. Empty string returns false.
 * @returns true when the visitor falls within KARIBU_CANARY_PCT percent of all visitors.
 */
export function isKaribuCanaryHit(visitorCookieId: string): boolean {
  if (!visitorCookieId) return false;
  const raw = Number(process.env.KARIBU_CANARY_PCT ?? "100");
  const pct = Number.isNaN(raw) ? 100 : Math.max(0, Math.min(100, raw));
  if (pct === 0) return false;
  if (pct >= 100) return true;
  let hash = 0;
  for (let i = 0; i < visitorCookieId.length; i++) {
    hash = (hash * 31 + visitorCookieId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100 < pct;
}
