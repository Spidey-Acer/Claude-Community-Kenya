"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  const baseStyles =
    "inline-flex items-center gap-2 border px-5 py-2.5 font-mono text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "border-green-primary text-green-primary hover:bg-green-primary hover:text-bg-primary focus-visible:ring-green-primary",
    secondary:
      "border-amber text-amber hover:bg-amber hover:text-bg-primary focus-visible:ring-amber",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      <span className="text-current">&gt;</span>
      {loading ? (
        <span className="inline-flex items-center gap-1">
          Processing
          <span className="cursor-blink">▊</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
