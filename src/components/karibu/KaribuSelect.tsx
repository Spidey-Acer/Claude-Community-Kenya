"use client";

/**
 * KaribuSelect — accessible custom dropdown (APG "select-only" listbox
 * pattern) styled to match the Karibu warm-light input idiom. Use in place
 * of a native <select> when the visual language needs more control (e.g.
 * the volunteer city picker).
 *
 * Keyboard: Enter/Space/ArrowUp/ArrowDown open the popover; once open,
 * ArrowUp/ArrowDown move the active option, Enter/Space selects it,
 * Escape or Tab closes without changing the selection. Focus never leaves
 * the trigger button, so it's always where it should be on close.
 */

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface KaribuSelectOption {
  value: string;
  label: string;
}

interface KaribuSelectProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly KaribuSelectOption[];
  placeholder?: string;
  error?: string;
}

const triggerCls = (hasError: boolean) =>
  `flex w-full items-center justify-between gap-2 rounded-lg border ${
    hasError ? "border-red-500/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 text-left font-inter text-sm text-ink transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

export function KaribuSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  error,
}: KaribuSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const errorId = `${id}-error`;

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function openList() {
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function selectAndClose(optValue: string) {
    onChange(optValue);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleButtonKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          selectAndClose(options[activeIndex].value);
        } else {
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-describedby={error ? errorId : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleButtonKeyDown}
        className={triggerCls(!!error)}
      >
        <span className={selected ? "text-ink" : "text-ink-muted/70"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-sand-2 bg-paper-card p-1 shadow-lg motion-reduce:transition-none"
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={opt.value === value}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectAndClose(opt.value)}
              className={`cursor-pointer rounded-md px-3 py-2 font-inter text-sm transition-colors ${
                i === activeIndex ? "bg-clay/10 text-ink" : "text-ink-soft"
              } ${opt.value === value ? "font-semibold text-clay" : ""}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-1 font-inter text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
