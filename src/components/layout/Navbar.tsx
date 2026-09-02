"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Search, LayoutDashboard } from "lucide-react";
import { useSession } from "next-auth/react";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { MobileMenu } from "./MobileMenu";
import { NavDropdown } from "./NavDropdown";
import { useSkin } from "@/contexts/SkinContext";

const CommandPalette = dynamic(
  () => import("@/components/terminal/CommandPalette").then((mod) => ({ default: mod.CommandPalette })),
  { ssr: false }
);

export function Navbar() {
  const { skin } = useSkin();
  const { status } = useSession();
  const isPro = skin === "pro";
  const isAuthed = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 60);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 border-b border-border-default backdrop-blur-md transition-all duration-300",
          scrolled
            ? isPro
              ? "bg-bg-primary/95 shadow-[0_1px_12px_rgba(0,0,0,0.2)]"
              : "bg-bg-primary/95 shadow-[0_1px_12px_rgba(0,255,65,0.06)]"
            : "bg-bg-primary/90"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className={cn(
              "group font-bold transition-colors",
              isPro
                ? "font-sans text-text-primary hover:text-text-secondary"
                : "font-mono text-green-primary hover:text-green-dim"
            )}
            aria-label="Claude Community Kenya — Home"
          >
            {/* Mobile + Tablet: crisp circular mark + "CC Kenya" (Pro) or ~/CCK (Dev).
                Previously a wide 599x181 flame raster scaled down to h-4 via a
                plain <img> with no sizing hints — the browser's downscale of
                that much fine detail into 16px rendered as a blurry smear on
                phones. next/image's own logo mark (400x400, simple circle,
                explicit width/height) is what the Karibu public nav already
                uses and stays crisp at 1x and 2x. */}
            {isPro ? (
              <span className="flex items-center gap-1.5 text-sm tracking-tight lg:hidden">
                <Image
                  src="/images/cck-logo.webp"
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full"
                />
                <span
                  className="bg-gradient-to-r from-[#d97757] via-[#e8956f] to-[#d97757] bg-[length:200%_auto] bg-clip-text text-transparent font-bold"
                  style={{ animation: "gradient-shift 3s ease infinite" }}
                >
                  CC Kenya
                </span>
              </span>
            ) : (
              <span className="flex items-center font-mono text-sm lg:hidden">
                <span className="text-text-dim">~/</span>
                <span className="text-green-primary">CCK</span>
                <span className="cursor-blink text-green-primary">▊</span>
              </span>
            )}
            {/* Desktop only */}
            {isPro ? (
              <span className="hidden items-center gap-2 tracking-tight text-lg lg:inline-flex">
                <Image
                  src="/images/cck-logo.webp"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full"
                />
                <span
                  className="bg-gradient-to-r from-[#d97757] via-[#e8956f] to-[#d97757] bg-[length:200%_auto] bg-clip-text text-transparent"
                  style={{ animation: "gradient-shift 3s ease infinite" }}
                >
                  Claude Community Kenya
                </span>
              </span>
            ) : (
              <span className="hidden md:inline">
                <span className="text-text-dim">~/</span>
                <span className="text-green-primary group-hover:drop-shadow-[0_0_6px_rgba(0,255,65,0.4)]">CCK</span>
                <span className="cursor-blink text-green-primary">▊</span>
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              if (link.children && link.children.length > 0) {
                return <NavDropdown key={link.label} item={link} />;
              }
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-2 text-sm transition-colors",
                    isPro ? "font-medium" : "font-mono",
                    isActive
                      ? isPro ? "text-text-primary" : "text-green-primary"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {isActive && !isPro && (
                    <span className="text-green-dim" aria-hidden="true">&gt; </span>
                  )}
                  {isPro ? link.label : link.label.toUpperCase()}
                  {isActive && (
                    <span className={cn(
                      "absolute bottom-0 left-3 right-3 h-px",
                      isPro ? "bg-text-primary" : "bg-green-primary"
                    )} />
                  )}
                </Link>
              );
            })}

            {/* Search trigger */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
              className="ml-2 flex items-center gap-1.5 px-2 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text-secondary"
              aria-label="Open command palette"
            >
              <Search size={14} />
              <kbd className="rounded border border-border-default px-1 text-[10px]">
                {isMac ? "⌘" : "Ctrl+"}K
              </kbd>
            </button>

            {/* Auth-aware CTA */}
            {isAuthed ? (
              <Link
                href="/dashboard"
                className={cn(
                  "ml-2 inline-flex items-center gap-1.5 px-4 py-1.5 text-sm transition-all",
                  isPro
                    ? "rounded-full bg-[#d97757] font-medium text-[#faf9f5] hover:bg-[#c06848]"
                    : "border border-green-primary font-mono text-green-primary hover:bg-green-primary hover:text-bg-primary hover:shadow-[0_0_12px_rgba(0,255,65,0.2)]"
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                {isPro ? "Dashboard" : "DASHBOARD"}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    "ml-2 px-3 py-1.5 text-sm transition-colors",
                    isPro
                      ? "font-medium text-[#b0aea5] hover:text-[#faf9f5]"
                      : "font-mono text-text-secondary hover:text-green-primary"
                  )}
                >
                  {isPro ? "Sign in" : "SIGN_IN"}
                </Link>
                <Link
                  href="/signup"
                  className={cn(
                    "ml-1 px-4 py-1.5 text-sm transition-all",
                    isPro
                      ? "rounded-full bg-[#d97757] font-medium text-[#faf9f5] hover:bg-[#c06848]"
                      : "border border-green-primary font-mono text-green-primary hover:bg-green-primary hover:text-bg-primary hover:shadow-[0_0_12px_rgba(0,255,65,0.2)]"
                  )}
                >
                  {!isPro && <span aria-hidden="true">&gt; </span>}
                  {isPro ? "Join" : "JOIN"}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="flex h-11 w-11 items-center justify-center text-green-primary md:hidden"
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
