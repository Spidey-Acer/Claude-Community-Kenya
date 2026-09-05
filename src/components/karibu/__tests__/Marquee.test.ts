import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Marquee } from "../Marquee";

describe("Marquee", () => {
  it("exposes the phrase to assistive tech exactly once, hiding the decorative scroll clones", () => {
    const label = "UniqueMarqueeLabel";
    const html = renderToString(createElement(Marquee, { items: [label] }));

    // The scrolling track (two halves x three repeats = six clones of every
    // phrase) is wrapped in a single aria-hidden="true" element. Everything
    // before that attribute in document order is NOT aria-hidden — it should
    // contain exactly the one sr-only copy meant for screen readers.
    const hiddenTrackStart = html.indexOf('aria-hidden="true"');
    expect(hiddenTrackStart).toBeGreaterThan(-1);

    const beforeHiddenTrack = html.slice(0, hiddenTrackStart);
    const hiddenTrack = html.slice(hiddenTrackStart);

    const readableOccurrences = beforeHiddenTrack.split(label).length - 1;
    const decorativeOccurrences = hiddenTrack.split(label).length - 1;

    expect(readableOccurrences).toBe(1);
    expect(decorativeOccurrences).toBe(6);
    expect(beforeHiddenTrack).toContain("sr-only");
  });
});
