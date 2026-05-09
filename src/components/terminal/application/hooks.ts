import { useEffect, useRef, useState, type Dispatch } from "react";
import type { FormAction } from "./types";

export function useProgressAnimation(
  active: boolean,
  onComplete: () => void,
  dispatch: Dispatch<FormAction>
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

export function useReturningUser() {
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

export function useSessionId() {
  const [sessionId] = useState(() => Math.random().toString(16).slice(2, 8));
  return sessionId;
}
