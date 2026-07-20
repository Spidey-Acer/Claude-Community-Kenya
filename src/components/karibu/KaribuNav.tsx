"use client";

/**
 * KaribuNav — sticky top navigation for the warm-light "Karibu" identity.
 *
 * Mirrors the full information architecture of the Terminal Noir <Navbar />
 * (dropdown menus, Ctrl+K command palette, auth-aware Sign in / Join) but in
 * the warm-light skin. Rendered only on converted routes by ConditionalLayout.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Menu, X, ChevronDown, LayoutDashboard } from "lucide-react";
import { NAV_LINKS, type NavLink } from "@/lib/constants";
import { KaribuThemeToggle } from "@/components/karibu/KaribuThemeToggle";

const CommandPalette = dynamic(
  () => import("@/components/terminal/CommandPalette").then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

function openCommandPalette() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
}

export function KaribuNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  // Shrink + firm up the bar once the visitor scrolls past the hero band.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b border-sand backdrop-blur-md transition-[background-color,box-shadow] duration-200 ${
          scrolled
            ? "bg-paper/[0.96] shadow-[0_2px_20px_-10px_rgba(35,32,27,0.35)]"
            : "bg-paper/[0.86]"
        }`}
      >
        {/* Height snaps between states (no height *animation* — only
         * transform/opacity/paint may animate); the smooth firm-up comes from
         * the nav's background + shadow transition above. */}
        <div
          className={`mx-auto flex max-w-[1180px] items-center justify-between px-5 md:px-10 ${
            scrolled ? "h-14" : "h-16"
          }`}
        >
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            onClick={() => setMobileOpen(false)}
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
            <span className="hidden whitespace-nowrap font-newsreader text-[19px] font-semibold tracking-[-0.01em] text-ink sm:inline">
              Claude Community Kenya
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) =>
              link.children?.length ? (
                <NavDropdown key={link.label} item={link} pathname={pathname} />
              ) : (
                <TopLink key={link.href} href={link.href} active={pathname === link.href}>
                  {link.label}
                </TopLink>
              ),
            )}

            {/* Search */}
            <button
              type="button"
              onClick={openCommandPalette}
              className="ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-inter text-[13px] text-ink-muted transition-colors hover:text-ink"
              aria-label="Open command palette"
            >
              <Search size={15} />
              <kbd className="rounded border border-sand-2 px-1 text-[10px] leading-4">
                {isMac ? "⌘" : "Ctrl+"}K
              </kbd>
            </button>

            <KaribuThemeToggle />

            {/* Auth-aware CTA */}
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-clay px-4 py-2 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="ml-1 px-3 py-2 font-inter text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-clay px-4 py-2 font-inter text-sm font-semibold text-paper-card transition-[background-color,transform] duration-150 ease-[var(--ease-reversible)] hover:scale-[1.03] hover:bg-clay-dark"
                >
                  Join
                </Link>
              </>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 lg:hidden">
            <button
              type="button"
              onClick={openCommandPalette}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <KaribuThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-sand-2 text-ink"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-sand bg-paper px-5 pb-5 pt-2 lg:hidden">
            {NAV_LINKS.map((link) => (
              <div key={link.label} className="border-b border-sand/70 py-1">
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 font-inter text-base font-semibold text-ink"
                >
                  {link.label}
                </Link>
                {link.children?.length ? (
                  <div className="mb-2 flex flex-col gap-1 pl-3">
                    {link.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={() => setMobileOpen(false)}
                        className="py-1.5 font-inter text-sm text-ink-soft"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="mt-4 flex items-center gap-3">
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full bg-clay px-5 py-3 text-center font-inter text-sm font-semibold text-paper-card"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-full border border-sand-2 px-5 py-3 text-center font-inter text-sm font-semibold text-ink"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-full bg-clay px-5 py-3 text-center font-inter text-sm font-semibold text-paper-card"
                  >
                    Join
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <CommandPalette />
    </>
  );
}

/* ─────────────────────────── bits ─────────────────────────── */

function TopLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-2 font-inter text-[14.5px] transition-colors ${
        active ? "text-ink" : "text-ink-soft hover:text-clay"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-3 bottom-1 h-px bg-clay" />}
    </Link>
  );
}

function NavDropdown({ item, pathname }: { item: NavLink; pathname: string }) {
  const active = pathname === item.href || item.children?.some((c) => c.href === pathname);
  return (
    <div className="group relative">
      <Link
        href={item.href}
        className={`flex items-center gap-1 px-3 py-2 font-inter text-[14.5px] transition-colors ${
          active ? "text-ink" : "text-ink-soft group-hover:text-clay"
        }`}
      >
        {item.label}
        <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
      </Link>
      <div className="invisible absolute left-0 top-full z-50 w-72 translate-y-1 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="overflow-hidden rounded-2xl border border-sand bg-paper-card p-2 shadow-[0_12px_40px_-12px_rgba(35,32,27,0.25)]">
          {item.children!.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-paper-alt"
            >
              <div className="font-inter text-[14px] font-semibold text-ink">{c.label}</div>
              {c.description && (
                <div className="mt-0.5 font-inter text-[12.5px] leading-snug text-ink-muted">
                  {c.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
