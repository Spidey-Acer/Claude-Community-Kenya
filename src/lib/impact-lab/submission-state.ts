/**
 * Pure logic behind Impact Lab project submissions: whether the window is
 * open, which team a participant belongs to, which teams still owe a
 * submission, and the judging CSV row shape.
 *
 * Deliberately free of Prisma, Next and the clock — every function takes what
 * it needs as an argument, so scripts/verify-submissions.ts can assert all of
 * it without a database.
 */

import type { Team } from "@/lib/matching"
import type { CsvCell } from "@/lib/impact-lab/csv"

export type SubmissionWindowState = "open" | "closed"

export interface TeamRef {
  teamId: string
  teamName: string
}

export interface MissingTeam {
  teamId: string
  teamName: string
  /** Display names where known, raw participant ids otherwise. */
  members: string[]
}

/**
 * Is the submission window open? A null deadline means open indefinitely. The
 * boundary is inclusive: at exactly the deadline, submissions are closed.
 */
export function submissionWindow(
  closeAt: Date | null,
  now: Date
): SubmissionWindowState {
  if (!closeAt) return "open"
  return now.getTime() >= closeAt.getTime() ? "closed" : "open"
}

/** The team holding this participant, or null when they are unassigned. */
export function findTeamFor(teams: Team[], participantId: string): TeamRef | null {
  const found = teams.find((t) => t.memberIds.includes(participantId))
  return found ? { teamId: found.id, teamName: found.name } : null
}

/**
 * Teams with no submission yet, with member names so organisers can chase them
 * in the room. Unknown ids fall back to the raw id rather than being dropped —
 * a missing name must never hide a missing team.
 */
export function missingTeams(
  teams: Team[],
  submittedTeamIds: Set<string>,
  nameById: Map<string, string>
): MissingTeam[] {
  return teams
    .filter((t) => !submittedTeamIds.has(t.id))
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      members: t.memberIds.map((id) => nameById.get(id) ?? id),
    }))
}

export interface SubmissionCsvInput {
  teamName: string
  projectName: string
  pitch: string
  track: string
  problemTackled: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
  screenshotUrl: string | null
  status: string
  memberNames: string[]
  /** Only teammates whose live row consents to sharing contact. */
  memberEmails: string[]
  lastEditedByEmail: string
  updatedAt: Date
}

export const SUBMISSION_CSV_HEADERS: string[] = [
  "Team",
  "Project",
  "Pitch",
  "Track",
  "Problem",
  "Description",
  "What works vs mocked",
  "How they used AI",
  "Repo",
  "Demo",
  "Video",
  "Slides",
  "Screenshot",
  "Status",
  "Members",
  "Member emails (consented)",
  "Last edited by",
  "Last updated",
]

/**
 * One judging row. Multi-values join with "; " to match the participants and
 * teams exports. Formula-injection escaping is toCsv's job, not this
 * function's — a pitch of "=SUM(A1:A9)" passes through unchanged here.
 */
export function submissionCsvRow(input: SubmissionCsvInput): CsvCell[] {
  return [
    input.teamName,
    input.projectName,
    input.pitch,
    input.track,
    input.problemTackled,
    input.description,
    input.worksVsMocked,
    input.claudeUsage,
    input.repoUrl,
    input.demoUrl ?? "",
    input.videoUrl ?? "",
    input.slidesUrl ?? "",
    input.screenshotUrl ?? "",
    input.status,
    input.memberNames.join("; "),
    input.memberEmails.join("; "),
    input.lastEditedByEmail,
    input.updatedAt.toISOString(),
  ]
}
