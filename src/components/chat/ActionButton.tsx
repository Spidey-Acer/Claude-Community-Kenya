"use client";

import Link from "next/link";
import { usePersona } from "@/contexts/PersonaContext";
import { cn } from "@/lib/utils";
import type { ParsedAction } from "@/lib/chat/action-parser";

export function ActionButton({ action }: { action: ParsedAction }) {
  const { persona } = usePersona();
  const isExternal = action.url.startsWith("http");
  const isDev = persona === "dev";

  const className = cn(
    "inline-flex items-center gap-1.5 transition-colors duration-200 text-xs font-medium",
    isDev
      ? "font-mono border border-green-primary/40 text-green-primary hover:bg-green-primary/10 px-2.5 py-1"
      : "rounded-full bg-[#d97757]/15 text-[#d97757] hover:bg-[#d97757]/25 px-3 py-1.5"
  );

  if (isExternal) {
    return (
      <a
        href={action.url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={action.label}
      >
        {isDev ? `[ ${action.label} ]` : action.label}
        {isDev ? null : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
          </svg>
        )}
      </a>
    );
  }

  return (
    <Link href={action.url} className={className} aria-label={action.label}>
      {isDev ? `[ ${action.label} ]` : action.label}
    </Link>
  );
}
