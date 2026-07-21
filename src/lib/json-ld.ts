/**
 * json-ld — safe serialization for <script type="application/ld+json"> blocks.
 *
 * `JSON.stringify` does not escape `<`, so a string containing `</script>`
 * closes the script element early and everything after it is parsed as HTML.
 * That is a stored-XSS sink whenever any part of the payload originates from
 * user or admin input.
 *
 * This is a live risk here rather than a theoretical one: admin-authored blog
 * and event fields are sanitized on write by stripping literal `<...>` tags,
 * but `decodeHtmlEntities()` on the read path (src/lib/data.ts) turns entity
 * text such as `&lt;/script&gt;` back into real angle brackets that the
 * write-time sanitizer never saw. Escaping at the sink closes the hole
 * regardless of what the read path hands us.
 */

/**
 * Serialize a JSON-LD object for direct injection into a script element.
 *
 * Escapes the three characters that can break out of a script context or be
 * misread by an HTML parser: `<`, `>` and `&`. Unicode escapes are used so the
 * output remains valid JSON and parses identically for consumers.
 *
 * @param schema - the JSON-LD object to serialize
 * @returns a JSON string safe to place inside `<script type="application/ld+json">`
 */
export function serializeJsonLd(schema: unknown): string {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}
