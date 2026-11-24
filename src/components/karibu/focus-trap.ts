/**
 * Focus trap helpers for modal dialogs: Tab and Shift+Tab cycle inside the
 * container. `nextFocusIndex` is the pure wrap-around rule (unit-tested);
 * `handleTrapKeyDown` applies it to the live DOM. Escape and focus return are
 * the caller's job (see KaribuModal).
 */

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Index to focus after Tab (or Shift+Tab) among `count` focusable items.
 * Returns `null` when the browser's own move stays inside the list, meaning
 * the caller must not intercept. `current` is -1 when focus is outside.
 */
export function nextFocusIndex(count: number, current: number, backwards: boolean): number | null {
  if (count === 0) return null;
  if (backwards && current <= 0) return count - 1;
  if (!backwards && current === count - 1) return 0;
  if (current === -1) return backwards ? count - 1 : 0;
  return null;
}

/** Keep Tab/Shift+Tab inside `container`; call from a keydown handler. */
export function handleTrapKeyDown(event: ReactKeyboardEvent | KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const current = focusables.indexOf(document.activeElement as HTMLElement);
  const target = nextFocusIndex(focusables.length, current, event.shiftKey);
  if (target === null) return;
  event.preventDefault();
  focusables[target].focus();
}
