/**
 * Maps Karibu onboarding query params to TerminalApplication pre-fill values.
 * Called by LazyTerminalApplication when ?from=karibu is present in the URL.
 */

import type { Audience, Intent, Experience } from "./types";

export interface KaribuPrefill {
  name?: string;
  city?: string;
  role?: string;
  experience?: string;
  why?: string;
  referral?: string;
}

const AUDIENCE_TO_ROLE: Record<Audience, string> = {
  dev: "Developer",
  non_tech_pro: "Professional",
  student: "Student",
  founder: "Founder",
  creator: "Creator",
};

const EXPERIENCE_TO_OPTION: Record<Experience, string> = {
  never_used: "1",
  claude_ai: "2",
  claude_code: "3",
  api_builder: "4",
};

const INTENT_TO_WHY: Record<Intent, string> = {
  learn_basics: "I want to learn how to use Claude",
  find_event: "I'm looking for events and meetups",
  find_collaborators: "I want to meet and collaborate with others",
  build: "I want to build something with Claude",
  hire_or_partner: "I'm looking to hire or partner with AI-skilled people",
  other: "",
};

/**
 * Builds a prefill object from URL search params created by the Karibu join chain.
 * Returns null when the URL does not carry Karibu params (non-Karibu /join visits
 * are unaffected).
 */
export function buildPrefillFromParams(searchParams: URLSearchParams): KaribuPrefill | null {
  if (searchParams.get("from") !== "karibu") return null;

  const prefill: KaribuPrefill = {};

  const name = searchParams.get("name");
  if (name) prefill.name = decodeURIComponent(name);

  const city = searchParams.get("city");
  if (city) prefill.city = decodeURIComponent(city);

  const audience = searchParams.get("audience") as Audience | null;
  if (audience && AUDIENCE_TO_ROLE[audience]) prefill.role = AUDIENCE_TO_ROLE[audience];

  const experience = searchParams.get("experience") as Experience | null;
  if (experience && EXPERIENCE_TO_OPTION[experience]) {
    prefill.experience = EXPERIENCE_TO_OPTION[experience];
  }

  const intent = searchParams.get("intent") as Intent | null;
  if (intent && INTENT_TO_WHY[intent]) prefill.why = INTENT_TO_WHY[intent];

  // Referral = "Karibu onboarding" (option 4 = Friend/colleague — closest semantic fit)
  prefill.referral = "4";

  return Object.keys(prefill).length > 0 ? prefill : null;
}
