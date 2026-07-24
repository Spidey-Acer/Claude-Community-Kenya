/**
 * Impact Lab matching — Claude explanation layer.
 *
 * This is the ONLY part of the matcher that touches an LLM, and it is strictly
 * additive: teams are already assigned by the deterministic engine. Claude only
 * *explains* the finished assignment — it can never change who is on a team.
 *
 * Unlike the engine, this module is not pure (it calls the network). It is kept
 * out of the engine's index barrel for that reason; callers import it directly.
 *
 * Safety properties enforced here:
 *   - Only matching-relevant fields are sent (names, roles, skills, levels,
 *     availability). No phone numbers, no emails, no blockedTeammates.
 *   - Every AI suggestion is validated: unknown team ids are dropped, and role
 *     suggestions must map to a participant actually on that team.
 *   - Any failure (no API key, rate limit, network, invalid output) falls back
 *     to the deterministic explanations. The caller never sees an error page.
 */

import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { explainTeam } from "./explanations"
import type {
  MatchResult,
  NormalizedParticipant,
  TeamExplanation,
} from "./types"

const MODEL = "claude-sonnet-5"

const anthropic = createAnthropic()

const SYSTEM_INSTRUCTION =
  "Teams for an overnight hackathon in Nairobi (Impact Lab: AI Mashinani) were " +
  "already assigned by a deterministic algorithm. Your job is to explain each " +
  "team — and your words are shown BOTH to organisers and to the team members " +
  "themselves at the moment their team is revealed, so write for the " +
  "participants first.\n\n" +
  "For the summary: 2–4 sentences addressed to the team ('You have…', 'Your " +
  "team combines…'). Be specific and thoughtful, never generic — name the " +
  "actual complementary skills, say WHY this particular combination can ship " +
  "something real by morning, and point at what the mix of experience levels " +
  "means for how they should work (who can unblock, who brings fresh eyes). " +
  "Make it energising and concrete; a participant reading it should feel the " +
  "team was put together on purpose and know how to start.\n\n" +
  "Strengths: specific, evidence-based (tie each to real skills or roles on " +
  "the team). Weaknesses: honest but constructive — phrase each as something " +
  "the team can plan around tonight, not a verdict. Suggested internal roles: " +
  "give each member a concrete job that plays to what they listed.\n\n" +
  "Hard rules: never propose changing team membership. Only reference the " +
  "participants supplied for each team. Suggested internal roles must use the " +
  "given participant ids and only participants already on that team."

const aiTeamSchema = z.object({
  teamId: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestedProjectDirection: z.string().optional(),
  suggestedInternalRoles: z.array(
    z.object({ participantId: z.string(), role: z.string() })
  ),
  warnings: z.array(z.string()),
})

const aiResponseSchema = z.object({ teams: z.array(aiTeamSchema) })

/**
 * Teams per Claude call. One call covering a full cohort hits the model's
 * output-token ceiling — observed in prod (2026-07-24, 30 teams): finishReason
 * "length", truncated "{}" output, schema validation failure, silent
 * deterministic fallback. Small batches answer well within the ceiling and run
 * in parallel, so wall-clock stays near a single small call.
 */
const TEAMS_PER_CALL = 6

/** The slim, privacy-safe view of a participant sent to the model. */
interface AiParticipantView {
  id: string
  fullName: string
  roles: string[]
  experienceLevel: string
  skills: string[]
  availability: string[]
}

function buildPayload(
  result: MatchResult,
  byId: Map<string, NormalizedParticipant>
): { teamId: string; name: string; members: AiParticipantView[] }[] {
  return result.teams.map((team) => ({
    teamId: team.id,
    name: team.name,
    members: team.memberIds
      .map((id) => byId.get(id))
      .filter((p): p is NormalizedParticipant => Boolean(p))
      .map((p) => ({
        id: p.id,
        fullName: p.fullName,
        roles: p.roles,
        experienceLevel: p.experienceLevel,
        skills: p.skills,
        availability: p.availability,
      })),
  }))
}

function deterministicFor(
  result: MatchResult,
  byId: Map<string, NormalizedParticipant>,
  team: MatchResult["teams"][number]
): TeamExplanation {
  return explainTeam(
    team,
    team.memberIds.map((id) => byId.get(id)!).filter(Boolean)
  )
}

export interface AiExplanationResult {
  explanations: TeamExplanation[]
  warnings: string[]
  /** True when some or all teams fell back to deterministic explanations. */
  usedFallback: boolean
}

/**
 * Explain a match result with Claude, validated and with deterministic fallback.
 * `participants` are the consenting, normalized participants (the engine's view).
 */
export async function explainWithAi(
  result: MatchResult,
  participants: NormalizedParticipant[]
): Promise<AiExplanationResult> {
  const byId = new Map(participants.map((p) => [p.id, p]))

  const allFallback = (message: string): AiExplanationResult => ({
    explanations: result.teams.map((team) =>
      deterministicFor(result, byId, team)
    ),
    warnings: [message],
    usedFallback: true,
  })

  if (!process.env.ANTHROPIC_API_KEY) {
    return allFallback(
      "AI explanations are disabled (no API key); showing deterministic summaries."
    )
  }

  try {
    const payload = buildPayload(result, byId)
    const batches: (typeof payload)[] = []
    for (let i = 0; i < payload.length; i += TEAMS_PER_CALL) {
      batches.push(payload.slice(i, i + TEAMS_PER_CALL))
    }

    // Batches run in parallel and fail independently: a failed batch only
    // sends ITS teams to the deterministic fallback, never the whole run.
    const settled = await Promise.allSettled(
      batches.map((batch) =>
        generateObject({
          model: anthropic(MODEL),
          schema: aiResponseSchema,
          system: SYSTEM_INSTRUCTION,
          prompt:
            "Explain each team below. Return one entry per team.\n\n" +
            JSON.stringify(batch, null, 2),
        })
      )
    )

    const aiByTeam = new Map<string, z.infer<typeof aiTeamSchema>>()
    let failedBatches = 0
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        for (const team of outcome.value.object.teams) aiByTeam.set(team.teamId, team)
      } else {
        failedBatches++
        console.error("[impact-lab] AI explanation batch failed:", outcome.reason)
      }
    }
    if (failedBatches === settled.length) {
      return allFallback(
        "AI explanations failed; showing deterministic summaries instead."
      )
    }

    const warnings: string[] = []
    let usedFallback = false

    const explanations = result.teams.map((team): TeamExplanation => {
      const ai = aiByTeam.get(team.id)
      if (!ai) {
        usedFallback = true
        return deterministicFor(result, byId, team)
      }

      // Role suggestions must reference a participant on this team.
      const memberIds = new Set(team.memberIds)
      const roles: Record<string, string> = {}
      for (const { participantId, role } of ai.suggestedInternalRoles) {
        if (memberIds.has(participantId)) roles[participantId] = role
      }

      // Merge the engine's penalty-derived warnings (e.g. "No builder on the
      // team") with the AI's, deduped — don't let the model's warnings silently
      // replace hard signals from the deterministic scorer.
      const engineWarnings = team.score.penalties.map((p) => p.reason)
      return {
        teamId: team.id,
        summary: ai.summary,
        strengths: ai.strengths,
        weaknesses: ai.weaknesses,
        suggestedProjectDirection: ai.suggestedProjectDirection,
        suggestedInternalRoles: roles,
        warnings: [...new Set([...engineWarnings, ...ai.warnings])],
        source: "ai",
      }
    })

    if (usedFallback) {
      warnings.push(
        "Some teams fell back to deterministic explanations (the AI omitted them)."
      )
    }

    return { explanations, warnings, usedFallback }
  } catch (error) {
    // Log the cause (invalid key vs billing vs bug are otherwise
    // indistinguishable) before degrading to the deterministic explanations.
    console.error("[impact-lab] AI explanation failed; using deterministic fallback:", error)
    return allFallback(
      "AI explanations failed; showing deterministic summaries instead."
    )
  }
}
