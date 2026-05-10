"use client";

import { useEffect, useRef } from "react";
import type { Skin } from "@/contexts/SkinContext";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface ParticleCanvasProps {
  selected: Skin;
  onComplete: () => void;
}

export function ParticleCanvas({ selected, onComplete }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const particleCount = 120;
    const isDevSelected = selected === "dev";

    const rejectedStartX = isDevSelected ? canvas.width / 2 : 0;
    const rejectedEndX = isDevSelected ? canvas.width : canvas.width / 2;
    const targetX = isDevSelected ? canvas.width * 0.25 : canvas.width * 0.75;
    const rejectedColor = isDevSelected ? "#ffb000" : "#00ff41";

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: rejectedStartX + Math.random() * (rejectedEndX - rejectedStartX),
        y: Math.random() * canvas.height,
        targetX,
        vx: 0,
        vy: 0,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        color: rejectedColor,
      });
    }

    let frame = 0;
    const maxFrames = 60;
    let animId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const progress = frame / maxFrames;

      for (const p of particles) {
        p.vx += (p.targetX - p.x) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.5;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.98;
        p.size *= 0.995;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          p.color +
          Math.round(p.alpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();
      }

      if (progress > 0.5) {
        const flashAlpha = Math.sin((progress - 0.5) * Math.PI) * 0.3;
        const flashColor = isDevSelected
          ? `rgba(0, 255, 65, ${flashAlpha})`
          : `rgba(255, 176, 0, ${flashAlpha})`;
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      frame++;
      if (frame < maxFrames) {
        animId = requestAnimationFrame(animate);
      } else {
        onCompleteRef.current();
      }
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selected]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[201]"
      aria-hidden="true"
    />
  );
}
