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
import { BOOT_INTRO_TEXT, BOOT_LINES } from "./application/boot";
import {
  buildCompleteLines,
  persistApplication,
  submitApplication,
} from "./application/complete";
import { checkEasterEgg } from "./application/easter-eggs";
import { TerminalFrame } from "./application/frame";
import {
  useProgressAnimation,
  useReturningUser,
  useSessionId,
} from "./application/hooks";
import { TerminalLineComponent } from "./application/output";
import { MobileOptions, PromptInput } from "./application/prompt";
import { formReducer, initialState, uid } from "./application/state";
import {
  STEP_ORDER,
  getMobileOptions,
  getStepConfig,
  getStepField,
} from "./application/steps";
import type { TerminalLine } from "./application/types";
import { MinimizedView, ReturningUserView } from "./application/views";

const introLines = (): TerminalLine[] => [
  ...BOOT_INTRO_TEXT.map<TerminalLine>((t) => ({
    id: uid(),
    type: "system",
    content: t,
    color: "primary",
  })),
  { id: uid(), type: "system", content: "", color: "dim" },
];

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
  const returningUser = useReturningUser();
  const prefersReducedMotion = useRef(false);
  const sessionId = useSessionId();

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

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

  useEffect(() => {
    if (promptReady && !state.isTyping) inputRef.current?.focus();
  }, [promptReady, state.isTyping]);

  useEffect(() => {
    if (bootDone) return;
    if (returningUser && !reApply) return;

    dispatch({ type: "ADD_LINES", lines: BOOT_LINES });

    if (prefersReducedMotion.current) {
      dispatch({ type: "ADD_LINES", lines: introLines() });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBootDone(true);
      dispatch({ type: "SET_STEP", step: "name" });
    } else {
      dispatch({ type: "SET_TYPING", isTyping: true });
      setBootDone(true);
    }
  }, [bootDone, returningUser, reApply]);

  const handleBootTypingComplete = useCallback(() => {
    dispatch({ type: "SET_TYPING", isTyping: false });
    dispatch({ type: "ADD_LINES", lines: introLines() });
    setTimeout(() => dispatch({ type: "SET_STEP", step: "name" }), 500);
  }, []);

  useEffect(() => {
    if (
      state.currentStep === "boot" ||
      state.currentStep === "processing" ||
      state.currentStep === "complete"
    )
      return;

    const config = getStepConfig(state.currentStep);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPromptReady(false);
    dispatch({ type: "SET_TYPING", isTyping: true });
    dispatch({ type: "ADD_LINES", lines: config.promptLines });

    if (prefersReducedMotion.current) {
      dispatch({ type: "SET_TYPING", isTyping: false });
      setPromptReady(true);
    }
  }, [state.currentStep]);

  const handlePromptTypingComplete = useCallback(() => {
    dispatch({ type: "SET_TYPING", isTyping: false });
    setPromptReady(true);
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleProcessingComplete = useCallback(() => {
    persistApplication(state.responses);
    submitApplication(state.responses, csrfToken);
    dispatch({
      type: "ADD_LINES",
      lines: buildCompleteLines(state.responses, state.easterEggsFound),
    });
    dispatch({ type: "SET_STEP", step: "complete" });
  }, [state.responses, state.easterEggsFound, csrfToken]);

  useProgressAnimation(
    state.currentStep === "processing",
    handleProcessingComplete,
    dispatch
  );

  // Shared finalization for both keyboard and mobile-button submissions.
  // Validation/easter-egg gating happens in callers, since mobile buttons skip them.
  const advanceWithValue = useCallback(
    (rawValue: string) => {
      if (
        state.currentStep === "boot" ||
        state.currentStep === "processing" ||
        state.currentStep === "complete"
      )
        return;

      const config = getStepConfig(state.currentStep);
      const normalized = config.normalize
        ? config.normalize(rawValue)
        : rawValue.trim();

      dispatch({
        type: "SET_RESPONSE",
        field: getStepField(state.currentStep),
        value: normalized || rawValue.trim(),
      });

      dispatch({
        type: "ADD_LINES",
        lines: [
          { id: uid(), type: "input", content: rawValue },
          {
            id: uid(),
            type: "feedback",
            content: config.getFeedback(rawValue),
            color: "cyan",
          },
          { id: uid(), type: "system", content: "", color: "dim" },
        ],
      });

      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      setPromptReady(false);
      if (currentIndex < STEP_ORDER.length - 1) {
        setTimeout(() => {
          dispatch({ type: "SET_STEP", step: STEP_ORDER[currentIndex + 1] });
        }, 400);
      } else {
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
    },
    [state.currentStep]
  );

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

    const config = getStepConfig(state.currentStep);
    const error = config.validate?.(value);
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

    advanceWithValue(value);
  }, [inputValue, state.currentStep, advanceWithValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClose = useCallback(() => {
    setMinimized(true);
    setTimeout(() => {
      document
        .getElementById("contribute")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, []);

  const handleMinimize = useCallback(() => setMinimized(true), []);
  const handleMaximize = useCallback(() => setMaximized((p) => !p), []);

  const currentStepIndex = STEP_ORDER.indexOf(state.currentStep);
  const stepProgress =
    state.currentStep === "complete" || state.currentStep === "processing"
      ? STEP_ORDER.length
      : currentStepIndex >= 0
        ? currentStepIndex
        : 0;

  if (minimized) {
    return (
      <MinimizedView
        maximized={maximized}
        stepProgress={stepProgress}
        onRestore={() => {
          setMinimized(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      />
    );
  }

  if (returningUser && !reApply && !bootDone) {
    return (
      <ReturningUserView
        maximized={maximized}
        name={returningUser.name}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onReApply={() => setReApply(true)}
      />
    );
  }

  const isInteractive =
    state.currentStep !== "boot" &&
    state.currentStep !== "processing" &&
    state.currentStep !== "complete";
  const currentConfig = isInteractive ? getStepConfig(state.currentStep) : null;
  const showBootTyping =
    state.currentStep === "boot" && bootDone && state.isTyping;
  const showInput = promptReady && !state.isTyping && isInteractive;

  return (
    <TerminalFrame
      maximized={maximized}
      sessionId={sessionId}
      stepProgress={stepProgress}
      scrollRef={scrollRef}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onMaximize={handleMaximize}
      onScrollClick={() => inputRef.current?.focus()}
    >
      {state.history.map((line) => (
        <TerminalLineComponent
          key={line.id}
          line={line}
          onAnimComplete={
            line.animate && line.type === "prompt"
              ? handlePromptTypingComplete
              : undefined
          }
        />
      ))}

      {showBootTyping && (
        <TypingAnimation
          text={BOOT_INTRO_TEXT}
          speed={25}
          showCursor={true}
          onComplete={handleBootTypingComplete}
          className="text-text-primary"
        />
      )}

      {showInput && (
        <PromptInput
          inputRef={inputRef}
          value={inputValue}
          ariaLabel={currentConfig?.ariaLabel || "Type your response"}
          onChange={setInputValue}
          onKeyDown={handleKeyDown}
        />
      )}

      {showInput && (
        <MobileOptions
          options={getMobileOptions(state.currentStep)}
          onPick={(value) => {
            setInputValue(value);
            setTimeout(() => {
              setInputValue("");
              advanceWithValue(value);
            }, 50);
          }}
        />
      )}
    </TerminalFrame>
  );
}
