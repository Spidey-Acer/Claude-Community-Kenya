import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { CountUp } from "../CountUp";

describe("CountUp", () => {
  it("server-renders the final formatted number, never a flash of 0", () => {
    const html = renderToString(createElement(CountUp, { target: 2619, prefix: "~" }));

    expect(html).toContain("2,619");
    expect(html).not.toContain("~0");
    expect(html).not.toContain(">0<");
  });

  it("formats target 0 as a literal 0, not an empty stat", () => {
    // A genuine zero target (e.g. no events yet) must still render "0" — the
    // ">0<" check above only guards against CountUp's own animate-from-0 bug,
    // not against a caller who legitimately wants to display zero.
    const html = renderToString(createElement(CountUp, { target: 0 }));

    expect(html).toContain("0");
  });
});
