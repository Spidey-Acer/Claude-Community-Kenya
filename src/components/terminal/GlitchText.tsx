"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface GlitchTextProps {
  children: React.ReactNode;
  intensity?: "subtle" | "medium" | "intense";
  trigger?: "hover" | "always" | "once";
  className?: string;
}

const intensityConfig = {
  subtle: {
    offset: "2px",
    duration: "0.3s",
    skewDuration: "0.5s",
  },
  medium: {
    offset: "3px",
    duration: "0.4s",
    skewDuration: "0.7s",
  },
  intense: {
    offset: "5px",
    duration: "0.6s",
    skewDuration: "1s",
  },
};

export function GlitchText({
  children,
  intensity = "subtle",
  trigger = "hover",
  className,
}: GlitchTextProps) {
  const [isActive, setIsActive] = useState(trigger === "always");
  const [hasPlayed, setHasPlayed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = intensityConfig[intensity];

  // "once" trigger: play on first visibility
  useEffect(() => {
    if (trigger !== "once" || hasPlayed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsActive(true);
          setHasPlayed(true);
          setTimeout(() => setIsActive(false), parseFloat(config.duration) * 1000 + 200);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    const el = ref.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [trigger, hasPlayed, config.duration]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative inline-block",
        trigger === "hover" && "glitch-hover",
        trigger === "always" && "glitch-continuous",
        className
      )}
      onMouseEnter={trigger === "hover" ? () => setIsActive(true) : undefined}
      onMouseLeave={trigger === "hover" ? () => setIsActive(false) : undefined}
      style={
        {
          "--glitch-offset": config.offset,
        } as React.CSSProperties
      }
    >
      {/* Base text */}
      <div className="relative">{children}</div>

      {/* Glitch layers — only visible when active */}
      {isActive && (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              color: "var(--red)",
              clipPath: "inset(40% 0 60% 0)",
              transform: `translate(${config.offset}, 0)`,
              animation: `glitch-skew ${config.skewDuration} steps(2) infinite`,
            }}
            aria-hidden="true"
          >
            {children}
          </div>
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              color: "var(--cyan)",
              clipPath: "inset(60% 0 20% 0)",
              transform: `translate(-${config.offset}, 0)`,
              animation: `glitch-skew ${config.skewDuration} steps(2) reverse infinite`,
            }}
            aria-hidden="true"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
