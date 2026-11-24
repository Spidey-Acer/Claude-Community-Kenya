/**
 * GuideBlock - the warm-light content card used inside the resource guide
 * pages (replaces the old terminal-window frame). A paper card with a small
 * caption bar; `code` and `command` variants switch the body to monospace.
 * Pure markup, no state, safe in server components.
 */

import type { ReactNode } from "react";

type GuideBlockVariant = "default" | "command" | "code";

interface GuideBlockProps {
  /** Caption shown in the bar above the body, e.g. a file name. */
  title?: string;
  variant?: GuideBlockVariant;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASS: Record<GuideBlockVariant, string> = {
  default: "font-inter",
  command: "font-mono text-sm",
  code: "font-mono text-sm leading-relaxed",
};

export function GuideBlock({ title, variant = "default", className, children }: GuideBlockProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-sand bg-paper-card ${className ?? ""}`}
    >
      {title && (
        <div className="border-b border-sand px-5 py-2.5 font-inter text-xs font-medium text-ink-muted">
          {title}
        </div>
      )}
      <div className={`px-5 py-4 ${VARIANT_CLASS[variant]}`}>{children}</div>
    </div>
  );
}
