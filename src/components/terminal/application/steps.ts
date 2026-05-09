import { uid } from "./state";
import type { FormResponses, FormStep, StepConfig, TerminalLine } from "./types";

export const STEP_ORDER: FormStep[] = [
  "name",
  "email",
  "city",
  "role",
  "experience",
  "why",
  "referral",
];

export function getStepField(step: FormStep): keyof FormResponses {
  return step as keyof FormResponses;
}

const CITY_OPTIONS: Record<string, string> = {
  "1": "Nairobi",
  "2": "Mombasa",
  nairobi: "Nairobi",
  mombasa: "Mombasa",
};

const EXPERIENCE_OPTIONS: Record<string, string> = {
  "1": "Never used it",
  "2": "Tried it a few times",
  "3": "Use it regularly",
  "4": "Can't code without it",
};

const REFERRAL_OPTIONS: Record<string, string> = {
  "1": "Twitter/X",
  "2": "LinkedIn",
  "3": "Discord",
  "4": "Friend/colleague",
  "5": "Meetup event",
  "6": "Other",
};

function promptLine(content: string): TerminalLine {
  return {
    id: uid(),
    type: "prompt",
    content,
    color: "green",
    animate: true,
  };
}

function hintLine(content: string): TerminalLine {
  return {
    id: uid(),
    type: "system",
    content,
    color: "dim",
  };
}

export function getStepConfig(step: FormStep): StepConfig {
  switch (step) {
    case "name":
      return {
        promptLines: [promptLine("What is your full name?")],
        ariaLabel: "Enter your full name",
        validate: (v) => (v.trim() ? null : "zsh: error -- name is required"),
        getFeedback: (v) => `> Welcome, ${v.trim()}!`,
      };
    case "email":
      return {
        promptLines: [
          promptLine("What's your email address?"),
          hintLine("# We'll send you community updates and event invites"),
        ],
        ariaLabel: "Enter your email address",
        validate: (v) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
            ? null
            : "zsh: invalid email format",
        getFeedback: () => "> Email locked in.",
      };
    case "city":
      return {
        promptLines: [
          promptLine("Which city are you based in?"),
          hintLine("  [1] Nairobi  [2] Mombasa  [3] Other (type your city)"),
        ],
        ariaLabel:
          "Enter your city (1 for Nairobi, 2 for Mombasa, or type your city)",
        validate: (v) => (v.trim() ? null : "zsh: error -- city is required"),
        normalize: (v) => {
          const key = v.trim().toLowerCase();
          return CITY_OPTIONS[key] || v.trim();
        },
        getFeedback: (v) => {
          const city = CITY_OPTIONS[v.trim().toLowerCase()] || v.trim();
          return `> ${city} -- we're growing there.`;
        },
      };
    case "role":
      return {
        promptLines: [
          promptLine("What's your role?"),
          hintLine("# e.g. Student, Software Engineer, Data Scientist, Designer"),
        ],
        ariaLabel: "Enter your role or occupation",
        validate: (v) => (v.trim() ? null : "zsh: error -- role is required"),
        getFeedback: (v) => `> ${v.trim()} -- noted.`,
      };
    case "experience":
      return {
        promptLines: [
          promptLine("How familiar are you with Claude / Claude Code?"),
          hintLine("  [1] Never used it    [2] Tried it a few times"),
          hintLine("  [3] Use it regularly  [4] Can't code without it"),
        ],
        ariaLabel: "Rate your experience with Claude (1-4)",
        validate: (v) =>
          v.trim() ? null : "zsh: error -- please pick an option",
        normalize: (v) => {
          const key = v.trim().toLowerCase();
          return EXPERIENCE_OPTIONS[key] || v.trim();
        },
        getFeedback: (v) => {
          const key = v.trim();
          if (key === "4" || key.toLowerCase().includes("can't"))
            return "> One of us.";
          if (
            key === "1" ||
            key === "2" ||
            key.toLowerCase().includes("never") ||
            key.toLowerCase().includes("tried")
          )
            return "> We'll get you up to speed.";
          return "> Solid. You'll fit right in.";
        },
      };
    case "why":
      return {
        promptLines: [
          promptLine("Why do you want to join Claude Community Kenya?"),
          hintLine("# Brief answer or press Enter to skip"),
        ],
        ariaLabel: "Why do you want to join? (optional, press Enter to skip)",
        getFeedback: (v) =>
          v.trim()
            ? "> Thanks for sharing."
            : "> No worries -- actions speak louder.",
      };
    case "referral":
      return {
        promptLines: [
          promptLine("How did you hear about us?"),
          hintLine("  [1] Twitter/X  [2] LinkedIn  [3] Discord"),
          hintLine("  [4] Friend     [5] Meetup    [6] Other"),
        ],
        ariaLabel: "How did you hear about us? (1-6)",
        validate: (v) =>
          v.trim() ? null : "zsh: error -- please pick an option",
        normalize: (v) => {
          const key = v.trim().toLowerCase();
          return REFERRAL_OPTIONS[key] || v.trim();
        },
        getFeedback: () => "> Got it.",
      };
    default:
      return {
        promptLines: [],
        ariaLabel: "",
        getFeedback: () => "",
      };
  }
}

export function getMobileOptions(
  step: FormStep
): Array<{ value: string; label: string }> {
  switch (step) {
    case "city":
      return [
        { value: "1", label: "Nairobi" },
        { value: "2", label: "Mombasa" },
      ];
    case "experience":
      return [
        { value: "1", label: "Never used it" },
        { value: "2", label: "Tried it" },
        { value: "3", label: "Regular user" },
        { value: "4", label: "Can't code without it" },
      ];
    case "referral":
      return [
        { value: "1", label: "Twitter/X" },
        { value: "2", label: "LinkedIn" },
        { value: "3", label: "Discord" },
        { value: "4", label: "Friend" },
        { value: "5", label: "Meetup" },
        { value: "6", label: "Other" },
      ];
    default:
      return [];
  }
}
