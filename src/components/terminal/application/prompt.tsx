import type { KeyboardEvent, RefObject } from "react";
import { TypingCursor } from "../TypingCursor";

interface PromptInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  ariaLabel: string;
  onChange: (next: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function PromptInput({
  inputRef,
  value,
  ariaLabel,
  onChange,
  onKeyDown,
}: PromptInputProps) {
  return (
    <div className="mt-1 flex items-center font-mono text-sm">
      <span className="shrink-0 select-none">
        <span className="text-cyan">cck</span>
        <span className="text-text-dim">:</span>
        <span className="text-amber">~</span>
        <span className="text-text-primary"> $ </span>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 border-none bg-transparent font-mono text-sm text-text-primary outline-none placeholder:text-text-dim/40"
        style={{ caretColor: "var(--green-primary)" }}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
      />
      <TypingCursor />
    </div>
  );
}

interface MobileOptionsProps {
  options: Array<{ value: string; label: string }>;
  onPick: (value: string) => void;
}

export function MobileOptions({ options, onPick }: MobileOptionsProps) {
  if (options.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onPick(opt.value)}
          className="rounded border border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-sm text-text-secondary transition-all hover:border-green-primary/40 hover:text-green-primary active:bg-green-primary/10"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
