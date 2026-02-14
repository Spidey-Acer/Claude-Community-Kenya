"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId(openId === id ? null : id);
  }

  return (
    <div className={cn("divide-y divide-border-default border border-border-default", className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div key={item.id} className="bg-bg-card">
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left font-mono text-sm transition-colors hover:bg-bg-elevated"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
            >
              <motion.span
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-green-primary"
              >
                <ChevronRight size={16} />
              </motion.span>
              <span className="text-green-dim">$</span>
              <span className={isOpen ? "text-green-primary" : "text-text-primary"}>
                {item.title}
              </span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  id={`accordion-content-${item.id}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border-default px-5 py-4 pl-14 text-sm text-text-secondary">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
