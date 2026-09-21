import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Marquee } from "../Marquee";

describe("Marquee", () => {
  it("renders the sentence once, statically, readable by assistive tech", () => {
    const text = "UniqueBandSentence. ";
    const html = renderToString(createElement(Marquee, { text }));

    // The band is static, so there are no duplicated clones to hide: the
    // sentence appears once and is read directly. A regression back to the
    // scrolling track would show up here as extra occurrences.
    expect(html.split("UniqueBandSentence").length - 1).toBe(1);
    expect(html).not.toContain("sr-only");
    expect(html).not.toContain("animation");
    expect(html).not.toContain("<a ");
  });

  it("renders the link with its arrow text when given one", () => {
    const html = renderToString(
      createElement(Marquee, { text: "Nairobi Build Day is done. ", href: "/events/x", linkText: "See what was built →" }),
    );
    expect(html).toContain('href="/events/x"');
    expect(html).toContain("See what was built →");
    // Sentence first, then the link, in one paragraph.
    expect(html.indexOf("is done.")).toBeLessThan(html.indexOf("<a "));
  });

  it("shows the Claude mark exactly once, hidden from assistive tech", () => {
    const html = renderToString(createElement(Marquee, { text: "One line." }));
    expect(html.split('aria-hidden="true"').length - 1).toBe(1);
    expect(html.indexOf('aria-hidden="true"')).toBeLessThan(html.indexOf("One line."));
  });

  it("carries no em dash and no uppercase transform", () => {
    const html = renderToString(createElement(Marquee, { text: "Plain." }));
    expect(html).not.toContain("—");
    expect(html).not.toContain("uppercase");
    expect(html).toContain("italic");
  });
});
