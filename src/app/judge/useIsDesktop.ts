"use client";

import { useEffect, useState } from "react";

/** The lg breakpoint, where the scoring screen becomes list-plus-detail. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Whether the viewport is wide enough for the two-column scoring layout.
 *
 * Needed as a value, not just a class: the team detail is rendered in ONE
 * place — inline under its row on a phone, in the right-hand pane on a laptop
 * — because rendering it in both and hiding one duplicates every form control
 * and its id, which breaks label association and puts two radio groups with
 * the same name in the accessibility tree.
 *
 * Starts false so the server and the first client render agree (phone layout),
 * then corrects on mount.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const apply = () => setIsDesktop(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return isDesktop;
}
