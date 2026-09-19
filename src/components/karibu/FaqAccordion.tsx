"use client";

/**
 * FaqAccordion — the single-open FAQ accordion shared by home, /faq, /join,
 * and event detail pages. Extracted from KaribuFaq's inline FaqItem so those
 * pages share one implementation instead of drifting.
 */

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface FaqAccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqAccordionItem[];
  /** Card vs. bare-list rule style. Home uses "rule" (ports Main.dc.html); /faq uses "card". */
  variant?: "card" | "rule";
  className?: string;
}

export function FaqAccordion({ items, variant = "card", className }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const reduce = useReducedMotion();

  return (
    <div className={variant === "card" ? `space-y-4 ${className ?? ""}` : className}>
      {items.map((item, i) => (
        <FaqRow
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
          variant={variant}
          isLast={i === items.length - 1}
          reduce={!!reduce}
        />
      ))}
    </div>
  );
}

function FaqRow({
  item,
  isOpen,
  onToggle,
  variant,
  isLast,
  reduce,
}: {
  item: FaqAccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  variant: "card" | "rule";
  isLast: boolean;
  reduce: boolean;
}) {
  const wrapper =
    variant === "card"
      ? "overflow-hidden rounded-2xl border border-sand bg-paper-card"
      : `border-t border-sand ${isLast ? "border-b" : ""}`;
  const buttonPad = variant === "card" ? "px-6 py-5" : "py-5";

  return (
    <div className={wrapper}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${item.id}`}
        id={`faq-question-${item.id}`}
        className={`flex w-full items-center justify-between gap-4 text-left transition-colors ${buttonPad} ${
          variant === "card" ? "hover:bg-paper-alt/40" : ""
        }`}
      >
        <span
          className={
            variant === "card"
              ? "font-newsreader text-[19px] leading-snug text-ink"
              : "font-inter text-[17px] font-medium text-ink"
          }
        >
          {item.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-clay" : "text-ink-muted"}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            id={`faq-answer-${item.id}`}
            role="region"
            aria-labelledby={`faq-question-${item.id}`}
            initial={reduce ? { height: "auto" } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { height: "auto" } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p
              className={`font-inter text-[15px] leading-[1.6] text-ink-soft ${
                variant === "card" ? "px-6 pb-6" : "max-w-[560px] pb-6"
              }`}
            >
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
