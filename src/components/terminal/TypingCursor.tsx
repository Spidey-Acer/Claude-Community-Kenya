"use client";

import { cn } from "@/lib/utils";

interface TypingCursorProps {
  blinkSpeed?: number;
  className?: string;
}

export function TypingCursor({
  blinkSpeed = 1000,
  className,
}: TypingCursorProps) {
  return (
    <span
      className={cn("inline-block text-green-primary", className)}
      style={{
        animation: `cursor-blink ${blinkSpeed}ms step-end infinite`,
      }}
      aria-hidden="true"
    >
      ▊
    </span>
  );
}
