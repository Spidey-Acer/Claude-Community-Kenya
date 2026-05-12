"use client";

import { CommandPrefix } from "@/components/terminal";
import { useSkin } from "@/contexts/SkinContext";
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
  const { skin } = useSkin();
  const content = usePersonaContent(page, section);
  if (!content.heading) return null;

  // CommandPrefix returns null in pro mode, so showPrefix still works
  return (
    <Tag className={className}>
      {showPrefix && <CommandPrefix symbol={prefixSymbol} />}
      {content.heading}
    </Tag>
  );
}
