"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Skin = "dev" | "pro";

interface SkinContextValue {
  skin: Skin | null;
  setSkin: (s: Skin) => void;
  isLoaded: boolean;
}

const SkinContext = createContext<SkinContextValue>({
  skin: null,
  setSkin: () => {},
  isLoaded: false,
});

const STORAGE_KEY = "cck-skin";
const LEGACY_KEY = "cck-persona";

/**
 * React context provider for the visual skin (Dev/Pro mood).
 * Reads localStorage on mount; migrates legacy `cck-persona` value.
 */
export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<Skin | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Skin | null;
    if (stored === "dev" || stored === "pro") {
      setSkinState(stored);
    } else {
      const legacy = localStorage.getItem(LEGACY_KEY) as Skin | null;
      if (legacy === "dev" || legacy === "pro") {
        setSkinState(legacy);
        localStorage.setItem(STORAGE_KEY, legacy);
      } else {
        // First visit: default to pro skin — premium experience for new visitors.
        // Dev skin remains available via the discrete footer toggle.
        setSkinState("pro");
        localStorage.setItem(STORAGE_KEY, "pro");
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (skin === "pro") {
      document.documentElement.classList.add("persona-pro");
    } else {
      document.documentElement.classList.remove("persona-pro");
    }
  }, [skin]);

  const setSkin = useCallback((s: Skin) => {
    setSkinState(s);
    localStorage.setItem(STORAGE_KEY, s);
  }, []);

  return (
    <SkinContext.Provider value={{ skin, setSkin, isLoaded }}>
      {children}
    </SkinContext.Provider>
  );
}

/**
 * Hook to read the current skin and set a new one.
 * Throws if used outside SkinProvider.
 */
export function useSkin() {
  const context = useContext(SkinContext);
  if (!context) {
    throw new Error("useSkin must be used within SkinProvider");
  }
  return context;
}
