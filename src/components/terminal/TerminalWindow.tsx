"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TerminalWindowProps {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "command" | "code";
  showDots?: boolean;
  glowing?: boolean;
}

const variantStyles = {
  default: "font-sans",
  command: "font-mono text-sm",
  code: "font-mono text-sm leading-relaxed",
};

export function TerminalWindow({
  title = "claude-community-kenya@nairobi:~$",
  children,
  className,
  variant = "default",
  showDots = true,
  glowing = false,
}: TerminalWindowProps) {
  return (
    <div
      className={cn(
        "group border border-border-default bg-bg-card transition-all duration-300",
        "hover:border-border-hover hover:-translate-y-0.5",
        "hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]",
        glowing &&
          "shadow-[0_0_15px_rgba(0,255,65,0.1)] hover:shadow-[0_0_25px_rgba(0,255,65,0.15)]",
        className
      )}
    >
      {/* Title bar with window controls */}
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
        {showDots && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
          </div>
        )}
        {title && (
          <span className="ml-2 font-mono text-xs text-text-dim">{title}</span>
        )}
      </div>

      {/* Box-drawing top border accent */}
      <div className="flex overflow-hidden px-4 pt-1 font-mono text-xs text-border-default opacity-40 select-none" aria-hidden="true">
        <span className="shrink-0">╔</span>
        <span className="flex-1 overflow-hidden whitespace-nowrap">{'═'.repeat(80)}</span>
        <span className="shrink-0">╗</span>
      </div>

      {/* Content */}
      <div className={cn("px-4 pb-4 pt-2", variantStyles[variant])}>
        {children}
      </div>

      {/* Box-drawing bottom border accent */}
      <div className="flex overflow-hidden px-4 pb-1 font-mono text-xs text-border-default opacity-40 select-none" aria-hidden="true">
        <span className="shrink-0">╚</span>
        <span className="flex-1 overflow-hidden whitespace-nowrap">{'═'.repeat(80)}</span>
        <span className="shrink-0">╝</span>
      </div>
    </div>
  );
}
