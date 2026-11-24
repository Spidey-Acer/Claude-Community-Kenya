/**
 * Contrast guard for the page kit: every text pair in PAIRINGS must reach
 * WCAG AA (4.5:1), and every hex in it must still exist in globals.css so the
 * list cannot drift from the real tokens.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAIRINGS } from "../kit/tokens";

const MIN_TEXT_CONTRAST = 4.5;

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const digits = hex.replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16));
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const globalsCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").toLowerCase();

describe("kit-contrast", () => {
  it("lists light and dark pairs", () => {
    expect(PAIRINGS.length).toBeGreaterThanOrEqual(30);
  });

  it.each(PAIRINGS)("%s on %s reaches 4.5:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it("only uses colours that exist in globals.css", () => {
    const missing = [...new Set(PAIRINGS.flat())].filter((hex) => !globalsCss.includes(hex.toLowerCase()));
    expect(missing).toEqual([]);
  });
});
