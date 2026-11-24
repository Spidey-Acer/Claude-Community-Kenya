import { describe, expect, it } from "vitest";
import { resolveInitialFilter, type EventFilter } from "../event-filter";

const FILTERS: EventFilter[] = [
  { key: "all", label: "All" },
  { key: "city:Nairobi", label: "Nairobi" },
  { key: "type:workshop", label: "Workshops" },
];

describe("resolveInitialFilter", () => {
  it("honours a known city or type", () => {
    expect(resolveInitialFilter("Nairobi", null, FILTERS)).toBe("city:Nairobi");
    expect(resolveInitialFilter(null, "workshop", FILTERS)).toBe("type:workshop");
  });

  it("prefers the city when both are known", () => {
    expect(resolveInitialFilter("Nairobi", "workshop", FILTERS)).toBe("city:Nairobi");
  });

  it("falls back to all for unknown values", () => {
    expect(resolveInitialFilter("Atlantis", null, FILTERS)).toBe("all");
    expect(resolveInitialFilter(null, "<script>", FILTERS)).toBe("all");
    expect(resolveInitialFilter(null, null, FILTERS)).toBe("all");
  });

  it("uses a known type when the city is unknown", () => {
    expect(resolveInitialFilter("Atlantis", "workshop", FILTERS)).toBe("type:workshop");
  });
});
