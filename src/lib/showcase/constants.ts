/**
 * Shared vocabulary for the community showcase.
 *
 * Route validation and UI chips both read from here so a need key rendered as
 * a filter can never drift from one the API will accept.
 */

export const NEEDS_OPTIONS = [
  "testers",
  "co-founder",
  "frontend-dev",
  "backend-dev",
  "mobile-dev",
  "designer",
  "data",
  "intro",
  "funding",
  "feedback",
] as const

export type NeedKey = (typeof NEEDS_OPTIONS)[number]

export const NEED_LABELS: Record<NeedKey, string> = {
  testers: "Testers",
  "co-founder": "Co-founder",
  "frontend-dev": "Frontend dev",
  "backend-dev": "Backend dev",
  "mobile-dev": "Mobile dev",
  designer: "Designer",
  data: "Data",
  intro: "An intro",
  funding: "Funding",
  feedback: "Feedback",
}

export function isNeedKey(value: string): value is NeedKey {
  return (NEEDS_OPTIONS as readonly string[]).includes(value)
}

/** Fixed set. Adding one is a product decision, not a config tweak. */
export const REACTION_EMOJI = ["🔥", "🙌", "🧠", "😂", "🚀"] as const

export type ReactionEmoji = (typeof REACTION_EMOJI)[number]

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value)
}

export const MAX_MEDIA_PER_POST = 5
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_DEMO_BYTES = 15 * 1024 * 1024
