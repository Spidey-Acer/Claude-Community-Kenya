import type { ReactNode, RefObject } from "react";
import { STEP_ORDER } from "./steps";
import { WindowButtons } from "./window-chrome";

interface TerminalFrameProps {
  maximized: boolean;
  sessionId: string;
  stepProgress: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onScrollClick: () => void;
  children: ReactNode;
}

export function TerminalFrame({
  maximized,
  sessionId,
  stepProgress,
  scrollRef,
  onClose,
  onMinimize,
  onMaximize,
  onScrollClick,
  children,
}: TerminalFrameProps) {
  return (
    <div
      className={`mx-auto transition-all duration-300 ${maximized ? "fixed inset-4 z-50 max-w-none" : "max-w-4xl"}`}
    >
      <div
        className={`flex flex-col overflow-hidden rounded-lg border border-border-default shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] ${maximized ? "h-full" : ""}`}
        style={{
          background: "linear-gradient(180deg, #1c1c1e 0%, #141415 100%)",
        }}
      >
        <div className="flex shrink-0 items-center border-b border-white/[0.06] bg-[#2a2a2c] px-4 py-[10px]">
          <WindowButtons
            onClose={onClose}
            onMinimize={onMinimize}
            onMaximize={onMaximize}
          />
          <span className="flex-1 text-center font-mono text-xs text-[#8e8e93]">
            apply.sh -- {sessionId} -- 80x24
          </span>
          <div className="w-[52px]" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.04] bg-[#1c1c1e] px-4 py-1">
          <span className="font-mono text-[10px] text-text-dim">
            session: cck-{sessionId}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-text-dim">
              step {Math.min(stepProgress + 1, STEP_ORDER.length)}/
              {STEP_ORDER.length}
            </span>
            <div className="flex gap-[2px]">
              {STEP_ORDER.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-3 rounded-sm transition-colors duration-300 ${
                    i <= stepProgress - 1
                      ? "bg-green-primary"
                      : i === stepProgress
                        ? "bg-green-primary/50"
                        : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex-1">
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,65,0.1) 1px, rgba(0,255,65,0.1) 2px)",
            }}
          />

          <div
            ref={scrollRef}
            className={`overflow-y-auto p-4 md:p-6 ${maximized ? "" : "min-h-[50vh]"}`}
            style={{
              maxHeight: maximized
                ? "calc(100vh - 120px)"
                : "clamp(50vh, 65vh, 70vh)",
            }}
            aria-live="polite"
            aria-label="Terminal application form"
            role="log"
            onClick={onScrollClick}
          >
            {children}
          </div>
        </div>
      </div>

      {maximized && (
        <div
          className="fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm"
          onClick={onMaximize}
        />
      )}
    </div>
  );
}
