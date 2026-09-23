import { buildGuideJsonLd, type GuideJsonLdInput } from "@/lib/guides";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * DigitalDocument structured data for a guide's detail page.
 * Server component (no client state) — mirrors BreadcrumbSchema's shape,
 * pure markup around a pre-built JSON-LD object.
 */
export function DigitalDocumentSchema({ guide }: { guide: GuideJsonLdInput }) {
  const schema = buildGuideJsonLd(guide);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
