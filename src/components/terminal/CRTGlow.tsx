"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CRTGlowProps {
  children: React.ReactNode;
  intensity?: "subtle" | "medium" | "intense";
  color?: "green" | "amber" | "red" | "cyan";
  className?: string;
}

const colorMap = {
  green: { r: 0, g: 255, b: 65 },
  amber: { r: 255, g: 176, b: 0 },
  red: { r: 255, g: 51, b: 51 },
  cyan: { r: 0, g: 212, b: 255 },
};

const intensityMap = {
  subtle: { spread1: 5, spread2: 10, alpha1: 0.1, alpha2: 0.05 },
  medium: { spread1: 10, spread2: 20, alpha1: 0.2, alpha2: 0.1 },
  intense: { spread1: 15, spread2: 35, alpha1: 0.3, alpha2: 0.15 },
};

function buildShadow(r: number, g: number, b: number, spread1: number, spread2: number, alpha1: number, alpha2: number) {
  return [
    `0 0 ${spread1}px rgba(${r}, ${g}, ${b}, ${alpha1})`,
    `0 0 ${spread2}px rgba(${r}, ${g}, ${b}, ${alpha2})`,
    `inset 0 0 ${spread1}px rgba(${r}, ${g}, ${b}, ${alpha2 * 0.5})`,
  ].join(", ");
}

export function CRTGlow({
  children,
  intensity = "subtle",
  color = "green",
  className,
}: CRTGlowProps) {
  const [hovered, setHovered] = useState(false);
  const { r, g, b } = colorMap[color];
  const { spread1, spread2, alpha1, alpha2 } = intensityMap[intensity];

  const multiplier = hovered ? 1.5 : 1;
  const boxShadow = buildShadow(
    r, g, b,
    spread1 * multiplier,
    spread2 * multiplier,
    alpha1 * multiplier,
    alpha2 * multiplier
  );

  return (
    <div
      className={cn("transition-shadow duration-500", className)}
      style={{ boxShadow }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}
