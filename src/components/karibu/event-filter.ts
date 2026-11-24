/**
 * Event listing filter keys. A chip's key is `all`, `city:<name>` or
 * `type:<type>`. The initial filter comes from the URL (`?city=`, `?type=`),
 * which anyone can edit, so it is only honoured when it names a chip that
 * exists; anything else falls back to "all".
 */

export interface EventFilter {
  key: string;
  label: string;
}

/** The key to start on: a known `?city=`, else a known `?type=`, else "all". */
export function resolveInitialFilter(
  city: string | null,
  type: string | null,
  filters: readonly EventFilter[],
): string {
  const known = new Set(filters.map((filter) => filter.key));
  if (city && known.has(`city:${city}`)) return `city:${city}`;
  if (type && known.has(`type:${type}`)) return `type:${type}`;
  return "all";
}
