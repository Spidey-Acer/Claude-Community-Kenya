import { cn } from "@/lib/utils";

type BadgeVariant = "upcoming" | "registration-open" | "completed" | "sold-out" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  upcoming:
    "border-green-primary/40 bg-green-primary/10 text-green-primary",
  "registration-open":
    "border-amber/40 bg-amber/10 text-amber",
  completed:
    "border-border-hover bg-bg-elevated text-text-dim",
  "sold-out":
    "border-red/40 bg-red/10 text-red",
  default:
    "border-border-hover bg-bg-elevated text-text-secondary",
};

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wider transition-colors duration-200",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
