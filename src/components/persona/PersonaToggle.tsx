"use client";

import { useSkin } from "@/contexts/SkinContext";
import { cn } from "@/lib/utils";

export function PersonaToggle({ className }: { className?: string }) {
  const { skin, setSkin, isLoaded } = useSkin();

  if (!isLoaded || !skin) return null;

  return (
    <div className={cn("flex items-center gap-0.5 rounded-full border border-border-default bg-bg-card/80 p-0.5 backdrop-blur-sm", className)}>
      <button
        onClick={() => setSkin("dev")}
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs transition-all duration-200",
          skin === "dev"
            ? "bg-green-primary/15 text-green-primary"
            : "text-text-dim hover:text-text-secondary"
        )}
        aria-label={skin === "dev" ? "Developer mode active" : "Switch to Developer mode"}
        aria-pressed={skin === "dev"}
        title="Developer mode"
      >
        <span className="text-[11px]">&gt;_</span>
        <span>DEV</span>
      </button>
      <button
        onClick={() => setSkin("pro")}
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs transition-all duration-200",
          skin === "pro"
            ? "bg-[#d97757]/15 text-[#d97757]"
            : "text-text-dim hover:text-text-secondary"
        )}
        aria-label={skin === "pro" ? "Professional mode active" : "Switch to Professional mode"}
        aria-pressed={skin === "pro"}
        title="Professional mode"
      >
        <span className="text-[11px]">◆</span>
        <span>PRO</span>
      </button>
    </div>
  );
}

/**
 * Floating notch version — sticks below the navbar as its own element
 */
export function PersonaNotch() {
  const { skin, isLoaded } = useSkin();

  if (!isLoaded || !skin) return null;

  return (
    <div className="fixed top-[4.5rem] left-1/2 z-50 -translate-x-1/2 hidden md:block">
      <PersonaToggle className="shadow-lg shadow-black/30" />
    </div>
  );
}
