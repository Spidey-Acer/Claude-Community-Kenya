"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MatrixRainProps {
  speed?: number;
  density?: number;
  opacity?: number;
  className?: string;
}

const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";

export function MatrixRain({
  speed = 50,
  density = 0.3,
  opacity = 0.05,
  className,
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let columns: number[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const fontSize = 14;
      const colCount = Math.floor(canvas.width / fontSize);
      columns = Array.from({ length: colCount }, () =>
        Math.random() * canvas.height
      );
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = (timestamp: number) => {
      if (timestamp - lastFrameRef.current < speed) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = timestamp;

      const fontSize = 14;

      // Fade previous frame
      ctx.fillStyle = `rgba(10, 10, 10, 0.1)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(opacity * 3, 0.4)})`;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns.length; i++) {
        // Skip some columns based on density
        if (Math.random() > density) continue;

        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;
        const y = columns[i];

        ctx.fillText(char, x, y);

        // Reset to top randomly or when off-screen
        if (y > canvas.height && Math.random() > 0.975) {
          columns[i] = 0;
        } else {
          columns[i] += fontSize;
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [speed, density, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
