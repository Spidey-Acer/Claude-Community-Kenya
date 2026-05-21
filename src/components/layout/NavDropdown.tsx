"use client";

import { useState, useRef, useEffect, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSkin } from "@/contexts/SkinContext";
import type { NavLink } from "@/lib/constants";

interface NavDropdownProps {
  item: NavLink;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const HOVER_CLOSE_DELAY_MS = 120;

export function NavDropdown({ item }: NavDropdownProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const pathname = usePathname();

  const children = item.children ?? [];
  const isActive =
    pathname === item.href ||
    children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));

  function cancelClose() {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimeout.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape, focus the trigger
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          "relative inline-flex items-center gap-1 px-3 py-2 text-sm transition-colors",
          isPro ? "font-medium" : "font-mono",
          isActive
            ? isPro
              ? "text-text-primary"
              : "text-green-primary"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        {isActive && !isPro && (
          <span className="text-green-dim" aria-hidden="true">&gt; </span>
        )}
        {isPro ? item.label : item.label.toUpperCase()}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
        {isActive && (
          <span
            className={cn(
              "absolute bottom-0 left-3 right-3 h-px",
              isPro ? "bg-text-primary" : "bg-green-primary",
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={`${item.label} menu`}
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className={cn(
              "absolute left-0 top-full z-50 mt-2 min-w-[260px] overflow-hidden rounded-2xl border backdrop-blur-md",
              isPro
                ? "border-[#2a2a28] bg-[#1e1e1d]/95 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(217,119,87,0.05)]"
                : "border-border-default bg-bg-card/95 shadow-[0_8px_30px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,255,65,0.05)]",
            )}
          >
            <ul className="py-2" role="none">
              {children.map((child) => {
                const childActive =
                  pathname === child.href ||
                  pathname.startsWith(child.href + "/");
                return (
                  <li key={child.href} role="none">
                    <Link
                      href={child.href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block px-4 py-2.5 transition-colors",
                        isPro
                          ? childActive
                            ? "bg-[#252524] text-[#faf9f5]"
                            : "text-[#e8e6dc] hover:bg-[#252524] hover:text-[#faf9f5]"
                          : childActive
                            ? "bg-green-primary/10 text-green-primary"
                            : "font-mono text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                      )}
                    >
                      <div className={cn(
                        "text-[13.5px]",
                        isPro ? "font-medium" : "font-mono",
                      )}>
                        {isPro ? child.label : child.label.toUpperCase()}
                      </div>
                      {child.description && isPro && (
                        <div className="mt-0.5 text-[12px] text-[#7a7870]">
                          {child.description}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
