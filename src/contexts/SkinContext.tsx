"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Skin = "dev" | "pro";

interface SkinContextValue {
  skin: Skin;
  isLoaded: boolean;
}

/**
 * The visual skin used to be user-selectable: a discrete footer button and a
 * mobile-menu toggle (both since removed) let a visitor flip between this
 * "pro" skin and a Terminal Noir "dev" skin, persisted to localStorage as
 * `cck-skin` (migrated from an even older `cck-persona` key) and mirrored
 * onto <html> as a `persona-pro` class.
 *
 * Both writers are gone — Karibu is the site's one public identity now — so
 * this always resolves to "pro". No localStorage read or write, no <html>
 * class mutation: layout.tsx already sets `persona-pro` statically at the
 * server, which is now simply always correct.
 *
 * Kept as a context (rather than deleted outright) because dozens of
 * components on the still-not-yet-converted legacy routes read `useSkin()`
 * to pick their "pro" rendering branch; every one of them now always takes
 * that branch. Retiring the hook itself — and the now-unreachable "dev"
 * branches it guards — is a larger follow-up, not this fix.
 */
const FIXED_VALUE: SkinContextValue = { skin: "pro", isLoaded: true };

const SkinContext = createContext<SkinContextValue>(FIXED_VALUE);

export function SkinProvider({ children }: { children: ReactNode }) {
  return <SkinContext.Provider value={FIXED_VALUE}>{children}</SkinContext.Provider>;
}

/** Hook to read the (now fixed) skin. Throws if used outside SkinProvider. */
export function useSkin() {
  const context = useContext(SkinContext);
  if (!context) {
    throw new Error("useSkin must be used within SkinProvider");
  }
  return context;
}
