/**
 * Focus trap rule: Tab on the last item wraps to the first, Shift+Tab on the
 * first wraps to the last, anything else is left to the browser.
 */
import { describe, expect, it } from "vitest";
import { nextFocusIndex } from "../focus-trap";

describe("nextFocusIndex", () => {
  it("wraps Tab from the last item to the first", () => {
    expect(nextFocusIndex(3, 2, false)).toBe(0);
  });

  it("wraps Shift+Tab from the first item to the last", () => {
    expect(nextFocusIndex(3, 0, true)).toBe(2);
  });

  it("leaves in-between moves to the browser", () => {
    expect(nextFocusIndex(3, 1, false)).toBeNull();
    expect(nextFocusIndex(3, 1, true)).toBeNull();
  });

  it("pulls focus in when it sits outside the dialog", () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0);
    expect(nextFocusIndex(3, -1, true)).toBe(2);
  });

  it("does nothing when there is nothing to focus", () => {
    expect(nextFocusIndex(0, -1, false)).toBeNull();
  });

  it("cycles on a single focusable item", () => {
    expect(nextFocusIndex(1, 0, false)).toBe(0);
    expect(nextFocusIndex(1, 0, true)).toBe(0);
  });
});
