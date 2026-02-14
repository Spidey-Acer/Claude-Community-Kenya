"use client";

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

export function CRTGlow({
  children,
  intensity = "subtle",
  color = "green",
  className,
}: CRTGlowProps) {
  const { r, g, b } = colorMap[color];
  const { spread1, spread2, alpha1, alpha2 } = intensityMap[intensity];

  const boxShadow = [
    `0 0 ${spread1}px rgba(${r}, ${g}, ${b}, ${alpha1})`,
    `0 0 ${spread2}px rgba(${r}, ${g}, ${b}, ${alpha2})`,
    `inset 0 0 ${spread1}px rgba(${r}, ${g}, ${b}, ${alpha2 * 0.5})`,
  ].join(", ");

  const hoverBoxShadow = [
    `0 0 ${spread1 * 1.5}px rgba(${r}, ${g}, ${b}, ${alpha1 * 1.5})`,
    `0 0 ${spread2 * 1.5}px rgba(${r}, ${g}, ${b}, ${alpha2 * 1.5})`,
    `inset 0 0 ${spread1 * 1.5}px rgba(${r}, ${g}, ${b}, ${alpha2 * 0.8})`,
  ].join(", ");

  return (
    <div
      className={cn("transition-shadow duration-500", className)}
      style={
        {
          boxShadow,
          "--hover-glow": hoverBoxShadow,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          getComputedStyle(e.currentTarget).getPropertyValue("--hover-glow");
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = boxShadow;
      }}
    >
      {children}
    </div>
  );
}
