"use client";

import { usePersonaContent } from "@/hooks/usePersonaContent";

interface PersonaTextProps {
  page: string;
  section: string;
  field: "heading" | "subtitle" | "description";
  className?: string;
  as?: "p" | "span" | "div";
}

export function PersonaText({
  page,
  section,
  field,
  className,
  as: Tag = "p",
}: PersonaTextProps) {
  const content = usePersonaContent(page, section);
  const text = content[field];
  if (!text) return null;

  return <Tag className={className}>{text}</Tag>;
}
