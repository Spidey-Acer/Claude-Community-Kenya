/**
 * Member-facing Impact Lab surface: the session + email-verification gate, the
 * member-editable subset of the participant schema, and the safe view types the
 * member API returns. Admin routes use RBAC (`@/lib/rbac`) instead — never this.
 *
 * Client components may `import type` from here, but must never value-import
 * (checkMemberAccess pulls in auth + Prisma, which are server-only).
 */

import { NextResponse } from "next/server"
import type { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { ImpactLabParticipant } from "@/generated/prisma/client"
import type { Team } from "@/lib/matching"
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/email-verification"
import { participantDraftSchema } from "./participant-schema"

// ─── Member-editable profile ─────────────────────────────────────────────────

/**
 * The subset of the participant schema a member may edit. `email` and `cohort`
 * are identity (set by the admin Luma import) and are deliberately excluded;
 * phone and institution stay import-owned too.
 */
export const memberProfileSchema = participantDraftSchema.pick({
  fullName: true,
  experienceLevel: true,
  primaryRole: true,
  secondaryRoles: true,
  technicalSkills: true,
  interests: true,
  availability: true,
  projectIdeas: true,
  preferredTeammates: true,
  blockedTeammates: true,
  consentToMatch: true,
  consentToShareContact: true,
})

export type MemberProfileInput = z.infer<typeof memberProfileSchema>

/** A member's own participant row, as returned by GET/PUT /api/impact-lab/profile. */
export interface MemberProfile {
  fullName: string
  email: string
  phone: string | null
  institution: string | null
  experienceLevel: ImpactLabParticipant["experienceLevel"]
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

/**
 * Explicit projection of a member's OWN row (their blocked/preferred lists are
 * their own input, so they see them). Never use for someone else's row.
 */
export function toMemberProfile(row: ImpactLabParticipant): MemberProfile {
  return {
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    institution: row.institution,
    experienceLevel: row.experienceLevel,
    primaryRole: row.primaryRole,
    secondaryRoles: row.secondaryRoles,
    technicalSkills: row.technicalSkills,
    interests: row.interests,
    availability: row.availability,
    projectIdeas: row.projectIdeas,
    preferredTeammates: row.preferredTeammates,
    blockedTeammates: row.blockedTeammates,
    consentToMatch: row.consentToMatch,
    consentToShareContact: row.consentToShareContact,
  }
}

// ─── Team reveal views ───────────────────────────────────────────────────────

/** Discriminator for GET /api/impact-lab/team responses. */
export type MemberTeamStatus =
  | "not_registered"
  | "pending"
  | "unassigned"
  | "revealed"

export interface TeamMemberView {
  id: string
  fullName: string
  primaryRole: string
  suggestedInternalRole: string | null
  isSelf: boolean
  /** Only set for self, or for teammates with consentToShareContact = true. */
  email: string | null
}

/** A member's finalized team — no scores, no snapshot leakage. */
export interface TeamRevealView {
  teamName: string
  members: TeamMemberView[]
  /** The saved (usually Claude-written) team writeup, addressed to the team. */
  summary: string | null
  strengths: string[]
  projectDirection: string | null
}

/**
 * The frozen run `result` column is admin-authored JSON, not schema-enforced —
 * guard the shape the member surface reads (teams as arrays of string
 * memberIds) before use, so a drifted or legacy run degrades to the pending /
 * waiting state instead of throwing during render. Returns null when malformed.
 */
export function extractFrozenTeams(result: unknown): Team[] | null {
  if (typeof result !== "object" || result === null) return null
  const teams = (result as { teams?: unknown }).teams
  if (!Array.isArray(teams)) return null
  for (const team of teams) {
    if (typeof team !== "object" || team === null) return null
    const memberIds = (team as { memberIds?: unknown }).memberIds
    if (!Array.isArray(memberIds) || memberIds.some((id) => typeof id !== "string")) {
      return null
    }
  }
  return teams as Team[]
}

// ─── Access gate ─────────────────────────────────────────────────────────────

export type MemberAccessResult =
  | {
      authorized: true
      /** Session email, lowercased — participant emails are stored sanitized. */
      email: string
    }
  | { authorized: false; response: NextResponse }

/**
 * Session + verified-email gate for the member Impact Lab routes. Verification
 * is required so an unverified account cannot claim someone else's Luma email.
 * The 403 carries `code: "EMAIL_UNVERIFIED"` so the UI can show the verify flow.
 */
export async function checkMemberAccess(): Promise<MemberAccessResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      ),
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { emailVerified: true },
  })
  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      ),
    }
  }
  if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Please verify your email address first.",
          code: "EMAIL_UNVERIFIED",
        },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, email: session.user.email.toLowerCase() }
}
