"use client";

import { usePersona } from "@/contexts/PersonaContext";
import { motion } from "framer-motion";

export function TypingIndicator() {
  const { persona } = usePersona();

  if (persona === "dev") {
    return (
      <span className="inline-block font-mono text-green-primary text-sm animate-pulse">
        █
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#d97757]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </span>
  );
}
