"use client";

/**
 * KaribuNav: sticky top navigation for the warm-light "Karibu" identity.
 *
 * Spec S1: Events, Learn, Showcase, Reports, About plus a Join button on
 * desktop; the same doors in the mobile sheet; a Home / Events / Learn /
 * Showcase / Join bottom bar on phones. Links come from `nav-links.ts`.
 * Link lists are real <ul>/<li>, the active page carries aria-current="page".
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Menu,
  X,
  LayoutDashboard,
  Home as HomeIcon,
  CalendarDays,
  BookOpen,
  Sparkles,
  Plus,
} from "lucide-react";
import { BOTTOM_BAR_NAV, JOIN_NAV, PRIMARY_NAV, isNavActive, type NavItem } from "@/components/karibu/nav-links";
import { KaribuThemeToggle } from "@/components/karibu/KaribuThemeToggle";
import { useSocialLinks } from "@/contexts/SocialLinksContext";

/** Cities offered in the mobile sheet's "Your city" chips. Same three the
 * footer and stats card already treat as the real, hosted-at-least-once set. */
const CITIES = ["Nairobi", "Mombasa", "Kisumu"] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function KaribuNav({ eventsHeld }: { eventsHeld?: number }) {
  const pathname = usePathname();
  const { status } = useSession();
  const { whatsapp, discord } = useSocialLinks();
  const isAuthed = status === "authenticated";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [pastHero, setPastHero] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // True once the sheet has actually been opened, so the close branch of the
  // focus trap only fires on a real close — not on first mount, where it would
  // steal focus to the hamburger on every page load.
  const sheetWasOpenRef = useRef(false);

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
        aria-label="Primary"
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
            <ul className="flex items-center gap-1">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <TopLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>

            <KaribuThemeToggle />

            {isAuthed ? (
              <Link
                href="/dashboard"
                className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-sand-2 px-4 py-2 font-inter text-sm font-semibold text-ink transition-colors hover:border-ink"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="ml-1 px-3 py-2 font-inter text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Sign in
              </Link>
            )}
            <Link
              href={JOIN_NAV.href}
              aria-current={isNavActive(pathname, JOIN_NAV) ? "page" : undefined}
              className="rounded-full bg-band-bg px-4 py-2 font-inter text-sm font-semibold text-on-band transition-[background-color,transform] duration-150 ease-[var(--ease-reversible)] hover:scale-[1.03] hover:bg-band-bg-hover"
            >
              {JOIN_NAV.label}
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 lg:hidden">
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
              <ul>
                {[...PRIMARY_NAV, JOIN_NAV].map((item) => (
                  <li key={item.href} className="flex items-baseline justify-between border-b border-sand">
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={isNavActive(pathname, item) ? "page" : undefined}
                      className={`flex min-h-11 flex-1 items-center py-3.5 font-newsreader text-[28px] leading-tight tracking-[-0.015em] ${
                        isNavActive(pathname, item) ? "text-clay" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {item.href === "/events" && typeof eventsHeld === "number" && eventsHeld > 0 && (
                      <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        {eventsHeld} so far
                      </span>
                    )}
                  </li>
                ))}
              </ul>

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

      {/* Pinned mobile bottom bar: appears once the hero has scrolled out
       * of view. Hidden on lg+ (desktop nav covers this) and while the sheet
       * is open (it would sit under the backdrop anyway). */}
      {pastHero && !mobileOpen && (
        <nav
          aria-label="Quick navigation"
          className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-sand bg-paper/95 shadow-[0_-8px_24px_-16px_rgba(35,32,27,0.35)] backdrop-blur-md lg:hidden"
        >
          <ul className="grid h-full grid-cols-5 items-center">
            {BOTTOM_BAR_NAV.map((item) => (
              <li key={item.href} className="h-full">
                <BottomBarLink item={item} pathname={pathname} />
              </li>
            ))}
            <li className="h-full">
              <Link
                href={JOIN_NAV.href}
                aria-current={isNavActive(pathname, JOIN_NAV) ? "page" : undefined}
                className="flex h-full min-h-11 flex-col items-center justify-center gap-1 font-inter text-[10.5px] font-semibold text-clay"
              >
                <span className="flex h-8 w-[52px] items-center justify-center rounded-full bg-band-bg text-on-band">
                  <Plus size={18} aria-hidden="true" />
                </span>
                {JOIN_NAV.label}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}

const BOTTOM_BAR_ICONS: Record<string, typeof HomeIcon> = {
  "/": HomeIcon,
  "/events": CalendarDays,
  "/resources": BookOpen,
  "/showcase": Sparkles,
};

function BottomBarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = BOTTOM_BAR_ICONS[item.href] ?? HomeIcon;
  const active = isNavActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-full min-h-11 flex-col items-center justify-center gap-1 font-inter text-[10.5px] font-semibold ${
        active ? "text-clay" : "text-ink-muted"
      }`}
    >
      <Icon size={20} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

/* ─────────────────────────── bits ─────────────────────────── */

function TopLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isNavActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative px-3 py-2 font-inter text-[14.5px] transition-colors ${
        active ? "text-ink" : "text-ink-soft hover:text-clay"
      }`}
    >
      {item.label}
      {active && <span className="absolute inset-x-3 bottom-1 h-px bg-clay" />}
    </Link>
  );
}
