/**
 * Maps a raw Luma guest-list export onto participant drafts for the Impact Lab
 * importer. Luma's export is one row per registrant with the event's custom
 * registration questions as literal header strings; only guests with
 * `approval_status === "approved"` are eligible — everyone else (waitlist,
 * declined, pending) is dropped and counted so the organiser sees the split.
 *
 * Two Luma form shapes are supported: the July form (original questions —
 * fixed track choice, team-mate emails, "full night" commitment) and the 02
 * form used for the 2 Sep event (open territory pick, free-text team names,
 * "full day" commitment). Each mapped field prefers whichever form's column
 * is actually present, so a row from either export lands on the same
 * participant shape. See QUESTION_PREFIXES for the header-prefix map.
 *
 * All values are clamped client-side to the participant schema's limits —
 * a single over-long free-text answer must not fail the whole row server-side.
 */

/** Columns that identify a Luma guest export (vs our own Export format). */
const LUMA_SIGNATURE = ["guest_id", "approval_status"]

/**
 * Luma question headers we map, matched case-insensitively by prefix so minor
 * wording tweaks in the Luma form don't silently break the import. Each key
 * lists every known prefix across form versions; `findColumn` picks the
 * first header that matches any of them, so a row from either the July form
 * or the 02 form (2 Sep event) resolves to the same field.
 */
const QUESTION_PREFIXES = {
  // July form
  experience: ["what is your experience level with claude code"],
  capabilities: ["which claude code capabilities are you most interested"],
  institution: ["where do you work or study"],
  role: ["what is your role?"],
  track: ["your track - each carries one fixed problem"],
  trackSecond: ["second choice, if your first track fills up"],
  demoSlice: ["what will exist and work by"],
  teammates: ["if you have team-mates"],
  fullNight: ["can you commit to the full night"],
  // 02 form (2 Sep event)
  whatsapp: ["whatsapp number with country code"],
  territory: ["build tracks are announced sat 30 aug"],
  teamStatus: ["team status"],
  teamNames: ["if you have a team, name them"],
  fullDay: ["i'm in for the full day"],
  buildingFor: ["who exactly are you building for"],
  smallestSlice: ["smallest slice:"],
  buildEvidence: ["build evidence:"],
  consoleOrgQuestion: ["do you have a console.anthropic.com account"],
} as const

type QuestionKey = keyof typeof QUESTION_PREFIXES

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g

// Splits a free-text team-mate list on common separators, including the
// word "and" used as a conjunction (the 02 form's teammate field has no
// other delimiter convention).
const TEAM_FRAGMENT_SPLIT = /[,;&/\n]|\band\b/gi

// participant-schema.ts limits — kept in sync manually (the zod schema is the
// source of truth; these only pre-clamp so rows survive validation).
const MAX_NAME = 120
const MAX_PHONE = 30
const MAX_INSTITUTION = 120
const MAX_ROLE = 60
const MAX_TOKEN = 80
const MAX_TOKENS = 30
const MAX_IDEAS = 2000

/** A resolvable teammate name-column candidate: an approved guest's own row. */
interface Candidate {
  email: string
  nameLower: string
  tokens: string[]
}

/** A fragment of a "name them" free-text answer that could not be resolved
 * to exactly one approved guest — reported to the organiser, never guessed. */
interface UnresolvedTeammate {
  email: string
  fragment: string
}

export interface LumaImportResult {
  drafts: Record<string, unknown>[]
  approved: number
  notApproved: number
  missingEmail: number
  /** Free-text team-name resolution stats (02 form's "Team status" +
   * "name them" columns; always zero for a July-form export). */
  teammates: {
    rowsWithTeam: number
    resolved: number
    unresolved: UnresolvedTeammate[]
  }
  /** Console-org self-report, for check-in desk staffing (02 form only;
   * not stored on the participant — there is no schema field for it). */
  consoleOrg: {
    withOrg: number
    personalOnly: number
    notYet: number
  }
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

/** Turns free text into a single lowercase-hyphenated slug token. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Maps the 02 form's open territory question to zero or one interest slug.
 * "Wherever the strongest problem is" is deliberately mapped to no interest
 * — it signals no preference, and forcing an alignment would be false. */
function mapTerritory(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  const lower = trimmed.toLowerCase()
  if (lower.startsWith("wherever")) return []

  const KNOWN_TERRITORIES: Record<string, string> = {
    "work and jobs": "work-and-jobs",
    "family, kids, community": "family-kids-community",
    "rules and trust": "rules-and-trust",
  }
  const slug = KNOWN_TERRITORIES[lower] ?? slugify(trimmed)
  return slug ? [clamp(slug, MAX_TOKEN)] : []
}

/** Composes the free-text project-idea field from whichever form's questions
 * answered it. The 02 form asks "who for" and "smallest slice" separately;
 * the July form asked one combined "what will exist and work by" question. */
function buildProjectIdeas(
  demoSlice: string,
  buildingFor: string,
  smallestSlice: string
): string | null {
  const parts: string[] = []
  if (buildingFor) parts.push(`For: ${buildingFor}.`)
  if (smallestSlice) parts.push(`Slice: ${smallestSlice}.`)
  if (parts.length > 0) return clamp(parts.join(" "), MAX_IDEAS)
  return demoSlice ? clamp(demoSlice, MAX_IDEAS) : null
}

/** Splits a "name them" free-text answer into candidate name fragments,
 * stripping phone numbers, titles, and junk short enough to be noise. */
function splitTeamFragments(text: string): string[] {
  return text
    .split(TEAM_FRAGMENT_SPLIT)
    .map((raw) =>
      raw
        .replace(/[0-9+()-]/g, "")
        .replace(/\bdr\.?\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((fragment) => fragment.replace(/[^a-z]/gi, "").length >= 3)
}

/**
 * Resolves one free-text name fragment to exactly one approved guest's
 * email, in order of confidence: exact full-name match, then every token of
 * the fragment present in the candidate's name, then a unique first-name
 * match. Any stage that turns up more than one candidate stops there —
 * ambiguity is reported, never guessed past.
 */
function resolveFragment(fragment: string, candidates: Candidate[]): string | null {
  const fragmentLower = fragment.toLowerCase().trim()
  if (!fragmentLower) return null
  const fragmentTokens = fragmentLower.split(/\s+/).filter(Boolean)

  const exactMatches = candidates.filter((c) => c.nameLower === fragmentLower)
  if (exactMatches.length === 1) return exactMatches[0].email
  if (exactMatches.length > 1) return null

  if (fragmentTokens.length >= 2) {
    const subsetMatches = candidates.filter((c) =>
      fragmentTokens.every((t) => c.tokens.includes(t))
    )
    if (subsetMatches.length === 1) return subsetMatches[0].email
    if (subsetMatches.length > 1) return null
  }

  if (fragmentTokens.length === 1) {
    const firstNameMatches = candidates.filter((c) => c.tokens[0] === fragmentTokens[0])
    if (firstNameMatches.length === 1) return firstNameMatches[0].email
  }

  return null
}

export function mapLumaRows(headers: string[], rows: string[][]): LumaImportResult {
  const lower = headers.map((h) => h.trim().toLowerCase())
  const col = (name: string) => lower.indexOf(name)
  const findColumn = (prefixes: readonly string[]) =>
    lower.findIndex((h) => prefixes.some((p) => h.startsWith(p)))

  const iName = col("name")
  const iEmail = col("email")
  const iPhone = col("phone_number")
  const iStatus = col("approval_status")
  const q = Object.fromEntries(
    Object.entries(QUESTION_PREFIXES).map(([key, prefixes]) => [key, findColumn(prefixes)])
  ) as Record<QuestionKey, number>

  let approved = 0
  let notApproved = 0
  let missingEmail = 0
  let withOrg = 0
  let personalOnly = 0
  let notYet = 0

  interface ApprovedRow {
    row: string[]
    email: string
    name: string
  }
  const approvedRows: ApprovedRow[] = []

  for (const row of rows) {
    const get = (i: number) => (i >= 0 ? (row[i] ?? "").trim() : "")

    if (get(iStatus).toLowerCase() !== "approved") {
      notApproved++
      continue
    }
    approved++

    // Console-org self-report is a check-in-desk headcount, not a
    // participant field — counted for every approved guest, including the
    // rare one dropped below for a missing email.
    const consoleAnswer = get(q.consoleOrgQuestion).toLowerCase()
    if (consoleAnswer.startsWith("yes, with an organization")) withOrg++
    else if (consoleAnswer.startsWith("yes, personal")) personalOnly++
    else if (consoleAnswer.startsWith("not yet")) notYet++

    const email = get(iEmail)
    if (!email) {
      missingEmail++
      continue
    }

    approvedRows.push({ row, email, name: clamp(get(iName), MAX_NAME) || email })
  }

  // Built once, up front, so team-name resolution can match a fragment
  // against every approved guest, not just rows seen so far.
  const candidates: Candidate[] = approvedRows.map(({ email, name }) => {
    const nameLower = name.toLowerCase().replace(/\s+/g, " ").trim()
    return { email, nameLower, tokens: nameLower.split(" ").filter(Boolean) }
  })

  const drafts: Record<string, unknown>[] = []
  let rowsWithTeam = 0
  let teammatesResolved = 0
  const unresolved: UnresolvedTeammate[] = []

  for (const { row, email, name } of approvedRows) {
    const get = (i: number) => (i >= 0 ? (row[i] ?? "").trim() : "")

    const interests =
      q.territory >= 0
        ? mapTerritory(get(q.territory))
        : [get(q.track), get(q.trackSecond)].map((v) => clamp(v, MAX_TOKEN)).filter(Boolean)

    // The 02 form asks no experience-level question directly; "build
    // evidence" containing a link is used as a heuristic stand-in. The July
    // form's explicit answer, when present, always wins.
    const experienceAnswer = get(q.experience)
    const experienceLevel = experienceAnswer
      ? mapExperience(experienceAnswer)
      : /http/i.test(get(q.buildEvidence))
        ? "INTERMEDIATE"
        : "BEGINNER"

    const availability = [
      /^yes/i.test(get(q.fullNight)) ? "full-night" : null,
      /^yes/i.test(get(q.fullDay)) ? "full-day" : null,
    ].filter((v): v is string => v !== null)

    const projectIdeas = buildProjectIdeas(
      get(q.demoSlice),
      get(q.buildingFor),
      get(q.smallestSlice)
    )

    const oldTeammatesText = get(q.teammates)
    const newTeammatesText = get(q.teamNames)
    const teamStatusText = get(q.teamStatus)

    const preferredTeammates = new Set<string>([
      ...(oldTeammatesText.match(EMAIL_PATTERN) ?? []),
      ...(newTeammatesText.match(EMAIL_PATTERN) ?? []),
    ])

    if (q.teamStatus >= 0 && /^i have a team/i.test(teamStatusText)) {
      rowsWithTeam++
      const fragments = splitTeamFragments(newTeammatesText).filter((f) => !f.includes("@"))
      for (const fragment of fragments) {
        const resolvedEmail = resolveFragment(fragment, candidates)
        if (resolvedEmail) {
          teammatesResolved++
          if (resolvedEmail.toLowerCase() !== email.toLowerCase()) {
            preferredTeammates.add(resolvedEmail)
          }
        } else {
          unresolved.push({ email, fragment })
        }
      }
    }

    drafts.push({
      fullName: name,
      email,
      phone: clamp(get(iPhone) || get(q.whatsapp), MAX_PHONE) || null,
      institution: clamp(get(q.institution), MAX_INSTITUTION) || null,
      experienceLevel,
      primaryRole: clamp(get(q.role), MAX_ROLE) || "Participant",
      secondaryRoles: [],
      technicalSkills: tokens(get(q.capabilities)),
      interests,
      availability,
      projectIdeas,
      preferredTeammates: [...preferredTeammates].slice(0, MAX_TOKENS),
      blockedTeammates: [],
      // Organiser decision (2026-07-24): everyone approved registered for a
      // team-formation event, so everyone is matchable. Pre-formed teams stay
      // together via their declared teammate emails (the engine's
      // keep-together groups), not by exclusion.
      // Contact sharing is opt-in from the participant's own profile
      // (schema default false) — the onboarding blast tells builders it is
      // off unless they turn it on themselves, so a guest-list import must
      // not flip it on for them.
      consentToMatch: true,
      consentToShareContact: false,
    })
  }

  return {
    drafts,
    approved,
    notApproved,
    missingEmail,
    teammates: { rowsWithTeam, resolved: teammatesResolved, unresolved },
    consoleOrg: { withOrg, personalOnly, notYet },
  }
}
