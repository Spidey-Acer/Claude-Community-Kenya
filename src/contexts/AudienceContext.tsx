"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Audience, Intent, Experience } from "@/lib/karibu/types";

/**
 * Shape of the server-hydrated audience state available to client components.
 * All fields default to null when no personalization data has been collected.
 */
export interface AudienceState {
  audience: Audience | null;
  intent: Intent | null;
  experience: Experience | null;
  name: string | null;
  city: string | null;
  language: string | null;
}

const DEFAULT: AudienceState = {
  audience: null,
  intent: null,
  experience: null,
  name: null,
  city: null,
  language: null,
};

const AudienceContext = createContext<AudienceState>(DEFAULT);

/**
 * Provides server-hydrated audience state to client components.
 * The `value` is computed on the server from cookies + DB and passed once per
 * request. Updates to audience state happen via `/api/karibu/*` endpoints that
 * set cookies; the next page render reads them server-side and re-hydrates this
 * context anew — making this context effectively read-only on the client.
 */
export function AudienceProvider({
  value,
  children,
}: {
  value: AudienceState;
  children: ReactNode;
}) {
  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

/**
 * Returns the current visitor's audience state.
 * Returns the DEFAULT (all nulls) when no AudienceProvider is in the tree,
 * so consumers can safely render unpersonalized fallbacks without throwing.
 */
export function useAudience() {
  return useContext(AudienceContext);
}
