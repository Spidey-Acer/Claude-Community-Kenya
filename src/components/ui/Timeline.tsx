import { cn } from "@/lib/utils";

interface TimelineEntry {
  date: string;
  title: string;
  description: string;
  hash?: string;
}

interface TimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

export function Timeline({ entries, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border-default" />

      <div className="space-y-8">
        {entries.map((entry, index) => (
          <div key={index} className="relative flex gap-4 pl-12">
            {/* Git-style commit dot */}
            <div className="absolute left-2.5 top-1 flex h-4 w-4 items-center justify-center">
              <span
                className={cn(
                  "h-3 w-3 rounded-full border-2",
                  index === 0
                    ? "border-green-primary bg-green-primary"
                    : "border-green-dim bg-bg-primary"
                )}
              />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {entry.hash && (
                  <span className="font-mono text-xs text-amber">
                    {entry.hash}
                  </span>
                )}
                <span className="font-mono text-xs text-text-dim">
                  {entry.date}
                </span>
              </div>
              <h4 className="mt-1 font-mono text-sm font-bold text-text-primary">
                {entry.title}
              </h4>
              <p className="mt-1 text-sm text-text-secondary">
                {entry.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
