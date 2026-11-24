/**
 * Nav guard: every nav target is a real route, the lists match spec S1, and
 * active-state matching covers pages beneath a door.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOTTOM_BAR_NAV, JOIN_NAV, PRIMARY_NAV, isNavActive } from "../nav-links";

function routeExists(href: string): boolean {
  const dir = href === "/" ? "" : href;
  return existsSync(join(process.cwd(), "src/app", dir, "page.tsx"));
}

describe("nav-links", () => {
  it("lists the spec doors in order", () => {
    expect(PRIMARY_NAV.map((item) => item.label)).toEqual(["Events", "Learn", "Showcase", "Reports", "About"]);
    expect(BOTTOM_BAR_NAV.map((item) => item.label)).toEqual(["Home", "Events", "Learn", "Showcase"]);
    expect(JOIN_NAV.label).toBe("Join");
  });

  it.each([...PRIMARY_NAV, ...BOTTOM_BAR_NAV, JOIN_NAV].map((item) => [item.label, item.href]))(
    "%s -> %s is an existing route",
    (_label, href) => {
      expect(routeExists(href)).toBe(true);
    },
  );

  it("marks a door active on its own page and pages beneath it", () => {
    const events = PRIMARY_NAV[0];
    expect(isNavActive("/events", events)).toBe(true);
    expect(isNavActive("/events/some-slug", events)).toBe(true);
    expect(isNavActive("/eventsfoo", events)).toBe(false);
  });

  it("keeps Reports active on the pages that hang off it", () => {
    const reports = PRIMARY_NAV[3];
    expect(isNavActive("/impact-lab/cohort-1", reports)).toBe(true);
    expect(isNavActive("/conversations/x", reports)).toBe(true);
  });

  it("matches Home only on the root", () => {
    expect(isNavActive("/", BOTTOM_BAR_NAV[0])).toBe(true);
    expect(isNavActive("/events", BOTTOM_BAR_NAV[0])).toBe(false);
  });
});
