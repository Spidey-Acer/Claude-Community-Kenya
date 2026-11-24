import { describe, expect, it } from "vitest";
import { shouldShowOnboarding } from "../onboarding-paths";

describe("shouldShowOnboarding", () => {
  it("shows on ordinary pages when wanted", () => {
    expect(shouldShowOnboarding("/", true)).toBe(true);
    expect(shouldShowOnboarding("/events", true)).toBe(true);
  });

  it("never shows when not wanted", () => {
    expect(shouldShowOnboarding("/", false)).toBe(false);
  });

  it("stays off the sign-in pages", () => {
    expect(shouldShowOnboarding("/login", true)).toBe(false);
    expect(shouldShowOnboarding("/signup", true)).toBe(false);
    expect(shouldShowOnboarding("/login/", true)).toBe(false);
  });

  it("does not match lookalike paths", () => {
    expect(shouldShowOnboarding("/loginx", true)).toBe(true);
  });
});
