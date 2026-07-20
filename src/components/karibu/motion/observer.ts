/**
 * Shared IntersectionObserver singleton for the Karibu degrade-safe reveal.
 *
 * One observer instance for the whole page (not one per element). On an
 * element's first intersection it adds `.in-view` and unobserves it, so every
 * reveal fires exactly once. Constructed lazily on first `register` — which is
 * only ever called from a client `useEffect`, so `IntersectionObserver` is
 * always defined by then.
 */

let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer?.unobserve(entry.target); // one-time
        }
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0 },
  );
  return observer;
}

export function register(el: Element): void {
  getObserver().observe(el);
}

export function unregister(el: Element): void {
  observer?.unobserve(el);
}
