"use client";

import { usePersona } from "@/contexts/PersonaContext";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Wraps a Link or <a> and strips terminal styling in Pro mode.
 * Dev: `> VIEW_ALL_EVENTS` with border + monospace
 * Pro: `View All Events →` with rounded pill
 */
export function PersonaCTA({
  href,
  devLabel,
  proLabel,
  external = false,
  variant = "primary",
  className,
}: {
  href: string;
  devLabel: string;
  proLabel: string;
  external?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { persona } = usePersona();
  const isPro = persona === "pro";

  const devClasses = variant === "primary"
    ? "border border-green-primary px-5 py-2.5 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary"
    : "border border-amber px-5 py-2.5 font-mono text-sm font-medium text-amber transition-all duration-200 hover:bg-amber hover:text-bg-primary";

  const proClasses = variant === "primary"
    ? "rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-white/10 transition-all duration-200 hover:bg-zinc-100"
    : "rounded-full border border-zinc-600 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-all duration-200 hover:border-zinc-400 hover:text-white";

  const props = {
    className: cn(
      "inline-flex items-center justify-center gap-2",
      isPro ? proClasses : devClasses,
      className
    ),
    ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
  };

  const content = isPro ? (
    <>
      {proLabel}
      <span aria-hidden="true">→</span>
    </>
  ) : (
    <>
      <span className="text-current" aria-hidden="true">&gt;</span>
      {devLabel}
    </>
  );

  return (
    <a href={href} {...props}>
      {content}
    </a>
  );
}

/**
 * Section wrapper — in Pro mode uses a gradient divider instead of harsh border.
 */
export function PersonaSection({
  children,
  className,
  altBg = false,
}: {
  children: ReactNode;
  className?: string;
  altBg?: boolean;
}) {
  const { persona } = usePersona();
  const isPro = persona === "pro";

  if (isPro && altBg) {
    return (
      <section className={cn("relative py-24", className)}>
        <div className="pointer-events-none absolute inset-0 border-y border-zinc-800/50 bg-zinc-900/30" />
        <div className="relative">{children}</div>
      </section>
    );
  }

  if (!isPro && altBg) {
    return (
      <section className={cn("border-y border-border-default bg-bg-secondary py-24", className)}>
        {children}
      </section>
    );
  }

  return <section className={cn("py-24", className)}>{children}</section>;
}

/**
 * Card wrapper — TerminalWindow in Dev, clean rounded card in Pro.
 */
export function PersonaCard({
  children,
  title,
  className,
  highlighted = false,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
  highlighted?: boolean;
}) {
  const { persona } = usePersona();
  const isPro = persona === "pro";

  if (isPro) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border bg-zinc-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5",
          highlighted
            ? "border-zinc-600 hover:border-zinc-500 shadow-lg shadow-zinc-900/50"
            : "border-zinc-800 hover:border-zinc-700",
          className
        )}
      >
        {title && (
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
        )}
        {children}
      </div>
    );
  }

  // Dev mode — let existing TerminalWindow/cards handle this
  return <>{children}</>;
}
