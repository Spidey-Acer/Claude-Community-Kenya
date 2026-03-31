"use client";

import { usePersona } from "@/contexts/PersonaContext";
import { getPersonaContent, type SectionContent } from "@/data/persona-content";

export function usePersonaContent(page: string, section: string): SectionContent {
  const { persona } = usePersona();
  return getPersonaContent(page, section, persona ?? "pro");
}
