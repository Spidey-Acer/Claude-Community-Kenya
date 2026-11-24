import { describe, expect, it } from "vitest";
import { safeImageSource, safeLinkTarget } from "../safe-link";
import { isBlockquote, parseImageBlock, stripBlockquote, tokenizeInline } from "../blog-markdown";

describe("safeLinkTarget", () => {
  it("allows http, https, mailto and site-relative targets", () => {
    expect(safeLinkTarget("https://example.com/a", true)).toBe("https://example.com/a");
    expect(safeLinkTarget("http://example.com", true)).toBe("http://example.com");
    expect(safeLinkTarget("mailto:hi@example.com", true)).toBe("mailto:hi@example.com");
    expect(safeLinkTarget("/events", true)).toBe("/events");
    expect(safeLinkTarget("#top", true)).toBe("#top");
  });
  it("rejects javascript:, data: and other schemes in any case", () => {
    expect(safeLinkTarget("javascript:alert(1)", true)).toBeNull();
    expect(safeLinkTarget("JaVaScRiPt:alert(1)", true)).toBeNull();
    expect(safeLinkTarget("data:text/html,<script>", true)).toBeNull();
    expect(safeLinkTarget("DATA:text/html;base64,AAAA", true)).toBeNull();
    expect(safeLinkTarget("vbscript:x", true)).toBeNull();
    expect(safeLinkTarget("ftp://example.com", true)).toBeNull();
  });
  it("rejects leading whitespace and control-character tricks", () => {
    expect(safeLinkTarget("  javascript:alert(1)", true)).toBeNull();
    expect(safeLinkTarget("\n\tjavascript:alert(1)", true)).toBeNull();
    expect(safeLinkTarget("java\tscript:alert(1)", true)).toBeNull();
    expect(safeLinkTarget("  https://example.com ", true)).toBe("https://example.com");
  });
  it("rejects protocol-relative, bare and empty targets", () => {
    expect(safeLinkTarget("//evil.example", true)).toBeNull();
    expect(safeLinkTarget("example.com", true)).toBeNull();
    expect(safeLinkTarget("   ", true)).toBeNull();
  });
  it("rejects mailto when not allowed", () => {
    expect(safeLinkTarget("mailto:a@b.co", false)).toBeNull();
  });
});

describe("safeImageSource", () => {
  it("allows https and site-relative only", () => {
    expect(safeImageSource("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(safeImageSource("/images/a.png")).toBe("/images/a.png");
    expect(safeImageSource("http://example.com/a.png")).toBeNull();
    expect(safeImageSource("mailto:a@b.co")).toBeNull();
    expect(safeImageSource("data:image/svg+xml,<svg>")).toBeNull();
    expect(safeImageSource("  JAVASCRIPT:alert(1)")).toBeNull();
  });
});

describe("tokenizeInline", () => {
  it("renders an https image as an image token", () => {
    expect(tokenizeInline("![A photo](https://example.com/p.png)")).toEqual([
      { type: "image", alt: "A photo", src: "https://example.com/p.png" },
    ]);
  });
  it("keeps an image with a rejected scheme as plain text", () => {
    const tokens = tokenizeInline("![x](javascript:alert(1))");
    expect(tokens.every((token) => token.type === "text")).toBe(true);
  });
  it("renders a link with an unsafe target as its label only", () => {
    const tokens = tokenizeInline("[click](javascript:alert(1))");
    expect(tokens[0]).toEqual({ type: "text", text: "click" });
    expect(tokens.some((token) => token.type === "link")).toBe(false);
    expect(tokenizeInline("[mail](mailto:a@b.co)")).toEqual([{ type: "link", text: "mail", href: "mailto:a@b.co" }]);
  });
  it("does not treat an image as a link", () => {
    const tokens = tokenizeInline("see ![alt](/a.png) now");
    expect(tokens.map((token) => token.type)).toEqual(["text", "image", "text"]);
  });
});

describe("blocks", () => {
  it("detects and strips blockquotes", () => {
    expect(isBlockquote("> one\n> two")).toBe(true);
    expect(isBlockquote("one\n> two")).toBe(false);
    expect(stripBlockquote("> one\n> two")).toBe("one two");
  });
  it("parses a lone image block", () => {
    expect(parseImageBlock("![a](/x.png)")).toEqual({ alt: "a", src: "/x.png" });
    expect(parseImageBlock("text ![a](/x.png)")).toBeNull();
  });
});
