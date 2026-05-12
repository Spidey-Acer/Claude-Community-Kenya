"use client";

import { cn } from "@/lib/utils";
import { useSkin } from "@/contexts/SkinContext";

interface CommandPrefixProps {
  symbol?: "$" | ">" | "#";
  className?: string;
}

export function CommandPrefix({
  symbol = "$",
  className,
}: CommandPrefixProps) {
  const { skin } = useSkin();

  // Pro mode: no command prefixes
  if (skin === "pro") return null;

  return (
    <span
      className={cn("font-mono text-green-primary select-none", className)}
      aria-hidden="true"
    >
      {symbol}{" "}
    </span>
  );
}
