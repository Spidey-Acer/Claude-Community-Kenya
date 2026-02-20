"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function LoadingBar() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;

      // Skip animation for reduced motion
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      setIsLoading(true);
      setVisible(true);
      setProgress(0);

      // Simulate progress
      let current = 0;
      timerRef.current = setInterval(() => {
        current += Math.random() * 15 + 5;
        if (current >= 90) {
          current = 90;
          if (timerRef.current) clearInterval(timerRef.current);
        }
        setProgress(current);
      }, 100);

      // Complete after a short delay
      const complete = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          setTimeout(() => setVisible(false), 300);
        }, 200);
      }, 500);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        clearTimeout(complete);
      };
    }
  }, [pathname]);

  if (!visible) return null;

  const barWidth = Math.round(progress / 100 * 13);
  const filled = "█".repeat(barWidth);
  const empty = "░".repeat(13 - barWidth);

  return (
    <div
      className={cn(
        "fixed top-16 left-0 right-0 z-40 transition-opacity duration-300",
        isLoading ? "opacity-100" : "opacity-0"
      )}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
    >
      {/* Progress bar */}
      <div
        className="h-0.5 bg-green-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />

      {/* Terminal text overlay */}
      <div className="bg-bg-primary/80 px-4 py-1 font-mono text-xs text-green-dim backdrop-blur-sm">
        Loading {pathname}... [{filled}{empty}] {Math.round(progress)}%
      </div>
    </div>
  );
}
