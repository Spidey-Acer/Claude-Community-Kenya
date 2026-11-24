/**
 * Keyed hash of a guest email, the only form of an email the attending-card
 * feature ever stores or compares.
 *
 * HMAC-SHA-256 over the trimmed, lowercased address, keyed by the env var
 * ATTENDING_HMAC_KEY. The key lives in the deployment, never in the database,
 * so a leaked guest table cannot be checked against guessed emails.
 *
 * Fails closed: with no key there is no hash, and callers (import and lookup)
 * must refuse to store or match anything.
 */
import { createHmac } from "node:crypto"

/** Longest email address accepted anywhere in this feature (RFC 5321 path limit). */
export const MAX_EMAIL_LENGTH = 254

/** Thrown when ATTENDING_HMAC_KEY is unset or blank. */
export class MissingHmacKeyError extends Error {
  constructor() {
    super("ATTENDING_HMAC_KEY is not configured")
    this.name = "MissingHmacKeyError"
  }
}

/** The canonical form that gets hashed: trimmed and lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Hex HMAC-SHA-256 of the normalised email. Throws MissingHmacKeyError with no key. */
export function hmacEmail(email: string): string {
  const key = process.env.ATTENDING_HMAC_KEY
  if (!key || key.trim() === "") throw new MissingHmacKeyError()
  return createHmac("sha256", key).update(normalizeEmail(email)).digest("hex")
}
