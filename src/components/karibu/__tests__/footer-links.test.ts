/**
 * Footer guard: every footer link is an existing route, and the spec S1 links
 * are all present.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FOOTER_EXPLORE, FOOTER_GET_INVOLVED } from "../footer-links";

describe("footer-links", () => {
  it("carries the spec S1 links", () => {
    expect(FOOTER_GET_INVOLVED.map((link) => link.label)).toEqual([
      "Get involved",
      "FAQ",
      "Code of conduct",
      "Your data",
    ]);
  });

  it.each([...FOOTER_EXPLORE, ...FOOTER_GET_INVOLVED].map((link) => [link.label, link.href]))(
    "%s -> %s is an existing route",
    (_label, href) => {
      expect(existsSync(join(process.cwd(), "src/app", href, "page.tsx"))).toBe(true);
    },
  );
});
