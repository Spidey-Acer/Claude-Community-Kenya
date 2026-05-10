"use client";

import { useSkin } from "@/contexts/SkinContext";
import { getPersonaContent, type SectionContent } from "@/data/persona-content";

export function usePersonaContent(page: string, section: string): SectionContent {
  const { skin } = useSkin();
  return getPersonaContent(page, section, skin ?? "pro");
}
