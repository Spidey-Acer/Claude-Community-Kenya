"use client";

import {
  useReducer,
  useRef,
  useEffect,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { TypingAnimation } from "./TypingAnimation";
import { TypingCursor } from "./TypingCursor";

// ── Types ──

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
  const total = 30;
  const filled = Math.round((percent / 100) * total);
  const empty = total - filled;
  return `[${"#".repeat(filled)}${"-".repeat(empty)}] ${percent}%`;
}

let lineIdCounter = 0;
function uid(): string {
  return `line-${++lineIdCounter}-${Date.now()}`;
}

// ── Step Definitions ──

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
        validate: (v) => (v.trim() ? null : "zsh: error -- name is required"),
        getFeedback: (v) => `> Welcome, ${v.trim()}!`,
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
            content: "# We'll send you community updates and event invites",
            color: "dim",
          },
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
            content: "  [1] Nairobi  [2] Mombasa  [3] Other (type your city)",
            color: "dim",
          },
        ],
        ariaLabel: "Enter your city (1 for Nairobi, 2 for Mombasa, or type your city)",
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
              "# e.g. Student, Software Engineer, Data Scientist, Designer",
            color: "dim",
          },
        ],
        ariaLabel: "Enter your role or occupation",
        validate: (v) => (v.trim() ? null : "zsh: error -- role is required"),
        getFeedback: (v) => `> ${v.trim()} -- noted.`,
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
            content: "  [1] Never used it    [2] Tried it a few times",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  [3] Use it regularly  [4] Can't code without it",
            color: "dim",
          },
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
          if (key === "1" || key === "2" || key.toLowerCase().includes("never") || key.toLowerCase().includes("tried"))
            return "> We'll get you up to speed.";
          return "> Solid. You'll fit right in.";
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
            content: "# Brief answer or press Enter to skip",
            color: "dim",
          },
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
            content: "  [1] Twitter/X  [2] LinkedIn  [3] Discord",
            color: "dim",
          },
          {
            id: uid(),
            type: "system",
            content: "  [4] Friend     [5] Meetup    [6] Other",
            color: "dim",
          },
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

// ── Easter Eggs ──

const EASTER_EGGS: Record<string, { response: string; egg: string }> = {
  help: {
    response:
      "Commands: name, email, city, role, experience, why, referral. Just answer the prompts.",
    egg: "help",
  },
  ls: {
    response:
      "name/ email/ city/ role/ experience/ why/ referral/ -> submit",
    egg: "ls",
  },
  clear: {
    response: "You can't clear your destiny. Keep going.",
    egg: "clear",
  },
  exit: {
    response: "No escape. You're one of us now.",
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
    return { response: "Nice try. No root access here.", egg: "sudo" };
  }
  return EASTER_EGGS[trimmed] || null;
}

// ── Line Renderer ──

const colorClasses: Record<string, string> = {
  green: "text-green-primary",
  amber: "text-amber",
  cyan: "text-cyan",
  red: "text-red",
  dim: "text-text-dim",
  primary: "text-text-primary",
};

function TerminalLineComponent({
  line,
  onAnimComplete,
}: {
  line: TerminalLine;
  onAnimComplete?: () => void;
}) {
  const colorCls = line.color ? colorClasses[line.color] : "text-text-primary";

  if (line.animate && line.type === "prompt") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm leading-relaxed">
        <TypingAnimation
          text={line.content}
          speed={25}
          showCursor={false}
          onComplete={onAnimComplete}
          className={colorCls}
        />
      </div>
    );
  }

  if (line.type === "input") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm leading-relaxed">
        <span className="text-cyan">cck</span>
        <span className="text-text-dim">:</span>
        <span className="text-amber">~</span>
        <span className="text-text-primary"> $ </span>
        <span className="text-text-primary">{line.content}</span>
      </div>
    );
  }

  if (line.type === "ascii-art") {
    return (
      <pre className={`font-mono text-xs leading-tight sm:text-sm whitespace-pre ${colorCls}`}>
        {line.content}
      </pre>
    );
  }

  if (line.type === "progress") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm leading-relaxed">
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
      <div className={`min-h-[1.5em] font-mono text-sm leading-relaxed ${colorCls}`}>
        {line.content}
      </div>
    );
  }

  return (
    <div className={`min-h-[1.5em] font-mono text-sm leading-relaxed ${colorCls}`}>
      {line.content}
    </div>
  );
}

// ── Progress Animation ──

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
    }, 80);

    return () => clearInterval(interval);
  }, [active, onComplete, dispatch]);
}

// ── Returning User Check ──

function useReturningUser() {
  const [returning, setReturning] = useState<{ name: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cck-application");
      if (saved) {
        const data = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (data?.name) setReturning({ name: data.name });
      }
    } catch {
      // ignore
    }
  }, []);

  return returning;
}

// ── macOS Window Chrome ──

function WindowButtons({
  onClose,
  onMinimize,
  onMaximize,
}: {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  return (
    <div className="flex items-center gap-[7px]">
      <button
        onClick={onClose}
        className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] transition-opacity hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-label="Close terminal"
      >
        <svg className="h-[6px] w-[6px] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2.5">
          <path d="M1 1l10 10M11 1L1 11" />
        </svg>
      </button>
      <button
        onClick={onMinimize}
        className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#febc2e] transition-opacity hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-label="Minimize terminal"
      >
        <svg className="h-[6px] w-[6px] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2.5">
          <path d="M1 6h10" />
        </svg>
      </button>
      <button
        onClick={onMaximize}
        className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#28c840] transition-opacity hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-label="Maximize terminal"
      >
        <svg className="h-[6px] w-[6px] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2.5">
          <path d="M1.5 3.5v7h7M3.5 1.5h7v7" />
        </svg>
      </button>
    </div>
  );
}

// ── Session ID ──

function useSessionId() {
  const [sessionId] = useState(() => {
    const hex = Math.random().toString(16).slice(2, 8);
    return hex;
  });
  return sessionId;
}

// ── Main Component ──

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
    content: `  ____  ____  _  __
 / ___\|/ ___|| |/ /
| |    | |    | ' /
| |___ | |___ | . \\
 \\____| \\____||_|\\_\\  APPLY`,
    color: "green",
  },
  { id: uid(), type: "system", content: "", color: "dim" },
];

const BOOT_INTRO_TEXT = [
  "East Africa's first Claude developer community.",
  "Want in? Let's go.",
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
  const [csrfToken, setCsrfToken] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const returningUser = useReturningUser();
  const prefersReducedMotion = useRef(false);
  const sessionId = useSessionId();

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  // Fetch CSRF token on mount
  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken as string))
      .catch(() => {});
  }, []);

  // Auto-scroll terminal content (NOT the page)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleProcessingComplete = useCallback(() => {
    const { responses, easterEggsFound } = state;

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

    if (csrfToken) {
      fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          name: responses.name,
          email: responses.email,
          experience: responses.experience || "Not specified",
          interests: [responses.role, responses.city].filter(Boolean),
          reason: responses.why || "Joined via terminal application",
          heardFrom: responses.referral || undefined,
        }),
      }).catch(() => {});
    }

    dispatch({
      type: "ADD_LINES",
      lines: [
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "ascii-art",
          content: `+------------------------------------------+
|         APPLICATION SUBMITTED            |
+------------------------------------------+`,
          color: "green",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "feedback",
          content: `  Welcome to Claude Community Kenya, ${responses.name}.`,
          color: "green",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "feedback",
          content: "  [OK] APPLICATION RECEIVED",
          color: "green",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "system",
          content: "  Next steps:",
          color: "primary",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "system",
          content: "  1. Join Discord --> discord.gg/AVAyYCbJ",
          color: "cyan",
        },
        {
          id: uid(),
          type: "system",
          content: "  2. Follow us --> @ClaudeCommunityKE",
          color: "cyan",
        },
        {
          id: uid(),
          type: "system",
          content: "  3. Upcoming events --> /events",
          color: "cyan",
        },
        { id: uid(), type: "system", content: "", color: "dim" },
        {
          id: uid(),
          type: "system",
          content: `  Easter Eggs: ${easterEggsFound}/5`,
          color: "amber",
        },
        {
          id: uid(),
          type: "system",
          content:
            "  HINT: Try some shell commands...",
          color: "dim",
        },
      ],
    });
    dispatch({ type: "SET_STEP", step: "complete" });
  }, [state.responses, state.easterEggsFound, csrfToken]);

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

    const normalized = config.normalize ? config.normalize(value) : value.trim();

    dispatch({
      type: "SET_RESPONSE",
      field: getStepField(state.currentStep),
      value: normalized || value.trim(),
    });

    const feedback = config.getFeedback(value);
    dispatch({
      type: "ADD_LINES",
      lines: [
        { id: uid(), type: "input", content: value },
        { id: uid(), type: "feedback", content: feedback, color: "cyan" },
        { id: uid(), type: "system", content: "", color: "dim" },
      ],
    });

    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setPromptReady(false);
      setTimeout(() => {
        dispatch({ type: "SET_STEP", step: STEP_ORDER[currentIndex + 1] });
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
              content: "Processing application...",
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

  const handleReApply = () => {
    setReApply(true);
  };

  // ── Window controls ──
  const handleClose = useCallback(() => {
    setMinimized(true);
    setTimeout(() => {
      document.getElementById("contribute")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, []);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
  }, []);

  const handleMaximize = useCallback(() => {
    setMaximized((prev) => !prev);
  }, []);

  // Step progress
  const currentStepIndex = STEP_ORDER.indexOf(state.currentStep);
  const stepProgress =
    state.currentStep === "complete"
      ? STEP_ORDER.length
      : state.currentStep === "processing"
        ? STEP_ORDER.length
        : currentStepIndex >= 0
          ? currentStepIndex
          : 0;

  // ── Minimized state ──
  if (minimized) {
    return (
      <div className={`mx-auto ${maximized ? "max-w-full" : "max-w-4xl"}`}>
        <button
          onClick={() => {
            setMinimized(false);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="group flex w-full items-center gap-3 rounded-lg border border-border-default bg-[#1c1c1e] px-4 py-3 transition-all hover:border-green-primary/50 hover:shadow-[0_0_20px_rgba(0,255,65,0.08)]"
        >
          <div className="flex items-center gap-[7px]">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="font-mono text-xs text-text-dim group-hover:text-text-secondary">
            apply.sh -- click to restore
          </span>
          <span className="ml-auto font-mono text-[10px] text-text-dim">
            {stepProgress}/{STEP_ORDER.length} steps
          </span>
        </button>
      </div>
    );
  }

  // ── Returning user screen ──
  if (returningUser && !reApply && !bootDone) {
    return (
      <div className={`mx-auto ${maximized ? "max-w-full" : "max-w-4xl"}`}>
        <div className="overflow-hidden rounded-lg border border-border-default bg-[#1c1c1e] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]">
          {/* macOS Title Bar */}
          <div className="flex items-center border-b border-white/[0.06] bg-[#2a2a2c] px-4 py-[10px]">
            <WindowButtons
              onClose={handleClose}
              onMinimize={handleMinimize}
              onMaximize={handleMaximize}
            />
            <span className="flex-1 text-center font-mono text-xs text-[#8e8e93]">
              apply.sh
            </span>
            <div className="w-[52px]" />
          </div>

          <div className="p-6 font-mono text-sm">
            <pre className="whitespace-pre text-xs text-green-primary sm:text-sm">
{`  ____  ____  _  __
 / ___\|/ ___|| |/ /
| |    | |    | ' /
| |___ | |___ | . \\
 \\____| \\____||_|\\_\\  APPLY`}
            </pre>
            <p className="mt-4 text-text-primary">
              Welcome back, {returningUser.name}. Your application is on file.
            </p>
            <p className="mt-2 text-text-dim">
              Submit a new application?
            </p>
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleReApply}
                className="rounded border border-green-primary px-4 py-2 font-mono text-sm text-green-primary transition-all hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                $ ./apply.sh --force
              </button>
              <Link
                href="/events"
                className="rounded border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
              >
                $ cd /events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentConfig =
    state.currentStep !== "boot" &&
    state.currentStep !== "processing" &&
    state.currentStep !== "complete"
      ? getStepConfig(state.currentStep, state.responses)
      : null;

  const showBootTyping =
    state.currentStep === "boot" && bootDone && state.isTyping;

  const showInput =
    promptReady &&
    !state.isTyping &&
    state.currentStep !== "boot" &&
    state.currentStep !== "processing" &&
    state.currentStep !== "complete";

  const mobileOptions = getMobileOptions(state.currentStep);

  return (
    <div
      ref={terminalRef}
      className={`mx-auto transition-all duration-300 ${maximized ? "fixed inset-4 z-50 max-w-none" : "max-w-4xl"}`}
    >
      <div
        className={`flex flex-col overflow-hidden rounded-lg border border-border-default shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] ${maximized ? "h-full" : ""}`}
        style={{
          background: "linear-gradient(180deg, #1c1c1e 0%, #141415 100%)",
        }}
      >
        {/* ── macOS Title Bar ── */}
        <div className="flex shrink-0 items-center border-b border-white/[0.06] bg-[#2a2a2c] px-4 py-[10px]">
          <WindowButtons
            onClose={handleClose}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
          />
          <span className="flex-1 text-center font-mono text-xs text-[#8e8e93]">
            apply.sh -- {sessionId} -- 80x24
          </span>
          <div className="w-[52px]" />
        </div>

        {/* ── Status Bar ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.04] bg-[#1c1c1e] px-4 py-1">
          <span className="font-mono text-[10px] text-text-dim">
            session: cck-{sessionId}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-text-dim">
              step {Math.min(stepProgress + 1, STEP_ORDER.length)}/{STEP_ORDER.length}
            </span>
            <div className="flex gap-[2px]">
              {STEP_ORDER.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-3 rounded-sm transition-colors duration-300 ${
                    i <= stepProgress - 1
                      ? "bg-green-primary"
                      : i === stepProgress
                        ? "bg-green-primary/50"
                        : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Terminal Content ── */}
        <div className="relative flex-1">
          {/* Scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,65,0.1) 1px, rgba(0,255,65,0.1) 2px)",
            }}
          />

          <div
            ref={scrollRef}
            className={`overflow-y-auto p-4 md:p-6 ${maximized ? "" : "min-h-[50vh]"}`}
            style={{ maxHeight: maximized ? "calc(100vh - 120px)" : "clamp(50vh, 65vh, 70vh)" }}
            aria-live="polite"
            aria-label="Terminal application form"
            role="log"
            onClick={() => inputRef.current?.focus()}
          >
            {/* History */}
            {state.history.map((line) => {
              if (line.animate && line.type === "prompt") {
                return (
                  <TerminalLineComponent
                    key={line.id}
                    line={line}
                    onAnimComplete={handlePromptTypingComplete}
                  />
                );
              }
              return <TerminalLineComponent key={line.id} line={line} />;
            })}

            {/* Boot typing animation */}
            {showBootTyping && (
              <TypingAnimation
                text={BOOT_INTRO_TEXT}
                speed={25}
                showCursor={true}
                onComplete={handleBootTypingComplete}
                className="text-text-primary"
              />
            )}

            {/* Input area */}
            {showInput && (
              <div className="mt-1 flex items-center font-mono text-sm">
                <span className="shrink-0 select-none">
                  <span className="text-cyan">cck</span>
                  <span className="text-text-dim">:</span>
                  <span className="text-amber">~</span>
                  <span className="text-text-primary"> $ </span>
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 border-none bg-transparent font-mono text-sm text-text-primary outline-none placeholder:text-text-dim/40"
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
                                  content: "Processing application...",
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
                    className="rounded border border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-sm text-text-secondary transition-all hover:border-green-primary/40 hover:text-green-primary active:bg-green-primary/10"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maximized backdrop */}
      {maximized && (
        <div
          className="fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm"
          onClick={handleMaximize}
        />
      )}
    </div>
  );
}

// ── Mobile Options Helper ──

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
