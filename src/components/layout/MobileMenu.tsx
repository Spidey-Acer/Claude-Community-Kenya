"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          className="fixed inset-0 z-40 flex flex-col bg-bg-primary/95 backdrop-blur-md pt-16 md:hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Terminal header */}
          <div className="border-b border-border-default px-6 py-3">
            <span className="font-mono text-xs text-text-dim">
              $ ls ./navigation
            </span>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1 p-6" aria-label="Mobile navigation">
            {NAV_LINKS.map((link, index) => {
              const isActive = pathname === link.href;
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "block py-3 font-mono text-lg transition-colors",
                      isActive
                        ? "text-green-primary"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <span className="text-green-dim" aria-hidden="true">&gt; </span>
                    {link.label.toUpperCase()}
                  </Link>
                </motion.div>
              );
            })}

            {/* Join CTA */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: NAV_LINKS.length * 0.05 }}
              className="mt-4"
            >
              <Link
                href="/join"
                onClick={onClose}
                className="inline-block border border-green-primary px-6 py-3 font-mono text-lg text-green-primary transition-all hover:bg-green-primary hover:text-bg-primary"
              >
                <span aria-hidden="true">&gt; </span>JOIN
              </Link>
            </motion.div>
          </nav>

          {/* Bottom terminal decoration */}
          <div className="mt-auto border-t border-border-default px-6 py-4">
            <span className="font-mono text-xs text-text-dim">
              claude-community-kenya v1.0.0
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
