const TRUE_VALUES = new Set(["true", "1", "yes"]);

export function isKaribuEnabled(): boolean {
  return TRUE_VALUES.has((process.env.KARIBU_ENABLED ?? "").toLowerCase());
}

export function isKaribuCanaryHit(visitorCookieId: string): boolean {
  const pct = Math.max(0, Math.min(100, Number(process.env.KARIBU_CANARY_PCT ?? "100")));
  if (pct === 0) return false;
  if (pct >= 100) return true;
  let hash = 0;
  for (let i = 0; i < visitorCookieId.length; i++) {
    hash = (hash * 31 + visitorCookieId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100 < pct;
}
