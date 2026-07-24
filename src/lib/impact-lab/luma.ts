/**
 * Maps a raw Luma guest-list export onto participant drafts for the Impact Lab
 * importer. Luma's export is one row per registrant with the event's custom
 * registration questions as literal header strings; only guests with
 * `approval_status === "approved"` are eligible — everyone else (waitlist,
 * declined, pending) is dropped and counted so the organiser sees the split.
 *
 * All values are clamped client-side to the participant schema's limits —
 * a single over-long free-text answer must not fail the whole row server-side.
 */

/** Columns that identify a Luma guest export (vs our own Export format). */
const LUMA_SIGNATURE = ["guest_id", "approval_status"]

/** Luma question headers we map. Matched case-insensitively by prefix so minor
 * wording tweaks in the Luma form don't silently break the import. */
const QUESTION_PREFIXES = {
  experience: "what is your experience level with claude code",
  capabilities: "which claude code capabilities are you most interested",
  institution: "where do you work or study",
  role: "what is your role?",
  track: "your track - each carries one fixed problem",
  trackSecond: "second choice, if your first track fills up",
  demoSlice: "what will exist and work by",
  teammates: "if you have team-mates",
  fullNight: "can you commit to the full night",
} as const

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g

// participant-schema.ts limits — kept in sync manually (the zod schema is the
// source of truth; these only pre-clamp so rows survive validation).
const MAX_NAME = 120
const MAX_PHONE = 30
const MAX_INSTITUTION = 120
const MAX_ROLE = 60
const MAX_TOKEN = 80
const MAX_TOKENS = 30
const MAX_IDEAS = 2000

export interface LumaImportResult {
  drafts: Record<string, unknown>[]
  approved: number
  notApproved: number
  missingEmail: number
}

export function isLumaExport(headers: string[]): boolean {
  const lower = headers.map((h) => h.trim().toLowerCase())
  return LUMA_SIGNATURE.every((sig) => lower.includes(sig))
}

function clamp(value: string, max: number): string {
  return value.trim().slice(0, max)
}

function tokens(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((s) => clamp(s, MAX_TOKEN))
    .filter(Boolean)
    .slice(0, MAX_TOKENS)
}

function mapExperience(answer: string): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" {
  const a = answer.toLowerCase()
  if (a.startsWith("daily")) return "ADVANCED"
  if (a.startsWith("regular")) return "INTERMEDIATE"
  return "BEGINNER"
}

export function mapLumaRows(headers: string[], rows: string[][]): LumaImportResult {
  const lower = headers.map((h) => h.trim().toLowerCase())
  const col = (name: string) => lower.indexOf(name)
  const question = (prefix: string) => lower.findIndex((h) => h.startsWith(prefix))

  const iName = col("name")
  const iEmail = col("email")
  const iPhone = col("phone_number")
  const iStatus = col("approval_status")
  const q = Object.fromEntries(
    Object.entries(QUESTION_PREFIXES).map(([key, prefix]) => [key, question(prefix)])
  ) as Record<keyof typeof QUESTION_PREFIXES, number>

  const drafts: Record<string, unknown>[] = []
  let approved = 0
  let notApproved = 0
  let missingEmail = 0

  for (const row of rows) {
    const get = (i: number) => (i >= 0 ? (row[i] ?? "").trim() : "")

    if (get(iStatus).toLowerCase() !== "approved") {
      notApproved++
      continue
    }
    approved++

    const email = get(iEmail)
    if (!email) {
      missingEmail++
      continue
    }

    const interests = [get(q.track), get(q.trackSecond)]
      .map((v) => clamp(v, MAX_TOKEN))
      .filter(Boolean)

    drafts.push({
      fullName: clamp(get(iName), MAX_NAME) || email,
      email,
      phone: clamp(get(iPhone), MAX_PHONE) || null,
      institution: clamp(get(q.institution), MAX_INSTITUTION) || null,
      experienceLevel: mapExperience(get(q.experience)),
      primaryRole: clamp(get(q.role), MAX_ROLE) || "Participant",
      secondaryRoles: [],
      technicalSkills: tokens(get(q.capabilities)),
      interests,
      availability: /^yes/i.test(get(q.fullNight)) ? ["full-night"] : [],
      projectIdeas: clamp(get(q.demoSlice), MAX_IDEAS) || null,
      preferredTeammates: (get(q.teammates).match(EMAIL_PATTERN) ?? []).slice(0, MAX_TOKENS),
      blockedTeammates: [],
      // Organiser decision (2026-07-24): everyone approved registered for a
      // team-formation event, so everyone is matchable and teammates may see
      // each other's contact details. Pre-formed teams stay together via
      // their declared teammate emails (the engine's keep-together groups),
      // not by exclusion. Individuals can still opt out from their profile.
      consentToMatch: true,
      consentToShareContact: true,
    })
  }

  return { drafts, approved, notApproved, missingEmail }
}
