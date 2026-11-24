/**
 * Rate-limit bucket key for a client address (attending lookup).
 *
 * IPv4 clients are keyed by the full address. IPv6 clients are keyed by their
 * /64 prefix (first four hextets), because one subscriber normally holds a
 * whole /64 and could otherwise mint billions of per-address budgets.
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is keyed as the IPv4 address. Anything
 * unparseable falls into one shared `unknown` bucket, never a per-request key.
 */

export const UNKNOWN_BUCKET = "unknown"

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
const HEXTET_PATTERN = /^[0-9a-f]{1,4}$/i

/** Canonical dotted quad, or null when the text is not a valid IPv4 address. */
function parseIpv4(text: string): string | null {
  const match = IPV4_PATTERN.exec(text)
  if (!match) return null
  const octets = match.slice(1).map(Number)
  return octets.every((octet) => octet <= 255) ? octets.join(".") : null
}

/** Expands an IPv6 string to eight numeric hextets, or null when malformed. */
function parseIpv6(text: string): number[] | null {
  let source = text
  const lastColon = source.lastIndexOf(":")
  const embeddedIpv4 = parseIpv4(source.slice(lastColon + 1))
  if (embeddedIpv4) {
    const [a, b, c, d] = embeddedIpv4.split(".").map(Number)
    source = `${source.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const halves = source.split("::")
  if (halves.length > 2) return null
  const toGroups = (part: string) => (part === "" ? [] : part.split(":"))
  const head = toGroups(halves[0])
  const tail = halves.length === 2 ? toGroups(halves[1]) : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail]
  if (!groups.every((group) => HEXTET_PATTERN.test(group))) return null
  return groups.map((group) => parseInt(group, 16))
}

/** Bucket key: IPv4 address, `v6:<first four hextets>`, or `unknown`. */
export function ipBucketKey(rawAddress: string): string {
  const address = rawAddress.trim().replace(/^\[|\]$/g, "").split("%")[0]
  const ipv4 = parseIpv4(address)
  if (ipv4) return ipv4
  if (!address.includes(":")) return UNKNOWN_BUCKET
  const hextets = parseIpv6(address)
  if (!hextets) return UNKNOWN_BUCKET
  const isMapped = hextets.slice(0, 5).every((hextet) => hextet === 0) && hextets[5] === 0xffff
  if (isMapped) {
    const [high, low] = [hextets[6], hextets[7]]
    return [high >> 8, high & 255, low >> 8, low & 255].join(".")
  }
  return `v6:${hextets.slice(0, 4).map((hextet) => hextet.toString(16)).join(":")}`
}
