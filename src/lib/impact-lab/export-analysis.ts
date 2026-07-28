/**
 * Impact Lab results export — per-team project analyses.
 *
 * The archived record needs a substantive written account of every project,
 * and the judges did not leave one: written notes exist for ten of the
 * twenty-seven submissions, from one judge, averaging a few words. This module
 * fills that gap the only honest way available — by writing an analysis FROM
 * THE TEAM'S OWN SUBMISSION, generated at export time, and labelling it as
 * exactly that everywhere it appears.
 *
 * Hard lines, mirrored in the system prompt and in the renderers:
 *
 * 1. Never invent judge commentary; never attribute generated words to a
 *    named judge. The analyses carry `ANALYSIS_PROVENANCE` wherever printed.
 * 2. Ground every sentence in what the team wrote. If the submission does not
 *    say something, the analysis does not say it either.
 * 3. Fail soft. A team whose analysis cannot be generated simply has no
 *    analysis section — never a placeholder or an error string in a document
 *    that leaves the building.
 *
 * Same model and error discipline as `judging/assist` (the in-event reading
 * aid), which set the pattern for pointing a model at submission text.
 */

import { z } from "zod"
import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import type { ExportTeam } from "./export-data"

const MODEL = "claude-sonnet-5"

/** How many teams are analysed concurrently. Kind to rate limits, still fast. */
const CONCURRENCY = 4

/** Section heading the renderers print above an analysis. */
export const ANALYSIS_LABEL = "Project analysis"

/**
 * The provenance line that MUST accompany every rendered analysis. A reader
 * should never have to guess whether these words came from a judge — they
 * did not, and the label says so before the reader can wonder.
 */
export const ANALYSIS_PROVENANCE =
  "Written after the event from the team's own submission. Not judge commentary."

const analysisSchema = z.object({
  whatTheyBuilt: z
    .string()
    .describe(
      "Two to three sentences: what the team built and the problem it addresses, drawn strictly from the submission."
    ),
  whoItServes: z
    .string()
    .describe(
      "One to two sentences: who the project serves, as the team described them. If the submission never names a beneficiary, say so plainly."
    ),
  workingVsMocked: z
    .string()
    .describe(
      "Two to three sentences: what was working versus mocked or stubbed, per the team's own account. If the submission does not draw the line, say that it does not."
    ),
  claudeUse: z
    .string()
    .describe(
      "One to three sentences: how the team used Claude in the build, per their own account."
    ),
})

export type TeamAnalysis = z.infer<typeof analysisSchema>

const SYSTEM = `You are writing the project profile for the permanent archived record of a hackathon. Your only source is the team's own written submission, quoted to you in full.

Rules, all of them hard:
- Ground every sentence in what the team actually wrote. If the submission does not say something, do not infer it, estimate it, or fill the gap — say plainly that the submission does not say.
- Describe; never evaluate. No verdicts, no scores, no "impressive", "strong", "promising", "unfortunately", or any other judgement of quality. The judges judged; you record.
- Never speak as, for, or about the judges.
- Plain English, specific and concrete. No marketing language, no filler.
- Write in the third person, past tense where natural ("the team built…").`

/**
 * Generate an analysis for every team that has a submission.
 *
 * Returns a map keyed by teamId — the single-run cache: each team is analysed
 * exactly once per export, and both artefact builders read from the same map.
 * Teams whose generation fails are simply absent from the map (fail-soft rule
 * above); the error is logged so a wholly failed run is visible in server
 * logs, but the export itself never breaks on this.
 */
export async function generateTeamAnalyses(
  teams: readonly ExportTeam[]
): Promise<ReadonlyMap<string, TeamAnalysis>> {
  const anthropic = createAnthropic()
  const withSubmission = teams.filter((t) => t.submission !== null)
  const analyses = new Map<string, TeamAnalysis>()

  const queue = [...withSubmission]
  const worker = async (): Promise<void> => {
    for (let team = queue.shift(); team; team = queue.shift()) {
      const s = team.submission
      if (!s) continue
      const prompt = `The team's submission, in full:

Project: ${s.projectName}
Track: ${team.track}
One-line pitch: ${s.pitch}
Problem tackled: ${s.problemTackled}
What it does: ${s.description}
What works vs what is mocked: ${s.worksVsMocked}
How they used Claude: ${s.claudeUsage}`

      try {
        const { object } = await generateObject({
          model: anthropic(MODEL),
          schema: analysisSchema,
          system: SYSTEM,
          prompt,
          maxOutputTokens: 1_500,
        })
        analyses.set(team.teamId, object)
      } catch (error) {
        // Fail-soft: this team's analysis section is simply absent. The
        // export must never carry a placeholder out of the building.
        console.error(`[results/export] analysis failed for ${team.teamId}`, error)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, withSubmission.length) }, worker)
  )
  return analyses
}
