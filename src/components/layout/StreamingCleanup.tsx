"use client";

import { useEffect } from "react";

/**
 * Removes React's stranded HTML-streaming containers. See issue #125.
 *
 * React streams a Suspense boundary's resolved HTML into a `<div hidden
 * id="S:n">` at the end of <body>, then calls `$RC("B:n","S:n")` from an
 * inline script to move the content into place and delete the container. On
 * some routes the boundary instead resolves through the React tree on the
 * client, `$RC` never runs for it, and the container is left behind holding a
 * complete second copy of the page. `/events` carries 22.5KB of it — 23% of
 * <body>.
 *
 * That copy is `display: none`, so it is inert for users: not focusable, not
 * in the accessibility tree. What it is not inert for is structured data. A
 * `<script type="application/ld+json">` inside a hidden element is still
 * extracted, and crawlers read the rendered DOM rather than the streamed
 * HTML — so `/events` was serving two competing BreadcrumbList graphs where
 * the HTML has one. That, not the DOM weight, is why this is worth code.
 *
 * The upstream fix would be in the framework (we are on Next 16.1.6; 16.3.3
 * is current, and the `$~` postpone marker in the boundary comments points at
 * the prerender-resume path). Until that is tried on its own, this prunes.
 */

/** True while any Suspense boundary is still pending (`<!--$?-->`). */
function isStreaming(): boolean {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeValue === "$?") return true;
  }
  return false;
}

function prune() {
  // Never touch the DOM mid-stream: a pending boundary still needs its
  // container, and `$RC` throws if we delete one out from under it.
  if (isStreaming()) return;

  for (const el of document.querySelectorAll("body > div[hidden][id^='S:']")) {
    el.remove();
  }
  // The boundary templates are stranded by the same failure.
  for (const el of document.querySelectorAll("template[id^='B:']")) {
    el.remove();
  }
}

export function StreamingCleanup() {
  useEffect(() => {
    // `load` is the signal that matters: these containers arrive with the HTML
    // stream, so anything earlier (an effect, a rAF) runs before they exist —
    // which is exactly how the first attempt at this silently did nothing.
    // Client navigations never produce them, so there is nothing to re-run.
    if (document.readyState === "complete") {
      prune();
      return;
    }
    window.addEventListener("load", prune, { once: true });
    return () => window.removeEventListener("load", prune);
  }, []);

  return null;
}
