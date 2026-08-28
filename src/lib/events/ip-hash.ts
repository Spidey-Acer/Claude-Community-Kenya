// Server-only IP hashing for public event participation submissions
// (Conversations Live Q&A and problem-statement contributions).
//
// Split out of src/lib/events/participation.ts on purpose: that module also
// exports KENYA_COUNTIES and the MAX_* length constants, which the public
// contribute/question forms (client components) need directly. Node's
// `crypto` has no browser build, so a client component importing anything
// from a module that pulls in `crypto` at top level fails to bundle. Keeping
// the two exports apart means participation.ts stays import-safe for client
// code while this file stays server-only.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { createHash } from "crypto"

/**
 * Hashes a submitter's IP for daily-cap enforcement without ever persisting
 * the raw address. Fails loudly when the salt is missing rather than hashing
 * with `undefined` — an unsalted or constant hash would let anyone compute
 * ipHash collisions and defeat the per-IP cap.
 *
 * @param ip - The request's originating IP address.
 * @returns A 64-character lowercase hex sha256 digest, safe to store in the
 *   `ipHash` column on EventQuestion / EventContribution.
 * @throws {Error} If `SUBMISSION_IP_SALT` is not set in the environment.
 */
export function hashSubmitterIp(ip: string): string {
  const salt = process.env.SUBMISSION_IP_SALT
  if (!salt) {
    throw new Error(
      "SUBMISSION_IP_SALT is not set — refusing to hash a submitter IP without a salt."
    )
  }
  return createHash("sha256").update(ip + salt).digest("hex")
}
