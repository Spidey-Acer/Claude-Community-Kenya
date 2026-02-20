import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  showDots?: boolean;
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  title,
  showDots = true,
  children,
  className,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "border border-border-default bg-bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_0_20px_rgba(0,255,65,0.08)]",
        className
      )}
    >
      {/* Title bar */}
      {(showDots || title) && (
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
          {showDots && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
            </div>
          )}
          {title && (
            <span className="ml-2 font-mono text-xs text-text-dim">
              {title}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className={paddingMap[padding]}>{children}</div>
    </div>
  );
}
