import { describe, expect, it } from "vitest"
import { ipBucketKey } from "../ip-bucket"

describe("ipBucketKey", () => {
  it("two addresses in one /64 share a key", () => {
    expect(ipBucketKey("2001:db8:1:2::1")).toBe(ipBucketKey("2001:db8:1:2:ffff:ffff:ffff:ffff"))
  })

  it("two different /64s get different keys", () => {
    expect(ipBucketKey("2001:db8:1:2::1")).not.toBe(ipBucketKey("2001:db8:1:3::1"))
  })

  it("compressed and full forms of the same address agree", () => {
    expect(ipBucketKey("2001:db8::1")).toBe(ipBucketKey("2001:0db8:0000:0000:0000:0000:0000:0001"))
    expect(ipBucketKey("::1")).toBe(ipBucketKey("0:0:0:0:0:0:0:1"))
  })

  it("keeps an IPv4 address unchanged", () => {
    expect(ipBucketKey("198.51.100.1")).toBe("198.51.100.1")
  })

  it("treats IPv4-mapped IPv6 as the IPv4 address", () => {
    expect(ipBucketKey("::ffff:198.51.100.1")).toBe("198.51.100.1")
    expect(ipBucketKey("::ffff:c633:6401")).toBe("198.51.100.1")
  })

  it("sends garbage and empty input to one shared unknown bucket", () => {
    for (const garbage of ["", "unknown", "not-an-ip", "1.2.3", "999.1.1.1", "1:2:3", "1::2::3", "gggg::1", "1:2:3:4:5:6:7:8:9"]) {
      expect(ipBucketKey(garbage)).toBe("unknown")
    }
  })
})
