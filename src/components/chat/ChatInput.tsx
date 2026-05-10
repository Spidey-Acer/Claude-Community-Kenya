"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import { useSkin } from "@/contexts/SkinContext";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const { skin } = useSkin();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDev = skin === "dev";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !disabled) {
          onSubmit();
        }
      }
    },
    [value, disabled, onSubmit]
  );

  return (
    <div
      className={cn(
        "flex items-end gap-2 border-t p-3",
        isDev
          ? "border-green-primary/20 bg-bg-primary"
          : "border-border-default bg-bg-card/50 backdrop-blur-sm"
      )}
    >
      {isDev && (
        <span className="mb-2 font-mono text-xs text-green-dim select-none">
          &gt;_
        </span>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={isDev ? "type a message..." : "Ask about the community..."}
        aria-label="Chat message input"
        rows={1}
        className={cn(
          "flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-text-dim disabled:opacity-50",
          "max-h-24 scrollbar-none",
          isDev ? "font-mono text-green-primary" : "text-text-primary"
        )}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className={cn(
          "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-30",
          isDev
            ? "text-green-primary hover:bg-green-primary/10"
            : "text-[#d97757] hover:bg-[#d97757]/10 rounded-full"
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
