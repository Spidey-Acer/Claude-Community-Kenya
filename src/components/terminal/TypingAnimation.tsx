"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { TypingCursor } from "./TypingCursor";

interface TypingAnimationProps {
  text: string | string[];
  speed?: number;
  showCursor?: boolean;
  loop?: boolean;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}

export function TypingAnimation({
  text,
  speed = 50,
  showCursor = true,
  loop = false,
  delay = 0,
  onComplete,
  className,
}: TypingAnimationProps) {
  const lines = Array.isArray(text) ? text : [text];
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef(false);

  // Check reduced motion preference
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayedLines(lines);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsComplete(true);
      onComplete?.();
    }
  }, []);

  // Intersection Observer — only animate when visible
  useEffect(() => {
    if (prefersReducedMotion.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          const timer = setTimeout(() => setHasStarted(true), delay);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.2 }
    );

    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [delay, hasStarted]);

  // Typing logic
  useEffect(() => {
    if (!hasStarted || isComplete || prefersReducedMotion.current) return;

    if (currentLineIndex >= lines.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsComplete(true);
      onComplete?.();

      if (loop) {
        const timer = setTimeout(() => {
          setDisplayedLines([]);
          setCurrentLineIndex(0);
          setCurrentCharIndex(0);
          setIsComplete(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
      return;
    }

    const currentLine = lines[currentLineIndex];

    if (currentCharIndex <= currentLine.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const updated = [...prev];
          updated[currentLineIndex] = currentLine.slice(0, currentCharIndex);
          return updated;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }

    // Move to next line with a short pause
    const lineDelay = setTimeout(() => {
      setCurrentLineIndex((prev) => prev + 1);
      setCurrentCharIndex(0);
    }, speed * 8);
    return () => clearTimeout(lineDelay);
  }, [hasStarted, currentLineIndex, currentCharIndex, isComplete, lines, speed, loop, onComplete]);

  const isTypingCurrentLine = useCallback(
    (lineIndex: number) =>
      lineIndex === currentLineIndex && !isComplete && hasStarted,
    [currentLineIndex, isComplete, hasStarted]
  );

  return (
    <div ref={containerRef} className={cn("font-mono text-sm", className)}>
      {displayedLines.map((line, i) => (
        <div key={i} className="min-h-[1.5em]">
          <span className="text-text-primary">{line}</span>
          {showCursor && isTypingCurrentLine(i) && <TypingCursor />}
        </div>
      ))}
      {showCursor && isComplete && (
        <div className="min-h-[1.5em]">
          <TypingCursor />
        </div>
      )}
    </div>
  );
}
