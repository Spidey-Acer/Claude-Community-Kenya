import { describe, expect, it } from "vitest";
import { nextIndex, tabIdFromHash } from "../event-tabs";

// EventTabs itself is a client component (useEffect reads window.location,
// click/keydown handlers) with no jsdom/testing-library in this repo's
// vitest setup (environment: "node" — see vitest.config.ts). So this file
// covers the pure hash-resolution and roving-focus math it's built on
// instead of rendering the component.

describe("tabIdFromHash", () => {
  const ids = ["about", "winners", "projects", "judges"];

  it("selects the winners tab for #results", () => {
    expect(tabIdFromHash("#results", ids, "about")).toBe("winners");
  });

  it("selects the winners tab for #winners", () => {
    expect(tabIdFromHash("#winners", ids, "about")).toBe("winners");
  });

  it("selects judges for #judges", () => {
    expect(tabIdFromHash("#judges", ids, "about")).toBe("judges");
  });

  it("selects projects for #projects", () => {
    expect(tabIdFromHash("#projects", ids, "about")).toBe("projects");
  });

  it("falls back to the default when #projects isn't in ids", () => {
    // e.g. #projects on an event whose cohort has no published projects.
    expect(tabIdFromHash("#projects", ["about", "winners"], "winners")).toBe("winners");
  });

  it("selects about for #about", () => {
    expect(tabIdFromHash("#about", ids, "winners")).toBe("about");
  });

  it("falls back to the default for an empty hash", () => {
    expect(tabIdFromHash("", ids, "about")).toBe("about");
  });

  it("falls back to the default for an unrecognized hash", () => {
    expect(tabIdFromHash("#nonsense", ids, "about")).toBe("about");
  });

  it("falls back to the default when the named tab isn't in ids", () => {
    // e.g. #judges on an event with no judges panel published.
    expect(tabIdFromHash("#judges", ["about", "winners"], "winners")).toBe("winners");
  });

  it("is case-insensitive", () => {
    expect(tabIdFromHash("#RESULTS", ids, "about")).toBe("winners");
  });
});

describe("nextIndex", () => {
  const count = 3; // about, winners, judges

  it("moves right", () => {
    expect(nextIndex("ArrowRight", 0, count)).toBe(1);
  });

  it("wraps right past the last tab", () => {
    expect(nextIndex("ArrowRight", count - 1, count)).toBe(0);
  });

  it("moves left", () => {
    expect(nextIndex("ArrowLeft", 1, count)).toBe(0);
  });

  it("wraps left before the first tab", () => {
    expect(nextIndex("ArrowLeft", 0, count)).toBe(count - 1);
  });

  it("Home jumps to the first tab", () => {
    expect(nextIndex("Home", 2, count)).toBe(0);
  });

  it("End jumps to the last tab", () => {
    expect(nextIndex("End", 0, count)).toBe(count - 1);
  });

  it("leaves the index unchanged for a key it doesn't handle", () => {
    expect(nextIndex("Enter", 1, count)).toBe(1);
  });

  it("is a no-op with zero tabs", () => {
    expect(nextIndex("ArrowRight", 0, 0)).toBe(0);
  });
});
