"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./MobileMenu";
import { CommandPalette } from "@/components/terminal/CommandPalette";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-border-default bg-bg-primary/90 backdrop-blur-md"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="font-mono text-lg font-bold text-green-primary transition-colors hover:text-green-dim"
            aria-label="Claude Community Kenya — Home"
          >
            <span className="text-text-dim">~/</span>
            <span className="text-green-primary">CCK</span>
            <span className="cursor-blink text-green-primary">▊</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-2 font-mono text-sm transition-colors",
                    isActive
                      ? "text-green-primary"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {isActive && (
                    <span className="text-green-dim">&gt; </span>
                  )}
                  {link.label.toUpperCase()}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-px bg-green-primary" />
                  )}
                </Link>
              );
            })}

            {/* Search trigger */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
              className="ml-2 flex items-center gap-1.5 px-2 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text-secondary"
              aria-label="Open command palette (Ctrl+K)"
            >
              <Search size={14} />
              <kbd className="rounded border border-border-default px-1 text-[10px]">⌘K</kbd>
            </button>

            {/* Join CTA */}
            <Link
              href="/join"
              className="ml-2 border border-green-primary px-4 py-1.5 font-mono text-sm text-green-primary transition-all hover:bg-green-primary hover:text-bg-primary"
            >
              &gt; JOIN
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="flex items-center justify-center p-2 text-green-primary md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Command Palette (global) */}
      <CommandPalette />

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
