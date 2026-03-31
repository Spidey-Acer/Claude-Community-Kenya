"use client";

import { CommandPrefix } from "@/components/terminal";
import { usePersonaContent } from "@/hooks/usePersonaContent";

interface PersonaHeadingProps {
  page: string;
  section: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  showPrefix?: boolean;
  prefixSymbol?: "$" | ">" | "#";
}

export function PersonaHeading({
  page,
  section,
  as: Tag = "h2",
  className = "mb-2 font-mono text-xl text-green-primary",
  showPrefix = true,
  prefixSymbol = "$",
}: PersonaHeadingProps) {
  const content = usePersonaContent(page, section);
  if (!content.heading) return null;

  return (
    <Tag className={className}>
      {showPrefix && <CommandPrefix symbol={prefixSymbol} />}
      {content.heading}
    </Tag>
  );
}
