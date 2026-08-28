// Shared constants for public event participation (Conversations Live Q&A
// and problem-statement contributions). Consumed by the zod schemas and API
// routes under src/app/api/events/[slug]/{questions,contributions}, and
// directly by the county picker + char-count on the public contribute forms
// (client components) — so this file must stay free of server-only imports.
// `hashSubmitterIp` lives in the sibling src/lib/events/ip-hash.ts instead:
// it needs Node's `crypto`, which has no browser build and would break any
// client bundle that imported it transitively through this module.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

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
