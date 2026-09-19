import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Marquee } from "../Marquee";

describe("Marquee", () => {
  it("renders each phrase exactly once, readable by assistive tech", () => {
    const label = "UniqueMarqueeLabel";
    const html = renderToString(createElement(Marquee, { items: [label] }));

    // The band is static, so there are no duplicated clones to hide: the
    // phrase appears once and is read directly. A regression back to the
    // scrolling track would show up here as extra occurrences.
    expect(html.split(label).length - 1).toBe(1);
    expect(html).not.toContain("sr-only");
    expect(html).not.toContain("animation");
  });

  it("puts a decorative separator between phrases but not before the first", () => {
    const html = renderToString(
      createElement(Marquee, { items: ["One", "Two", "Three"] }),
    );

    // Two separator marks for three phrases, each hidden from assistive tech
    // by ClaudeMark's own aria-hidden, and none before the first phrase.
    expect(html.split('aria-hidden="true"').length - 1).toBe(2);
    expect(html.indexOf("One")).toBeLessThan(html.indexOf('aria-hidden="true"'));
  });

  it("renders nothing when there are no phrases", () => {
    expect(renderToString(createElement(Marquee, { items: [] }))).toBe("");
  });
});
