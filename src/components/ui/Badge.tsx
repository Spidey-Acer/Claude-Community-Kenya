"use client";

import { cn } from "@/lib/utils";
import { useSkin } from "@/contexts/SkinContext";

type BadgeVariant = "upcoming" | "registration-open" | "completed" | "sold-out" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const devVariantStyles: Record<BadgeVariant, string> = {
  upcoming: "border-green-primary/40 bg-green-primary/10 text-green-primary",
  "registration-open": "border-amber/40 bg-amber/10 text-amber",
  completed: "border-border-hover bg-bg-elevated text-text-dim",
  "sold-out": "border-red/40 bg-red/10 text-red",
  default: "border-border-hover bg-bg-elevated text-text-secondary",
};

const proVariantStyles: Record<BadgeVariant, string> = {
  upcoming: "border-[#d97757]/40 bg-[#d97757]/10 text-[#d97757]",
  "registration-open": "border-[#e89576]/40 bg-[#e89576]/10 text-[#e89576]",
  completed: "border-[#3a3a37] bg-[#252524] text-[#7a7870]",
  "sold-out": "border-[#b85a3e]/40 bg-[#b85a3e]/10 text-[#e89576]",
  default: "border-[#3a3a37] bg-[#252524] text-[#b0aea5]",
};

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <span
      className={cn(
        isPro
          ? "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider transition-colors duration-200"
          : "inline-flex items-center border px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wider transition-colors duration-200",
        isPro ? proVariantStyles[variant] : devVariantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
