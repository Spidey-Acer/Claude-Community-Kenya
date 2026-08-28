// Shared constants and helpers for public event participation (Conversations
// Live Q&A and problem-statement contributions). Consumed by the zod schemas
// and API routes under src/app/api/events/[id]/{questions,contributions} and
// by the county picker on the public contribute forms.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import { createHash } from "crypto"

/** All 47 Kenyan counties, alphabetical, official Constitution (First
 * Schedule) names. Used to validate `county` on every public submission —
 * server-side, not just as a UI picker. */
export const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
] as const

export type KenyaCounty = (typeof KENYA_COUNTIES)[number]

/** Matches EventQuestion.body @db.VarChar(500) in schema.prisma. */
export const MAX_QUESTION_LENGTH = 500

/** Matches EventContribution.body @db.VarChar(600) in schema.prisma. */
export const MAX_CONTRIBUTION_LENGTH = 600

/** Matches submitterName @db.VarChar(80) on both submission models. */
export const MAX_NAME_LENGTH = 80

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
