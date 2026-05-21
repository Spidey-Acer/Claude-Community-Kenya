"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSkin } from "@/contexts/SkinContext";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  if (isPro) {
    const proStyles =
      variant === "primary"
        ? "btn-primary-shadow rounded-full bg-[#d97757] text-[#faf9f5] hover:bg-[#c06848] focus-visible:ring-[#d97757]/40"
        : "rounded-full border border-[#3a3a37] bg-transparent text-[#e8e6dc] hover:border-[#d97757]/50 hover:text-[#faf9f5] focus-visible:ring-[#d97757]/40";

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[14px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:cursor-not-allowed disabled:opacity-60",
          proStyles,
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <span
              aria-hidden="true"
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Processing
          </>
        ) : (
          <>
            {children}
            <span aria-hidden="true">→</span>
          </>
        )}
      </button>
    );
  }

  // ─── Dev / Terminal Noir variant ────────────────────────────────────
  const devBase =
    "inline-flex items-center gap-2 border px-5 py-2.5 font-mono text-sm font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:cursor-not-allowed disabled:opacity-50";

  const devVariants = {
    primary:
      "border-green-primary text-green-primary hover:bg-green-primary hover:text-bg-primary focus-visible:ring-green-primary",
    secondary:
      "border-amber text-amber hover:bg-amber hover:text-bg-primary focus-visible:ring-amber",
  };

  return (
    <button
      className={cn(devBase, devVariants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className="text-current" aria-hidden="true">&gt;</span>
      {loading ? (
        <span className="inline-flex items-center gap-1">
          Processing
          <span className="cursor-blink" aria-hidden="true">▊</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
