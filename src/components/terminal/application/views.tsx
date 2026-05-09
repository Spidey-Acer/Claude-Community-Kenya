import Link from "next/link";
import { RETURNING_USER_ASCII } from "./boot";
import { STEP_ORDER } from "./steps";
import { WindowButtons } from "./window-chrome";

interface MinimizedViewProps {
  maximized: boolean;
  stepProgress: number;
  onRestore: () => void;
}

export function MinimizedView({
  maximized,
  stepProgress,
  onRestore,
}: MinimizedViewProps) {
  return (
    <div className={`mx-auto ${maximized ? "max-w-full" : "max-w-4xl"}`}>
      <button
        onClick={onRestore}
        className="group flex w-full items-center gap-3 rounded-lg border border-border-default bg-[#1c1c1e] px-4 py-3 transition-all hover:border-green-primary/50 hover:shadow-[0_0_20px_rgba(0,255,65,0.08)]"
      >
        <div className="flex items-center gap-[7px]">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-mono text-xs text-text-dim group-hover:text-text-secondary">
          apply.sh -- click to restore
        </span>
        <span className="ml-auto font-mono text-[10px] text-text-dim">
          {stepProgress}/{STEP_ORDER.length} steps
        </span>
      </button>
    </div>
  );
}

interface ReturningUserViewProps {
  maximized: boolean;
  name: string;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onReApply: () => void;
}

export function ReturningUserView({
  maximized,
  name,
  onClose,
  onMinimize,
  onMaximize,
  onReApply,
}: ReturningUserViewProps) {
  return (
    <div className={`mx-auto ${maximized ? "max-w-full" : "max-w-4xl"}`}>
      <div className="overflow-hidden rounded-lg border border-border-default bg-[#1c1c1e] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center border-b border-white/[0.06] bg-[#2a2a2c] px-4 py-[10px]">
          <WindowButtons
            onClose={onClose}
            onMinimize={onMinimize}
            onMaximize={onMaximize}
          />
          <span className="flex-1 text-center font-mono text-xs text-[#8e8e93]">
            apply.sh
          </span>
          <div className="w-[52px]" />
        </div>

        <div className="p-6 font-mono text-sm">
          <pre className="whitespace-pre text-xs text-green-primary sm:text-sm">
            {RETURNING_USER_ASCII}
          </pre>
          <p className="mt-4 text-text-primary">
            Welcome back, {name}. Your application is on file.
          </p>
          <p className="mt-2 text-text-dim">Submit a new application?</p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={onReApply}
              className="rounded border border-green-primary px-4 py-2 font-mono text-sm text-green-primary transition-all hover:bg-green-primary hover:text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              $ ./apply.sh --force
            </button>
            <Link
              href="/events"
              className="rounded border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
            >
              $ cd /events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
