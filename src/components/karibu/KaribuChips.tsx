"use client";

interface ChipsProps {
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
}

/**
 * Reply-suggestion chips rendered below a Karibu assistant message.
 * Each chip is a button that sends its `value` as a user message.
 * Disabled while the assistant is streaming.
 */
export function KaribuChips({ options, onSelect, disabled = false }: ChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-10" role="group" aria-label="Suggested replies">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.value, opt.label)}
          className="border border-green-primary/60 text-green-primary hover:bg-green-primary/10 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-1.5 rounded-full text-sm font-sans transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-primary"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
