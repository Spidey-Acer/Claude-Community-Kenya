"use client";

import { cn } from "@/lib/utils";
import { usePersona } from "@/contexts/PersonaContext";

interface CommandPrefixProps {
  symbol?: "$" | ">" | "#";
  className?: string;
}

export function CommandPrefix({
  symbol = "$",
  className,
}: CommandPrefixProps) {
  const { persona } = usePersona();

  // Pro mode: no command prefixes
  if (persona === "pro") return null;

  return (
    <span
      className={cn("font-mono text-green-primary select-none", className)}
      aria-hidden="true"
    >
      {symbol}{" "}
    </span>
  );
}
