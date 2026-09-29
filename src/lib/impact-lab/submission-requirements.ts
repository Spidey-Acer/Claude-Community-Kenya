/**
 * Per-cohort submission requirements.
 *
 * The default profile (every cohort not named below) keeps the Impact Lab
 * ruling: slidesUrl is the only required field, because that cohort mixed
 * hardware, biotech and media teams who could not all point at a repo. The
 * 2 Sep 2026 cohort ("impact-lab-2026-09") is a Claude Code hackathon where
 * every team ships software with a live demo, so the organiser's ruling
 * there is the opposite: the demo is the evidence, slides are optional, and
 * seven fields judges actually score from are required.
 *
 * `submissionRequirementsForCohort` is consumed on both ends of the same
 * contract: `submission-schema.ts` turns it into a Zod schema for
 * validation, and the member GET/PUT routes forward the plain data (labels,
 * required set, trackSelect) so the form can render without duplicating this
 * table client-side.
 */

import type { SubmissionInput } from "./submission-schema"

export interface SubmissionRequirements {
  /** Fields that must be present and non-empty for this cohort. */
  required: Set<keyof SubmissionInput>
  /** Field → the label shown on the form, overriding the generic default. */
  labels: Partial<Record<keyof SubmissionInput, string>>
  /** Field → the helper text under the input, overriding the form's built-in
   *  hint. Same pattern as `labels`; absent keys keep the built-in hint. */
  hints: Partial<Record<keyof SubmissionInput, string>>
  /** When true, the form renders `track` as a select over the event's tracks
   *  instead of free text. */
  trackSelect: boolean
}

const IMPACT_LAB_2026_09_REQUIRED: ReadonlySet<keyof SubmissionInput> = new Set([
  "projectName",
  "pitch",
  "track",
  "problemTackled",
  "worksVsMocked",
  "claudeUsage",
  "repoUrl",
])

const IMPACT_LAB_2026_09_LABELS: Partial<Record<keyof SubmissionInput, string>> = {
  pitch: "One sentence: who it helps and how",
  problemTackled:
    "This helps ___, who today struggles with ___ (the same sentence as your wall card)",
  worksVsMocked: "What works live, and what is mocked. Be exact; judges check.",
  claudeUsage: "Where Claude sits in the build (what it does, which model, what it must never answer)",
  demoUrl: "Backup video (90 seconds, phone)",
  slidesUrl: "Slides, only if you used any; the demo is live",
}

/**
 * Build Day (19-20 Sep 2026, Anthropic Fable 5.1) is a live-demo event: teams
 * are judged on New Capability, It Works, Keep or Share and Clarity of Demo,
 * all read off the screen during the pitch, not off a deck. Slides cannot be
 * the only required field here for the same reason they weren't for the 2
 * Sep cohort: a deck is not the evidence, the demo is. repoUrl stays
 * required so judges can check worksVsMocked against the source instead of
 * the claim.
 */
const BUILD_DAY_2026_09_REQUIRED: ReadonlySet<keyof SubmissionInput> = new Set([
  "projectName",
  "pitch",
  "track",
  "worksVsMocked",
  "claudeUsage",
  "repoUrl",
])

const BUILD_DAY_2026_09_LABELS: Partial<Record<keyof SubmissionInput, string>> = {
  pitch: "One sentence: what it does and who it is for",
  worksVsMocked: "What works live, and what is mocked. Be exact; judges check.",
  claudeUsage:
    "What Fable 5.1 does here that the previous model could not (the New Capability criterion)",
  repoUrl: "Repository link",
  demoUrl: "Live link, if it is deployed",
  videoUrl: "Backup video (90 seconds, phone), optional",
  slidesUrl: "Slides, only if you used any; the demo is live",
}

/**
 * Payaza x Hackhouse hackathon: a payments build judged on a real slice of the
 * Payaza sandbox, with a pitch deck as the required artefact (repo and demo
 * are optional; some teams are not deployed). Labels and hints reword the
 * generic AI-flavoured copy; stored keys are unchanged, so `claudeUsage`
 * holds "how the build uses Payaza" for this cohort.
 */
const PAYAZA_HACKHOUSE_2026_REQUIRED: ReadonlySet<keyof SubmissionInput> = new Set([
  "projectName",
  "pitch",
  "track",
  "problemTackled",
  "claudeUsage",
  "slidesUrl",
])

const PAYAZA_HACKHOUSE_2026_LABELS: Partial<Record<keyof SubmissionInput, string>> = {
  pitch: "One sentence: who it helps and how",
  track: "Problem area",
  problemTackled: "Who is the user, and what cross-border payment pain do they have today?",
  description: "What it does, and the business case (who pays, and how much)",
  worksVsMocked:
    "What runs on the Payaza sandbox today, and what is mocked. Be exact; judges check.",
  claudeUsage:
    "How your build uses Payaza (checkout, collections, multi-currency, settlement, payouts, webhooks)",
  slidesUrl: "Pitch deck link (Google Slides, Gamma or PDF)",
  repoUrl: "Repo link",
  demoUrl: "Live demo link",
  videoUrl: "Demo video link (backup if the live demo fails)",
}

const PAYAZA_HACKHOUSE_2026_HINTS: Partial<Record<keyof SubmissionInput, string>> = {
  claudeUsage:
    "Name the Payaza products you call and what each does in the money flow. Judges score this.",
  problemTackled: "A specific trader, freelancer or exporter, and what it costs them today.",
  worksVsMocked: "A thin real slice on the sandbox beats a wide fake one.",
}

/** Default profile: today's behaviour, unchanged for every other cohort. */
const DEFAULT_REQUIREMENTS: SubmissionRequirements = {
  required: new Set(["slidesUrl"]),
  labels: {},
  hints: {},
  trackSelect: false,
}

const REQUIREMENTS_BY_COHORT: Readonly<Record<string, SubmissionRequirements>> = {
  "impact-lab-2026-09": {
    required: IMPACT_LAB_2026_09_REQUIRED as Set<keyof SubmissionInput>,
    labels: IMPACT_LAB_2026_09_LABELS,
    hints: {},
    trackSelect: true,
  },
  "build-day-2026-09": {
    required: BUILD_DAY_2026_09_REQUIRED as Set<keyof SubmissionInput>,
    labels: BUILD_DAY_2026_09_LABELS,
    hints: {},
    trackSelect: true,
  },
  "payaza-hackhouse-2026": {
    required: PAYAZA_HACKHOUSE_2026_REQUIRED as Set<keyof SubmissionInput>,
    labels: PAYAZA_HACKHOUSE_2026_LABELS,
    hints: PAYAZA_HACKHOUSE_2026_HINTS,
    trackSelect: true,
  },
}

/**
 * The submission requirements for a cohort. Never throws on an unknown
 * cohort — falls back to the default profile, same posture as
 * `rubricForCohort`.
 */
export function submissionRequirementsForCohort(cohort: string): SubmissionRequirements {
  return REQUIREMENTS_BY_COHORT[cohort] ?? DEFAULT_REQUIREMENTS
}

/** Plain-data shape sent to the client — a Set doesn't survive JSON. */
export interface SubmissionRequirementsView {
  required: (keyof SubmissionInput)[]
  labels: Partial<Record<keyof SubmissionInput, string>>
  hints: Partial<Record<keyof SubmissionInput, string>>
  trackSelect: boolean
}

export function toRequirementsView(
  requirements: SubmissionRequirements
): SubmissionRequirementsView {
  return {
    required: [...requirements.required],
    labels: requirements.labels,
    hints: requirements.hints,
    trackSelect: requirements.trackSelect,
  }
}
