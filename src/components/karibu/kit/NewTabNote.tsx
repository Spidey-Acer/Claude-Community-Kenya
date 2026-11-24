/**
 * NewTabNote: the screen-reader-only "(opens in a new tab)" note that goes
 * inside every link with `target="_blank"`. One component so the wording is
 * identical everywhere. Place it as the last child of the link; the leading
 * space keeps it apart from the visible label.
 */

export function NewTabNote() {
  return <span className="sr-only">{" (opens in a new tab)"}</span>;
}
