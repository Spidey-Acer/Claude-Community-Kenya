export type FormStep =
  | "boot"
  | "name"
  | "email"
  | "city"
  | "role"
  | "experience"
  | "why"
  | "referral"
  | "processing"
  | "complete";

export interface TerminalLine {
  id: string;
  type:
    | "system"
    | "prompt"
    | "input"
    | "response"
    | "feedback"
    | "ascii-art"
    | "progress";
  content: string;
  color?: "green" | "amber" | "cyan" | "red" | "dim" | "primary";
  animate?: boolean;
}

export interface FormResponses {
  name: string;
  email: string;
  city: string;
  role: string;
  experience: string;
  why: string;
  referral: string;
}

export interface FormState {
  currentStep: FormStep;
  responses: FormResponses;
  history: TerminalLine[];
  isTyping: boolean;
  easterEggsFound: number;
  foundEggs: Set<string>;
}

export type FormAction =
  | { type: "ADD_LINES"; lines: TerminalLine[] }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "SET_STEP"; step: FormStep }
  | { type: "SET_RESPONSE"; field: keyof FormResponses; value: string }
  | { type: "FIND_EASTER_EGG"; egg: string }
  | { type: "SET_PROGRESS"; percent: number };

export interface StepConfig {
  promptLines: TerminalLine[];
  ariaLabel: string;
  validate?: (value: string) => string | null;
  getFeedback: (value: string) => string;
  normalize?: (value: string) => string;
}
