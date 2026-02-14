import { cn } from "@/lib/utils";

interface CommandPrefixProps {
  symbol?: "$" | ">" | "#";
  className?: string;
}

export function CommandPrefix({
  symbol = "$",
  className,
}: CommandPrefixProps) {
  return (
    <span
      className={cn("font-mono text-green-primary select-none", className)}
      aria-hidden="true"
    >
      {symbol}{" "}
    </span>
  );
}
