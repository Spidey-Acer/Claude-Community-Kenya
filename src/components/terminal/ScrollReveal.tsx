"use client";

import { ReactNode, Children, isValidElement } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  stagger?: number;
  className?: string;
}

const directionOffset = {
  up: { x: 0, y: 30 },
  down: { x: 0, y: -30 },
  left: { x: 30, y: 0 },
  right: { x: -30, y: 0 },
};

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  stagger = 0,
  className,
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const offset = directionOffset[direction];

  // If stagger is set, animate each child separately
  if (stagger > 0) {
    const childArray = Children.toArray(children).filter(isValidElement);

    return (
      <div className={className}>
        {childArray.map((child, i) => (
          <motion.div
            key={i}
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, x: offset.x, y: offset.y }
            }
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.5,
              delay: (delay + i * stagger) / 1000,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {child}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={
        shouldReduceMotion
          ? { opacity: 1 }
          : { opacity: 0, x: offset.x, y: offset.y }
      }
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.5,
        delay: delay / 1000,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
