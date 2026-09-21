"use client";

/**
 * KaribuNav — sticky top navigation for the warm-light "Karibu" identity.
 *
 * Mirrors the full information architecture of the Terminal Noir <Navbar />
 * (dropdown menus, Ctrl+K command palette, auth-aware Sign in / Join) but in
 * the warm-light skin. Rendered only on converted routes by ConditionalLayout.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Home as HomeIcon,
  CalendarDays,
  BookOpen,
  Plus,
} from "lucide-react";
import { NAV_LINKS, type NavLink } from "@/lib/constants";
import { KaribuThemeToggle } from "@/components/karibu/KaribuThemeToggle";
import { useSocialLinks } from "@/contexts/SocialLinksContext";

/** Cities offered in the mobile sheet's "Your city" chips. Same three the
 * footer and stats card already treat as the real, hosted-at-least-once set. */
const CITIES = ["Nairobi", "Mombasa", "Kisumu"] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CommandPalette = dynamic(
  () => import("@/components/terminal/CommandPalette").then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

function openCommandPalette() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
}

export function KaribuNav({ eventsHeld }: { eventsHeld?: number }) {
  const pathname = usePathname();
  const { status } = useSession();
  const { whatsapp, discord } = useSocialLinks();
  const isAuthed = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [pastHero, setPastHero] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // True once the sheet has actually been opened, so the close branch of the
  // focus trap only fires on a real close — not on first mount, where it would
  // steal focus to the hamburger on every page load.
  const sheetWasOpenRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  // Shrink + firm up the bar once the visitor scrolls past the band above
  // this nav; otherwise the nav "firms up" before the band has even scrolled
  // away. The band's height depends on its sentence (one line on desktop,
  // two on a phone), so it is measured rather than assumed.
  useEffect(() => {
    const onScroll = () => {
      const band = document.querySelector<HTMLElement>("[data-marquee]");
      setScrolled(window.scrollY > (band?.offsetHeight ?? 40));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pinned bottom bar (mobile only) shows once the hero has scrolled out of
  // view. Home's Hero renders a `[data-hero-sentinel]` marker right after
  // itself; pages with no hero (nothing built with PageBanner yet — Phase 3)
  // fall back to a fixed scroll distance so the bar still has a sane trigger.
  useEffect(() => {
    const sentinel = document.querySelector("[data-hero-sentinel]");
    if (!sentinel) {
      const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.7);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    // Direction matters: a sentinel that has not been reached yet is also
    // "not intersecting", so testing that alone showed the bar at the top of
    // the page. Only a sentinel that has scrolled ABOVE the viewport means
    // the hero is behind us.
    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pathname]);

  // Body scroll lock + Escape-to-close while the sheet is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  // Focus trap: move focus into the sheet on open, cycle Tab/Shift+Tab within
  // it, and hand focus back to the toggle button on close.
  useEffect(() => {
    if (!mobileOpen) {
      if (sheetWasOpenRef.current) {
        sheetWasOpenRef.current = false;
        menuButtonRef.current?.focus();
      }
      return;
    }
    sheetWasOpenRef.current = true;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const focusables = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    focusables[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    sheet.addEventListener("keydown", onKeyDown);
    return () => sheet.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMenu = useCallback(() => setMobileOpen(false), []);

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
              className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-soft"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <KaribuThemeToggle />
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-sand-2 text-ink"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="karibu-mobile-sheet"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Full-screen mobile sheet (ports MobileNavOpen.dc.html) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-paper/88 backdrop-blur-xl"
          />
          <div
            ref={sheetRef}
            id="karibu-mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="absolute inset-0 flex flex-col bg-paper"
          >
            <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-sand pl-5 pr-2">
              <Link
                href="/"
                onClick={closeMenu}
                className="flex items-center gap-2"
                aria-label="Claude Community Kenya — home"
              >
                <Image
                  src="/images/cck-logo.webp"
                  alt=""
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] rounded-full"
                />
                <span className="whitespace-nowrap font-newsreader text-[15px] font-medium tracking-[-0.01em] text-ink">
                  Claude Community Kenya
                </span>
              </Link>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center text-ink"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-1">
              {NAV_LINKS.map((link) => (
                <div key={link.label} className="border-b border-sand py-3.5">
                  <div className="flex items-baseline justify-between">
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      className={`font-newsreader text-[28px] leading-tight tracking-[-0.015em] ${
                        pathname === link.href ? "text-clay" : "text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                    {link.label === "Events" && typeof eventsHeld === "number" && eventsHeld > 0 && (
                      <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        {eventsHeld} so far
                      </span>
                    )}
                  </div>
                  {/* Sub-items are visible immediately, no second tap. */}
                  {link.children?.length ? (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                      {link.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={closeMenu}
                          className="inline-flex min-h-7 items-center py-1 font-inter text-[14.5px] font-medium text-ink-soft transition-colors hover:text-clay"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="mt-3.5">
                <div className="mb-2.5 font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Your city
                </div>
                <div className="flex gap-2">
                  {CITIES.map((c) => {
                    const on = city === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCity(on ? null : c)}
                        aria-pressed={on}
                        className={`inline-flex h-10 items-center rounded-full border px-3.5 font-inter text-[13.5px] font-semibold transition-colors ${
                          on ? "border-ink bg-ink text-paper" : "border-sand-2 bg-paper-card text-ink"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-2.5 border-t border-sand bg-paper-card/95 px-5 py-3.5">
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-clay px-6 py-[15px] font-inter text-[15px] font-semibold text-paper-card"
                >
                  Join on WhatsApp
                </a>
              )}
              {discord && (
                <a
                  href={discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-sand-2 px-6 py-[15px] font-inter text-[15px] font-semibold text-ink"
                >
                  Join Discord
                </a>
              )}
              {!isAuthed && (
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="min-h-10 self-center px-3 py-2 font-inter text-sm font-semibold text-ink-soft"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pinned mobile bottom bar — appears once the hero has scrolled out
       * of view. Hidden on lg+ (desktop nav covers this) and while the sheet
       * is open (it would sit under the backdrop anyway). */}
      {pastHero && !mobileOpen && (
        <nav
          aria-label="Quick navigation"
          className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 items-center border-t border-sand bg-paper/95 shadow-[0_-8px_24px_-16px_rgba(35,32,27,0.35)] backdrop-blur-md lg:hidden"
        >
          <BottomBarLink href="/" icon={HomeIcon} label="Home" active={pathname === "/"} />
          <BottomBarLink href="/events" icon={CalendarDays} label="Events" active={pathname.startsWith("/events")} />
          <BottomBarLink href="/resources" icon={BookOpen} label="Learn" active={pathname.startsWith("/resources")} />
          <Link href="/join" className="flex flex-col items-center gap-1 font-inter text-[10.5px] font-semibold text-clay">
            <span className="flex h-8 w-[52px] items-center justify-center rounded-full bg-clay text-paper-card">
              <Plus size={18} aria-hidden="true" />
            </span>
            Join
          </Link>
        </nav>
      )}

      <CommandPalette />
    </>
  );
}

function BottomBarLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof HomeIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 font-inter text-[10.5px] font-semibold ${
        active ? "text-clay" : "text-ink-muted"
      }`}
    >
      <Icon size={20} aria-hidden="true" />
      {label}
    </Link>
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
