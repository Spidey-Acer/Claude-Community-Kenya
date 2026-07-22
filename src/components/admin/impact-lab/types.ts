import type { MatchResult, TeamExplanation } from "@/lib/matching"

export type { MatchResult, TeamExplanation }

/** A participant row as returned by GET /participants (the Prisma shape we use). */
export interface ParticipantRow {
  id: string
  cohort: string
  fullName: string
  email: string
  phone: string | null
  institution: string | null
  experienceLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  primaryRole: string
  secondaryRoles: string[]
  technicalSkills: string[]
  interests: string[]
  availability: string[]
  projectIdeas: string | null
  preferredTeammates: string[]
  blockedTeammates: string[]
  consentToMatch: boolean
  consentToShareContact: boolean
}

/** Slim participant directory returned alongside a match result. */
export interface DirectoryParticipant {
  id: string
  fullName: string
  email: string
  primaryRole: string
  experienceLevel: string
  consentToShareContact: boolean
}

export interface MatchResponse {
  result: MatchResult
  participants: DirectoryParticipant[]
  /** Content signature of the generated result, echoed back on save/explain. */
  signature: string
}

export interface RunSummary {
  id: string
  name: string
  notes: string | null
  isFinal: boolean
  createdAt: string
  teamCount: number
  averageScore: number
  unassignedCount: number
}
