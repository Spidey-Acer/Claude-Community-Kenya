/**
 * Maps Prisma rows into the matching engine's plain input types. This is the
 * boundary the engine's purity depends on: the DB layer knows about the engine's
 * types, never the other way round.
 */

import type { ImpactLabParticipant } from "@/generated/prisma/client"
import type { ExperienceLevel, MatchParticipant, RematchParticipant } from "@/lib/matching"

export function toMatchParticipant(
  row: ImpactLabParticipant
): MatchParticipant {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    experienceLevel: row.experienceLevel as ExperienceLevel,
    primaryRole: row.primaryRole,
    secondaryRoles: row.secondaryRoles,
    technicalSkills: row.technicalSkills,
    interests: row.interests,
    availability: row.availability,
    preferredTeammates: row.preferredTeammates,
    blockedTeammates: row.blockedTeammates,
    consentToMatch: row.consentToMatch,
  }
}

/**
 * Like `toMatchParticipant`, plus the one fact the rematch engine needs: is
 * this person physically at the event right now. The null check happens here
 * — at the DB boundary — so the pure rematch logic never reads a Date.
 */
export function toRematchParticipant(
  row: ImpactLabParticipant
): RematchParticipant {
  return { ...toMatchParticipant(row), checkedIn: row.checkedInAt !== null }
}
