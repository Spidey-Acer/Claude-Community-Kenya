"use client";

/**
 * KaribuThemeToggle — light/dark switch for the warm-light "Karibu" identity.
 *
 * Only touches the Karibu paper/ink/sand/clay tokens (via the `data-theme`
 * attribute on <html>, read by the CSS in globals.css). Does not affect the
 * Terminal Noir `.persona-pro` theme, which stays permanently dark.
 *
 * Precedence: with no stored choice, the system `prefers-color-scheme` media
 * query drives the palette. Once a visitor clicks this toggle, the explicit
 * choice is written to `data-theme` and persisted to localStorage, and wins
 * over the system preference from then on (see the layout.tsx init script
 * and the `:root[data-theme="..."]` rules in globals.css).
 */

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "cck-theme";

type Theme = "light" | "dark";

function getEffectiveTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function KaribuThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getEffectiveTheme());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, etc.) — theme still applies
      // for this page load via the attribute set above.
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-clay"
    >
      {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
