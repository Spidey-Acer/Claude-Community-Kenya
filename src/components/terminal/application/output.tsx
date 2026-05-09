import { TypingAnimation } from "../TypingAnimation";
import type { TerminalLine } from "./types";

const colorClasses: Record<string, string> = {
  green: "text-green-primary",
  amber: "text-amber",
  cyan: "text-cyan",
  red: "text-red",
  dim: "text-text-dim",
  primary: "text-text-primary",
};

interface TerminalLineComponentProps {
  line: TerminalLine;
  onAnimComplete?: () => void;
}

export function TerminalLineComponent({
  line,
  onAnimComplete,
}: TerminalLineComponentProps) {
  const colorCls = line.color ? colorClasses[line.color] : "text-text-primary";

  if (line.animate && line.type === "prompt") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm leading-relaxed">
        <TypingAnimation
          text={line.content}
          speed={25}
          showCursor={false}
          onComplete={onAnimComplete}
          className={colorCls}
        />
      </div>
    );
  }

  if (line.type === "input") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm leading-relaxed">
        <span className="text-cyan">cck</span>
        <span className="text-text-dim">:</span>
        <span className="text-amber">~</span>
        <span className="text-text-primary"> $ </span>
        <span className="text-text-primary">{line.content}</span>
      </div>
    );
  }

  if (line.type === "ascii-art") {
    return (
      <pre
        className={`font-mono text-xs leading-tight sm:text-sm whitespace-pre ${colorCls}`}
      >
        {line.content}
      </pre>
    );
  }

  if (line.type === "progress") {
    return (
      <div className="min-h-[1.5em] font-mono text-sm leading-relaxed">
        <span className="text-green-primary">
          {line.content.split("]")[0]}]
        </span>
        <span className="text-text-dim">
          {line.content.split("]").slice(1).join("]")}
        </span>
      </div>
    );
  }

  if (line.type === "feedback") {
    return (
      <div
        className={`min-h-[1.5em] font-mono text-sm leading-relaxed ${colorCls}`}
      >
        {line.content}
      </div>
    );
  }

  return (
    <div
      className={`min-h-[1.5em] font-mono text-sm leading-relaxed ${colorCls}`}
    >
      {line.content}
    </div>
  );
}
