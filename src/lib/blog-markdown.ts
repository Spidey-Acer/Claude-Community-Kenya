/**
 * blog-markdown: pure tokenisers for the blog's small markdown subset, kept
 * out of the React component so they can be unit tested. Inline tokens cover
 * bold, code, images and links; link and image targets pass through
 * `safe-link`, and an unsafe target degrades to plain text.
 */

import { safeImageSource, safeLinkTarget } from "./safe-link";

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "image"; alt: string; src: string };

const PATTERNS = {
  bold: /\*\*(.+?)\*\*/,
  code: /`([^`]+)`/,
  image: /!\[([^\]]*)\]\(([^)]+)\)/,
  link: /\[([^\]]+)\]\(([^)]+)\)/,
} as const;

type Kind = keyof typeof PATTERNS;
const KIND_ORDER: Kind[] = ["bold", "code", "image", "link"];

/** Finds the earliest inline construct in `text`; an image beats a link at the same index. */
function findFirst(text: string): { kind: Kind; match: RegExpMatchArray; index: number } | null {
  let best: { kind: Kind; match: RegExpMatchArray; index: number } | null = null;
  for (const kind of KIND_ORDER) {
    const match = text.match(PATTERNS[kind]);
    if (match && match.index !== undefined && (!best || match.index < best.index)) {
      best = { kind, match, index: match.index };
    }
  }
  return best;
}

/** Builds the token for one matched construct. */
function buildToken(kind: Kind, match: RegExpMatchArray): InlineToken {
  if (kind === "bold") return { type: "bold", text: match[1] };
  if (kind === "code") return { type: "code", text: match[1] };
  if (kind === "image") {
    const src = safeImageSource(match[2]);
    return src ? { type: "image", alt: match[1], src } : { type: "text", text: match[0] };
  }
  const href = safeLinkTarget(match[2], true);
  return href ? { type: "link", text: match[1], href } : { type: "text", text: match[1] };
}

/** Splits a line of markdown into inline tokens. */
export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const found = findFirst(remaining);
    if (!found) {
      tokens.push({ type: "text", text: remaining });
      break;
    }
    if (found.index > 0) tokens.push({ type: "text", text: remaining.slice(0, found.index) });
    tokens.push(buildToken(found.kind, found.match));
    remaining = remaining.slice(found.index + found.match[0].length);
  }
  return tokens;
}

/** True when every non-empty line of a block starts with `>`. */
export function isBlockquote(block: string): boolean {
  const lines = block.split("\n").filter((line) => line.trim());
  return lines.length > 0 && lines.every((line) => line.trim().startsWith(">"));
}

/** Removes the leading `>` marker from each line of a blockquote block. */
export function stripBlockquote(block: string): string {
  return block
    .split("\n")
    .map((line) => line.trim().replace(/^>\s?/, ""))
    .join(" ")
    .trim();
}

/** A block that is exactly one safe image, so it renders as a figure, not a paragraph. */
export function parseImageBlock(block: string): { alt: string; src: string } | null {
  const tokens = tokenizeInline(block.trim());
  if (tokens.length === 1 && tokens[0].type === "image") {
    return { alt: tokens[0].alt, src: tokens[0].src };
  }
  return null;
}
