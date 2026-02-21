"use client";

import {
  useReducer,
  useRef,
  useEffect,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import { TypingAnimation } from "./TypingAnimation";
import { TypingCursor } from "./TypingCursor";

// ─── Types ───

type FormStep =
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

interface TerminalLine {
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

interface FormState {
  currentStep: FormStep;
  responses: {
    name: string;
    email: string;
    city: string;
    role: string;
    experience: string;
    why: string;
    referral: string;
  };
  history: TerminalLine[];
  isTyping: boolean;
  easterEggsFound: number;
  foundEggs: Set<string>;
}

type FormAction =
  | { type: "ADD_LINES"; lines: TerminalLine[] }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "SET_STEP"; step: FormStep }
  | { type: "SET_RESPONSE"; field: keyof FormState["responses"]; value: string }
  | { type: "FIND_EASTER_EGG"; egg: string }
  | { type: "SET_PROGRESS"; percent: number };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "ADD_LINES":
      return { ...state, history: [...state.history, ...action.lines] };
    case "SET_TYPING":
      return { ...state, isTyping: action.isTyping };
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "SET_RESPONSE":
      return {
        ...state,
        responses: { ...state.responses, [action.field]: action.value },
      };
    case "FIND_EASTER_EGG":
      if (state.foundEggs.has(action.egg)) return state;
      const newSet = new Set(state.foundEggs);
      newSet.add(action.egg);
      return {
        ...state,
        easterEggsFound: state.easterEggsFound + 1,
        foundEggs: newSet,
      };
    case "SET_PROGRESS": {
      const existing = state.history.findIndex((l) => l.type === "progress");
      if (existing >= 0) {
        const updated = [...state.history];
        updated[existing] = {
          ...updated[existing],
          content: buildProgressBar(action.percent),
        };
        return { ...state, history: updated };
      }
      return {
        ...state,
        history: [
          ...state.history,
          {
            id: `progress-${Date.now()}`,
            type: "progress",
            content: buildProgressBar(action.percent),
            color: "green",
          },
        ],
      };
    }
    default:
      return state;
  }
}

function buildProgressBar(percent: number): string {
  const total = 24;
  const filled = Math.round((percent / 100) * total);
  const empty = total - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent}%`;
}

let lineIdCounter = 0;
function uid(): string {
  return `line-${++lineIdCounter}-${Date.now()}`;
}

// ─── Step Definitions ───

const STEP_ORDER: FormStep[] = [
  "name",
  "email",
  "city",
  "role",
  "experience",
  "why",
  "referral",
];

function getStepField(step: FormStep): keyof FormState["responses"] {
  return step as keyof FormState["responses"];
}

interface StepConfig {
  promptLines: TerminalLine[];
  ariaLabel: string;
  validate?: (value: string) => string | null;
  getFeedback: (value: string) => string;
  normalize?: (value: string) => string;
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

function getStepConfig(
  step: FormStep,
  responses: FormState["responses"]
): StepConfig {
  switch (step) {
    case "name":
      return {
        promptLines: [
          {
            id: uid(),
            type: "prompt",
            content: "What is your full name?",
            color: "green",
            animate: true,
          },
        ],
        ariaLabel: "Enter your full name",
        validate: (v) => (v.trim() ? null : "bash: error — name is required"),
        getFeedback: (v) => `Welcome, ${v.trim()}! 🤝`,
      };
    case "email":
      return {
        promptLines: [
          {
            id: uid(),
            type: "prompt",
            content: "What's your email address?",
            color: "green",
            animate: true,
          },
          {
            id: uid(),
            type: "system",
            content: "(We'll send you community updates and event invites)",
            color: "dim",
          },
        ],
        ariaLabel: "Enter your email address",
        validate: (v) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
            ? null
            : "bash: invalid email format",
        getFeedback: () => "Email captured! 📧",
      };
    case "city":
      return {
        promptLines: [
          {
            id: uid(),
            type: "prompt",
            content: "Which city are you based in?",
            color: "green",
            animate: true,
          },
          {
            id: uid(),
            type: "system",
            content: "Options:",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  1. Nairobi",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  2. Mombasa",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  3. Other (type your city)",
            color: "dim",
          },
        ],
        ariaLabel: "Enter your city (1 for Nairobi, 2 for Mombasa, or type your city)",
        validate: (v) => (v.trim() ? null : "bash: error — city is required"),
        normalize: (v) => {
          const key = v.trim().toLowerCase();
          return CITY_OPTIONS[key] || v.trim();
        },
        getFeedback: (v) => {
          const city = CITY_OPTIONS[v.trim().toLowerCase()] || v.trim();
          return `${city} — great! We're growing there. 🏙️`;
        },
      };
    case "role":
      return {
        promptLines: [
          {
            id: uid(),
            type: "prompt",
            content: "What's your role?",
            color: "green",
            animate: true,
          },
          {
            id: uid(),
            type: "system",
            content:
              "(e.g., Student, Software Engineer, Data Scientist, Designer, Curious Human)",
            color: "dim",
          },
        ],
        ariaLabel: "Enter your role or occupation",
        validate: (v) => (v.trim() ? null : "bash: error — role is required"),
        getFeedback: (v) => `${v.trim()} — nice!`,
      };
    case "experience":
      return {
        promptLines: [
          {
            id: uid(),
            type: "prompt",
            content: "How familiar are you with Claude / Claude Code?",
            color: "green",
            animate: true,
          },
          {
            id: uid(),
            type: "system",
            content: "  1. Never used it",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  2. Tried it a few times",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  3. Use it regularly",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  4. Can't code without it 😤",
            color: "dim",
          },
        ],
        ariaLabel: "Rate your experience with Claude (1-4)",
        validate: (v) =>
          v.trim() ? null : "bash: error — please pick an option",
        normalize: (v) => {
          const key = v.trim().toLowerCase();
          return EXPERIENCE_OPTIONS[key] || v.trim();
        },
        getFeedback: (v) => {
          const key = v.trim();
          if (key === "4" || key.toLowerCase().includes("can't"))
            return "One of us! 🔥";
          if (key === "1" || key === "2" || key.toLowerCase().includes("never") || key.toLowerCase().includes("tried"))
            return "Perfect — we'll get you up to speed.";
          return "Solid. You'll fit right in.";
        },
      };
    case "why":
      return {
        promptLines: [
          {
            id: uid(),
            type: "prompt",
            content: "Why do you want to join Claude Community Kenya?",
            color: "green",
            animate: true,
          },
          {
            id: uid(),
            type: "system",
            content: "(A brief answer is fine — or press Enter to skip)",
            color: "dim",
          },
        ],
        ariaLabel: "Why do you want to join? (optional, press Enter to skip)",
        getFeedback: (v) =>
          v.trim()
            ? "Thanks for sharing!"
            : "No worries — actions speak louder. 💪",
      };
    case "referral":
      return {
        promptLines: [
          {
            id: uid(),
            type: "prompt",
            content: "How did you hear about us?",
            color: "green",
            animate: true,
          },
          {
            id: uid(),
            type: "system",
            content: "  1. Twitter/X",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  2. LinkedIn",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  3. Discord",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  4. Friend/colleague",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  5. Meetup event",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  6. Other",
            color: "dim",
          },
        ],
        ariaLabel: "How did you hear about us? (1-6)",
        validate: (v) =>
          v.trim() ? null : "bash: error — please pick an option",
        normalize: (v) => {
          const key = v.trim().toLowerCase();
          return REFERRAL_OPTIONS[key] || v.trim();
        },
        getFeedback: () => "Got it!",
      };
    default:
      return {
        promptLines: [],
        ariaLabel: "",
        getFeedback: () => "",
      };
  }
}

// ─── Easter Eggs ───

const EASTER_EGGS: Record<string, { response: string; egg: string }> = {
  help: {
    response:
      "Available commands: name, email, city, role, experience, why, referral. Just answer the prompts!",
    egg: "help",
  },
  ls: {
    response:
      "Steps: name → email → city → role → experience → why → referral → submit",
    egg: "ls",
  },
  clear: {
    response: "You can't clear your destiny. Keep going.",
    egg: "clear",
  },
  exit: {
    response: "No escape. You're one of us now. 🇰🇪",
    egg: "exit",
  },
  pwd: {
    response: "~/claude-community-kenya/applications/your-future",
    egg: "pwd",
  },
};

function checkEasterEgg(
  input: string
): { response: string; egg: string } | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith("sudo")) {
    return { response: "Nice try. No root access here. 😏", egg: "sudo" };
  }
  return EASTER_EGGS[trimmed] || null;
}

// ─── Line Renderer ───

const colorClasses: Record<string, string> = {
  green: "text-green-primary",
  amber: "text-amber",
  cyan: "text-cyan",
  red: "text-red",
  dim: "text-text-dim",
  primary: "text-text-primary",
};

function TerminalLine({
  line,
  onAnimComplete,
}: {
  line: TerminalLine;
  onAnimComplete?: () => void;
}) {
  const colorCls = line.color ? colorClasses[line.color] : "text-text-primary";

  if (line.animate && line.type === "prompt") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm">
        <TypingAnimation
          text={line.content}
          speed={30}
          showCursor={false}
          onComplete={onAnimComplete}
          className={colorCls}
        />
      </div>
    );
  }

  if (line.type === "input") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm">
        <span className="text-green-dim">~/claude-community-kenya $ </span>
        <span className="text-text-primary">{line.content}</span>
      </div>
    );
  }

  if (line.type === "ascii-art") {
    return (
      <pre className={`font-mono text-sm whitespace-pre ${colorCls}`}>
        {line.content}
      </pre>
    );
  }

  if (line.type === "progress") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm">
        <span className="text-green-primary">
          {line.content.split("]")[0]}]
        </span>
        <span className="text-text-dim">
          {line.content.split("]").slice(1).join("]")}
        </span>
      </div>
    );
  }

  if (line.type === "feedback") {
    return (
      <div className={`min-h-[1.5em] font-mono text-sm ${colorCls}`}>
        {line.content}
      </div>
    );
  }

  return (
    <div className={`min-h-[1.5em] font-mono text-sm ${colorCls}`}>
      {line.content}
    </div>
  );
}

// ─── Progress Animation ───

function useProgressAnimation(
  active: boolean,
  onComplete: () => void,
  dispatch: React.Dispatch<FormAction>
) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!active || hasRun.current) return;
    hasRun.current = true;

    let percent = 0;
    const interval = setInterval(() => {
      percent += 4;
      if (percent > 100) percent = 100;
      dispatch({ type: "SET_PROGRESS", percent });
      if (percent >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 400);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [active, onComplete, dispatch]);
}

// ─── Returning User Check ───

function useReturningUser() {
  const [returning, setReturning] = useState<{ name: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cck-application");
      if (saved) {
        const data = JSON.parse(saved);
        if (data?.name) setReturning({ name: data.name });
      }
    } catch {
      // ignore
    }
  }, []);

  return returning;
}

// ─── Main Component ───

const BOOT_LINES: TerminalLine[] = [
  { id: uid(), type: "input", content: "./apply.sh" },
  {
    id: uid(),
    type: "system",
    content: "Initializing Claude Community Kenya application...",
    color: "dim",
  },
  { id: uid(), type: "system", content: "", color: "dim" },
  {
    id: uid(),
    type: "ascii-art",
    content: `╔══════════════════════════════════════════════════╗
║        CLAUDE COMMUNITY KENYA APPLICATION        ║
╚══════════════════════════════════════════════════╝`,
    color: "green",
  },
  { id: uid(), type: "system", content: "", color: "dim" },
];

const BOOT_INTRO_TEXT = [
  "We're building East Africa's first Claude developer",
  "community. Want in? Let's go.",
];

const initialState: FormState = {
  currentStep: "boot",
  responses: {
    name: "",
    email: "",
    city: "",
    role: "",
    experience: "",
    why: "",
    referral: "",
  },
  history: [],
  isTyping: false,
  easterEggsFound: 0,
  foundEggs: new Set<string>(),
};

export function TerminalApplication() {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [inputValue, setInputValue] = useState("");
  const [bootDone, setBootDone] = useState(false);
  const [promptReady, setPromptReady] = useState(false);
  const [reApply, setReApply] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const returningUser = useReturningUser();
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.history, state.currentStep, promptReady]);

  // Focus input when prompt is ready
  useEffect(() => {
    if (promptReady && !state.isTyping) {
      inputRef.current?.focus();
    }
  }, [promptReady, state.isTyping]);

  // Boot sequence
  useEffect(() => {
    if (bootDone) return;

    // Check returning user
    if (returningUser && !reApply) return;

    dispatch({ type: "ADD_LINES", lines: BOOT_LINES });

    if (prefersReducedMotion.current) {
      // Skip typing animation
      dispatch({
        type: "ADD_LINES",
        lines: BOOT_INTRO_TEXT.map((t) => ({
          id: uid(),
          type: "system" as const,
          content: t,
          color: "primary" as const,
        })),
      });
      dispatch({ type: "ADD_LINES", lines: [{ id: uid(), type: "system", content: "", color: "dim" }] });
      setBootDone(true);
      dispatch({ type: "SET_STEP", step: "name" });
    } else {
      dispatch({ type: "SET_TYPING", isTyping: true });
      setBootDone(true);
    }
  }, [bootDone, returningUser, reApply]);

  // After boot typing completes, move to first step
  const handleBootTypingComplete = useCallback(() => {
    dispatch({ type: "SET_TYPING", isTyping: false });
    dispatch({
      type: "ADD_LINES",
      lines: BOOT_INTRO_TEXT.map((t) => ({
        id: uid(),
        type: "system" as const,
        content: t,
        color: "primary" as const,
      })),
    });
    dispatch({ type: "ADD_LINES", lines: [{ id: uid(), type: "system", content: "", color: "dim" }] });
    setTimeout(() => {
      dispatch({ type: "SET_STEP", step: "name" });
    }, 500);
  }, []);

  // When step changes, add prompt lines
  useEffect(() => {
    if (
      state.currentStep === "boot" ||
      state.currentStep === "processing" ||
      state.currentStep === "complete"
    )
      return;

    const config = getStepConfig(state.currentStep, state.responses);
    setPromptReady(false);
    dispatch({ type: "SET_TYPING", isTyping: true });
    dispatch({ type: "ADD_LINES", lines: config.promptLines });

    if (prefersReducedMotion.current) {
      dispatch({ type: "SET_TYPING", isTyping: false });
      setPromptReady(true);
    }
  }, [state.currentStep]);

  // Handle animation complete for prompt typing
  const handlePromptTypingComplete = useCallback(() => {
    dispatch({ type: "SET_TYPING", isTyping: false });
    setPromptReady(true);
  }, []);

  // Processing
  const handleProcessingComplete = useCallback(() => {
    const { responses, easterEggsFound } = state;

    // Save to localStorage
    try {
      localStorage.setItem(
        "cck-application",
        JSON.stringify({
          name: responses.name,
          email: responses.email,
          city: responses.city,
          role: responses.role,
          experience: responses.experience,
          why: responses.why,
          referral: responses.referral,
          submittedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }

    dispatch({
      type: "ADD_LINES",
      lines: [
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "ascii-art",
          content: `╔══════════════════════════════════════════════════╗
║              APPLICATION SUBMITTED!              ║
╚══════════════════════════════════════════════════╝`,
          color: "green",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "feedback",
          content: `  Welcome to Claude Community Kenya, ${responses.name}!`,
          color: "green",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "feedback",
          content: "  ✅ APPLICATION RECEIVED",
          color: "green",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "system",
          content: "  Here's what happens next:",
          color: "primary",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "system",
          content: "  1. Join our Discord → discord.gg/NSB9AsCm",
          color: "cyan",
        },
        {
          id: uid(),
          type: "system",
          content: "  2. Follow us on Twitter → @ClaudeCommunityKE",
          color: "cyan",
        },
        {
          id: uid(),
          type: "system",
          content: "  3. Check upcoming events → /events",
          color: "cyan",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "system",
          content: `  Easter Eggs Found: ${easterEggsFound}/5`,
          color: "amber",
        },
        {
          id: uid(),
          type: "system",
          content:
            "  HINT: Explore the terminal like a developer would...",
          color: "dim",
        },
      ],
    });
    dispatch({ type: "SET_STEP", step: "complete" });
  }, [state.responses, state.easterEggsFound]);

  useProgressAnimation(
    state.currentStep === "processing",
    handleProcessingComplete,
    dispatch
  );

  // Handle input submit
  const handleSubmit = useCallback(() => {
    const value = inputValue;
    setInputValue("");

    if (
      state.currentStep === "boot" ||
      state.currentStep === "processing" ||
      state.currentStep === "complete"
    )
      return;

    // Check easter eggs
    const easterEgg = checkEasterEgg(value);
    if (easterEgg) {
      dispatch({
        type: "ADD_LINES",
        lines: [
          { id: uid(), type: "input", content: value },
          {
            id: uid(),
            type: "feedback",
            content: easterEgg.response,
            color: "amber",
          },
        ],
      });
      dispatch({ type: "FIND_EASTER_EGG", egg: easterEgg.egg });
      return;
    }

    const config = getStepConfig(state.currentStep, state.responses);

    // Validate
    if (config.validate) {
      const error = config.validate(value);
      if (error) {
        dispatch({
          type: "ADD_LINES",
          lines: [
            { id: uid(), type: "input", content: value },
            { id: uid(), type: "feedback", content: error, color: "red" },
          ],
        });
        return;
      }
    }

    // Normalize value
    const normalized = config.normalize ? config.normalize(value) : value.trim();

    // Record response
    dispatch({
      type: "SET_RESPONSE",
      field: getStepField(state.currentStep),
      value: normalized || value.trim(),
    });

    // Add input + feedback lines
    const feedback = config.getFeedback(value);
    dispatch({
      type: "ADD_LINES",
      lines: [
        { id: uid(), type: "input", content: value },
        { id: uid(), type: "feedback", content: feedback, color: "cyan" },
        { id: uid(), type: "system", content: "", color: "dim" },
      ],
    });

    // Advance to next step
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setPromptReady(false);
      setTimeout(() => {
        dispatch({ type: "SET_STEP", step: STEP_ORDER[currentIndex + 1] });
      }, 400);
    } else {
      // All steps done — processing
      setPromptReady(false);
      setTimeout(() => {
        dispatch({
          type: "ADD_LINES",
          lines: [
            {
              id: uid(),
              type: "system",
              content: "Processing your application...",
              color: "green",
            },
          ],
        });
        dispatch({ type: "SET_STEP", step: "processing" });
      }, 400);
    }
  }, [inputValue, state.currentStep, state.responses]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle re-apply for returning users
  const handleReApply = () => {
    setReApply(true);
  };

  // Returning user screen
  if (returningUser && !reApply && !bootDone) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="border border-border-default bg-bg-card">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
            </div>
            <span className="ml-2 font-mono text-xs text-text-dim">
              apply.sh — bash
            </span>
          </div>
          <div className="p-6 font-mono text-sm">
            <pre className="whitespace-pre text-green-primary">
{`╔══════════════════════════════════════════════════╗
║        CLAUDE COMMUNITY KENYA APPLICATION        ║
╚══════════════════════════════════════════════════╝`}
            </pre>
            <p className="mt-4 text-text-primary">
              Welcome back, {returningUser.name}! Your application is on file.
            </p>
            <p className="mt-2 text-text-dim">
              Want to submit a new application?
            </p>
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleReApply}
                className="border border-green-primary px-4 py-2 font-mono text-sm text-green-primary transition-colors hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                $ ./apply.sh --force
              </button>
              <a
                href="/events"
                className="border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              >
                $ cd /events
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine current step config for aria-label
  const currentConfig =
    state.currentStep !== "boot" &&
    state.currentStep !== "processing" &&
    state.currentStep !== "complete"
      ? getStepConfig(state.currentStep, state.responses)
      : null;

  // Check if we need to render the typing animation for boot
  const showBootTyping =
    state.currentStep === "boot" && bootDone && state.isTyping;

  const showInput =
    promptReady &&
    !state.isTyping &&
    state.currentStep !== "boot" &&
    state.currentStep !== "processing" &&
    state.currentStep !== "complete";

  // Numbered options for mobile
  const mobileOptions = getMobileOptions(state.currentStep);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border border-border-default bg-bg-card shadow-[0_0_15px_rgba(0,255,65,0.1)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
          </div>
          <span className="ml-2 font-mono text-xs text-text-dim">
            apply.sh — bash
          </span>
        </div>

        {/* Terminal content */}
        <div
          ref={terminalRef}
          className="min-h-[60vh] overflow-y-auto p-4 sm:min-h-[60vh] md:p-6"
          style={{ maxHeight: "70vh" }}
          aria-live="polite"
          aria-label="Terminal application form"
          role="log"
        >
          {/* Rendered history lines */}
          {state.history.map((line) => {
            // For animated prompt lines, we need onComplete callback
            if (line.animate && line.type === "prompt") {
              return (
                <TerminalLine
                  key={line.id}
                  line={line}
                  onAnimComplete={handlePromptTypingComplete}
                />
              );
            }
            return <TerminalLine key={line.id} line={line} />;
          })}

          {/* Boot typing animation */}
          {showBootTyping && (
            <TypingAnimation
              text={BOOT_INTRO_TEXT}
              speed={30}
              showCursor={true}
              onComplete={handleBootTypingComplete}
              className="text-text-primary"
            />
          )}

          {/* Input area */}
          {showInput && (
            <div className="mt-2 flex items-center font-mono text-sm">
              <span className="shrink-0 text-green-dim select-none">
                ~/claude-community-kenya ${" "}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-none bg-transparent font-mono text-sm text-text-primary outline-none placeholder:text-text-dim"
                style={{ caretColor: "var(--green-primary)" }}
                aria-label={currentConfig?.ariaLabel || "Type your response"}
                autoComplete="off"
                spellCheck={false}
              />
              <TypingCursor />
            </div>
          )}

          {/* Mobile option buttons */}
          {showInput && mobileOptions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
              {mobileOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setInputValue(opt.value);
                    setTimeout(() => {
                      // Trigger submit
                      const syntheticInput = opt.value;
                      setInputValue("");

                      const config = getStepConfig(
                        state.currentStep,
                        state.responses
                      );
                      const normalized = config.normalize
                        ? config.normalize(syntheticInput)
                        : syntheticInput.trim();

                      dispatch({
                        type: "SET_RESPONSE",
                        field: getStepField(state.currentStep),
                        value: normalized || syntheticInput.trim(),
                      });

                      const feedback = config.getFeedback(syntheticInput);
                      dispatch({
                        type: "ADD_LINES",
                        lines: [
                          {
                            id: uid(),
                            type: "input",
                            content: syntheticInput,
                          },
                          {
                            id: uid(),
                            type: "feedback",
                            content: feedback,
                            color: "cyan",
                          },
                          {
                            id: uid(),
                            type: "system",
                            content: "",
                            color: "dim",
                          },
                        ],
                      });

                      const currentIndex = STEP_ORDER.indexOf(
                        state.currentStep
                      );
                      if (currentIndex < STEP_ORDER.length - 1) {
                        setPromptReady(false);
                        setTimeout(() => {
                          dispatch({
                            type: "SET_STEP",
                            step: STEP_ORDER[currentIndex + 1],
                          });
                        }, 400);
                      } else {
                        setPromptReady(false);
                        setTimeout(() => {
                          dispatch({
                            type: "ADD_LINES",
                            lines: [
                              {
                                id: uid(),
                                type: "system",
                                content: "Processing your application...",
                                color: "green",
                              },
                            ],
                          });
                          dispatch({
                            type: "SET_STEP",
                            step: "processing",
                          });
                        }, 400);
                      }
                    }, 50);
                  }}
                  className="border border-border-default px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-green-primary hover:text-green-primary"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Options Helper ───

function getMobileOptions(
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
