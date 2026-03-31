"use client";

import { usePersona, type Persona } from "@/contexts/PersonaContext";

export function PersonaToggle({ className }: { className?: string }) {
  const { persona, setPersona, isLoaded } = usePersona();

  if (!isLoaded || !persona) return null;

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <button
        onClick={() => setPersona("dev")}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all ${
          persona === "dev"
            ? "border-green-primary/40 text-green-primary"
            : "border-transparent text-text-dim hover:text-text-secondary"
        }`}
        aria-label={persona === "dev" ? "Developer mode active" : "Switch to Developer mode"}
        aria-pressed={persona === "dev"}
        title="Developer mode"
      >
        <span className="text-sm">&gt;_</span>
        <span>DEV</span>
      </button>
      <button
        onClick={() => setPersona("pro")}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all ${
          persona === "pro"
            ? "border-amber/40 text-amber"
            : "border-transparent text-text-dim hover:text-text-secondary"
        }`}
        aria-label={persona === "pro" ? "Professional mode active" : "Switch to Professional mode"}
        aria-pressed={persona === "pro"}
        title="Professional mode"
      >
        <span className="text-sm">◆</span>
        <span>PRO</span>
      </button>
    </div>
  );
}
