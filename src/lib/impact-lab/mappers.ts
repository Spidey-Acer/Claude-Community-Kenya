/**
 * Maps Prisma rows into the matching engine's plain input types. This is the
 * boundary the engine's purity depends on: the DB layer knows about the engine's
 * types, never the other way round.
 */

import type { ImpactLabParticipant } from "@/generated/prisma/client"
import type { ExperienceLevel, MatchParticipant } from "@/lib/matching"

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
