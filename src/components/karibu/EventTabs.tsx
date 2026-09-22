"use client";

/**
 * Tabbed body for the public event page (About / Winners / Judges) — see
 * KaribuEventDetail. Every panel renders into the DOM up front (the content
 * is server-rendered, deep-linked, and indexed) and only the active one is
 * visible; inactive panels carry the `hidden` attribute rather than being
 * unmounted.
 *
 * WAI-ARIA tabs pattern with automatic activation: `role="tablist"` /
 * `role="tab"` / `role="tabpanel"`, roving `tabIndex` (only the selected tab
 * is in the page tab order), and Left/Right/Home/End move focus and select
 * together.
 *
 * Hash sync: `#results` and `#winners` select the winners tab, `#judges`
 * selects judges, `#about` selects about, anything else keeps `defaultId`.
 * Selecting a tab replaces the hash (no history entry, no scroll jump).
 * `hashchange` is watched too, so an in-page link elsewhere on the page
 * (`href="#results"`) still switches tabs after mount — see
 * `src/components/karibu/event-tabs.ts` for the pure hash/key math this
 * relies on.
 */

import { useEffect, useId, useRef, useState } from "react";
import { nextIndex, tabIdFromHash } from "@/components/karibu/event-tabs";

export interface EventTab {
  id: string;
  label: string;
  children: React.ReactNode;
}

const ARROW_KEYS = ["ArrowLeft", "ArrowRight", "Home", "End"];

export function EventTabs({ tabs, defaultId }: { tabs: EventTab[]; defaultId: string }) {
  const uid = useId();
  const ids = tabs.map((t) => t.id);
  const [activeId, setActiveId] = useState(defaultId);
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasMounted = useRef(false);
  const idsKey = ids.join(",");

  // The hash may name a tab (e.g. a shared `#results` link) — honor it once
  // on mount, without scrolling: the page has just loaded at whatever
  // position the browser already put it.
  useEffect(() => {
    setActiveId(tabIdFromHash(window.location.hash, ids, defaultId));
    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In-page links to `#results` / `#judges` / `#about` still work after
  // mount, and this is the one case that scrolls the tab bar into view —
  // the reader followed a link to a section they weren't looking at.
  useEffect(() => {
    function onHashChange() {
      const id = tabIdFromHash(window.location.hash, ids, defaultId);
      setActiveId(id);
      if (hasMounted.current) {
        // `behavior: "auto"` (never "smooth") is the reduced-motion-safe choice.
        tablistRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      }
    }
    // The set of tabs can grow after mount (the judges tab appears once its
    // panel has loaded), so a hash that named a tab not yet offered is
    // re-read here, without the scroll.
    if (hasMounted.current) setActiveId(tabIdFromHash(window.location.hash, ids, defaultId));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, defaultId]);

  function hashFor(id: string) {
    return id === "winners" ? "#results" : `#${id}`;
  }

  function select(id: string) {
    setActiveId(id);
    const hash = hashFor(id);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!ARROW_KEYS.includes(e.key)) return;
    e.preventDefault();
    const i = nextIndex(e.key, index, tabs.length);
    select(tabs[i].id);
    tabRefs.current[i]?.focus();
  }

  return (
    <div>
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Event details"
        className="mb-7 flex overflow-x-auto border-b border-sand [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative mr-7 shrink-0 whitespace-nowrap pb-3 font-newsreader text-[19px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay focus-visible:outline-offset-4 ${
                selected ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {selected && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-clay" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-panel-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          tabIndex={0}
          hidden={tab.id !== activeId}
        >
          {tab.children}
        </div>
      ))}
    </div>
  );
}
