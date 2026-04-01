"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Persona = "dev" | "pro";

interface PersonaContextValue {
  persona: Persona | null;
  setPersona: (p: Persona) => void;
  isLoaded: boolean;
}

const PersonaContext = createContext<PersonaContextValue>({
  persona: null,
  setPersona: () => {},
  isLoaded: false,
});

const STORAGE_KEY = "cck-persona";

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Persona | null;
    if (stored === "dev" || stored === "pro") {
      setPersonaState(stored);
    }
    setIsLoaded(true);
  }, []);

  // Apply/remove .persona-pro class on <html> when persona changes
  useEffect(() => {
    if (persona === "pro") {
      document.documentElement.classList.add("persona-pro");
    } else {
      document.documentElement.classList.remove("persona-pro");
    }
  }, [persona]);

  const setPersona = useCallback((p: Persona) => {
    setPersonaState(p);
    localStorage.setItem(STORAGE_KEY, p);
  }, []);

  return (
    <PersonaContext.Provider value={{ persona, setPersona, isLoaded }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return context;
}
