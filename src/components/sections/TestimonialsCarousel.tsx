"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { usePersona } from "@/contexts/PersonaContext"

interface Testimonial {
  quote: string
  name: string
  role: string
}

const testimonials: Testimonial[] = [
  {
    quote: "CCK connected me with developers who actually build with AI — not just talk about it. My first hackathon team came from a CCK meetup.",
    name: "Brian Ochieng",
    role: "Software Engineer, Nairobi",
  },
  {
    quote: "I learned more about Claude Code in one CCK session than a month of solo experimentation. The community accelerates everything.",
    name: "Faith Njeri",
    role: "Full-Stack Developer",
  },
  {
    quote: "As a student, CCK showed me that AI careers are possible right here in Kenya. The mentorship and energy at events is unmatched.",
    name: "Kevin Mwangi",
    role: "CS Student, University of Nairobi",
  },
  {
    quote: "The demo slot at CCK Nairobi #2 got my project real users. Where else do you get to ship live in front of 30 developers who actually care?",
    name: "Amina Hassan",
    role: "Indie Developer, Mombasa",
  },
]

export function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const { persona } = usePersona()
  const isPro = persona === "pro"

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, prefersReducedMotion])

  const t = testimonials[current]

  return (
    <div className="relative overflow-hidden">
      <div className="min-h-[140px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={current}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="text-center max-w-2xl mx-auto px-4"
          >
            {isPro ? (
              <>
                <p className="text-sm sm:text-base leading-relaxed mb-4" style={{ color: "#b0aea5" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="text-xs" style={{ color: "#7a7870" }}>
                  — {t.name}, <span style={{ color: "#7a7870", opacity: 0.7 }}>{t.role}</span>
                </footer>
              </>
            ) : (
              <>
                <p className="font-mono text-sm sm:text-base text-text-secondary leading-relaxed mb-4">
                  <span className="text-green-primary">&gt; </span>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="font-mono text-xs text-text-dim">
                  — {t.name}, <span className="text-text-dim/70">{t.role}</span>
                </footer>
              </>
            )}
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* Navigation dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              isPro
                ? i === current
                  ? "w-4"
                  : "w-1.5 bg-[#7a7870]/30 hover:bg-[#7a7870]/50"
                : i === current
                  ? "bg-green-primary w-4"
                  : "w-1.5 bg-text-dim/30 hover:bg-text-dim/50"
            )}
            style={isPro && i === current ? { backgroundColor: "#d97757", width: "1rem" } : undefined}
            aria-label={`View testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
