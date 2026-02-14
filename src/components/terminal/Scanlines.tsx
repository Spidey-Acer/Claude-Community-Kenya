"use client";

import { cn } from "@/lib/utils";

interface ScanlinesProps {
  opacity?: number;
  className?: string;
}

export function Scanlines({ opacity = 0.03, className }: ScanlinesProps) {
  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-[9999]", className)}
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 255, 65, ${opacity}) 2px,
          rgba(0, 255, 65, ${opacity}) 4px
        )`,
      }}
      aria-hidden="true"
    />
  );
}
