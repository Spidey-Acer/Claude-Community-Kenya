/**
 * Keyed hash of a guest email, the only form of an email the attending-card
 * feature ever stores or compares.
 *
 * HMAC-SHA-256 over the trimmed, lowercased address, keyed by the env var
 * ATTENDING_HMAC_KEY. The key lives in the deployment, never in the database,
 * so a leaked guest table cannot be checked against guessed emails.
 *
 * Fails closed: with no key (or one under 32 characters) there is no hash, and callers (import and lookup)
 * must refuse to store or match anything.
 */
import { createHmac } from "node:crypto"

/** Longest email address accepted anywhere in this feature (RFC 5321 path limit). */
export const MAX_EMAIL_LENGTH = 254

/** Shortest key accepted, after trimming. 32 characters is `openssl rand -hex 16`; the docs advise `-hex 32`. */
export const MIN_HMAC_KEY_LENGTH = 32

/** Thrown when ATTENDING_HMAC_KEY is unset, blank, or shorter than MIN_HMAC_KEY_LENGTH. */
export class MissingHmacKeyError extends Error {
  constructor() {
    super(`ATTENDING_HMAC_KEY is missing or shorter than ${MIN_HMAC_KEY_LENGTH} characters`)
    this.name = "MissingHmacKeyError"
  }
}

/** The canonical form that gets hashed: trimmed and lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Hex HMAC-SHA-256 of the normalised email. Throws MissingHmacKeyError with a missing, blank or short key. */
export function hmacEmail(email: string): string {
  const key = process.env.ATTENDING_HMAC_KEY?.trim()
  if (!key || key.length < MIN_HMAC_KEY_LENGTH) throw new MissingHmacKeyError()
  return createHmac("sha256", key).update(normalizeEmail(email)).digest("hex")
}
