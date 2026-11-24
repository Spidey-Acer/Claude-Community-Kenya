import { describe, it, expect } from "vitest"
import { parseRole } from "../get-involved"

describe("parseRole", () => {
  it.each([
    ["speak", "speak"],
    ["volunteer", "volunteer"],
    ["idea", "idea"],
    ["x", "speak"],
    [undefined, "speak"],
    [["idea"], "idea"],
    [[], "speak"],
  ])("parseRole(%s) = %s", (value, role) => expect(parseRole(value as never)).toBe(role))
})
