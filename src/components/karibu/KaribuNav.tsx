"use client";

/**
 * KaribuNav — sticky top navigation for the warm-light "Karibu" identity.
 *
 * Part of the page-by-page redesign. Rendered only on converted routes by
 * ConditionalLayout; un-migrated pages keep the Terminal Noir <Navbar />.
 * Flat link set (mirrors the approved mockup) pointing at real app routes.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SOCIAL_LINKS } from "@/lib/constants";

const NAV_LINKS = [
  { label: "What we do", href: "/#what" },
  { label: "Events", href: "/events" },
  { label: "Learn", href: "/resources" },
  { label: "Community", href: "/community" },
  { label: "About", href: "/about" },
] as const;

export function KaribuNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-sand bg-paper/[0.86] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 md:px-10">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          onClick={() => setMenuOpen(false)}
          aria-label="Claude Community Kenya — home"
        >
          <Image
            src="/images/cck-logo.webp"
            alt="Claude Community Kenya"
            width={38}
            height={38}
            priority
            className="h-9 w-9 rounded-full ring-1 ring-sand-2 transition-transform duration-500 group-hover:scale-105"
          />
          <span className="whitespace-nowrap font-newsreader text-[19px] font-semibold tracking-[-0.01em] text-ink">
            Claude Community Kenya
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-7 font-inter text-[14.5px] text-ink-soft lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-clay"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-3">
          <a
            href={SOCIAL_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-ink px-[18px] py-2.5 font-inter text-sm font-semibold text-paper transition-colors hover:bg-black"
          >
            Join on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-[42px] w-[42px] flex-col items-center justify-center gap-1 rounded-[10px] border border-sand-2 lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="block h-0.5 w-[18px] bg-ink" />
            <span className="block h-0.5 w-[18px] bg-ink" />
            <span className="block h-0.5 w-[18px] bg-ink" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="flex flex-col gap-0.5 border-t border-sand bg-paper px-6 pb-4 pt-2 lg:hidden">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`py-3 font-inter text-base text-ink ${
                i < NAV_LINKS.length - 1 ? "border-b border-sand/70" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
