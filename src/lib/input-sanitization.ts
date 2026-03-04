/**
 * Input Sanitization Utilities
 * Ported from ACK Kitale Diocese System.
 * Protects against XSS, HTML injection, script injection, malicious URLs.
 */

let _DOMPurify: typeof import("isomorphic-dompurify").default | null = null

async function getDOMPurify() {
  if (!_DOMPurify) {
    const mod = await import("isomorphic-dompurify")
    _DOMPurify = mod.default
  }
  return _DOMPurify
}

export function sanitizeString(input: string, maxLength?: number): string {
  if (!input || typeof input !== "string") return ""
  let sanitized = input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\0/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  return sanitized
}

export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") return ""
  return email.toLowerCase().trim().replace(/\s/g, "").substring(0, 254)
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") return ""
  const cleaned = phone.replace(/[^\d+]/g, "")
  if (cleaned.includes("+")) {
    const parts = cleaned.split("+")
    return "+" + parts.filter((p) => p).join("")
  }
  return cleaned
}

export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ["http:", "https:"]
): string {
  if (!url || typeof url !== "string") return ""
  try {
    const trimmedUrl = url.trim()
    if (trimmedUrl.match(/^(javascript|data|file|vbscript|about):/i)) return ""
    const parsed = new URL(trimmedUrl)
    if (!allowedProtocols.includes(parsed.protocol)) return ""
    return parsed.toString()
  } catch {
    return ""
  }
}

export async function sanitizeRichText(
  html: string,
  options?: {
    allowedTags?: string[]
    allowedAttributes?: string[]
    allowDataAttributes?: boolean
  }
): Promise<string> {
  if (!html || typeof html !== "string") return ""
  const DOMPurify = await getDOMPurify()
  const defaultConfig = {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "a", "blockquote", "code", "pre",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "id"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  }
  const config = {
    ...defaultConfig,
    ...(options?.allowedTags && { ALLOWED_TAGS: options.allowedTags }),
    ...(options?.allowedAttributes && {
      ALLOWED_ATTR: options.allowedAttributes,
    }),
    ...(options?.allowDataAttributes !== undefined && {
      ALLOW_DATA_ATTR: options.allowDataAttributes,
    }),
  }
  return DOMPurify.sanitize(html, config)
}

export function sanitizeSlug(input: string): string {
  if (!input || typeof input !== "string") return ""
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function sanitizeMultilineText(
  input: string,
  maxLength?: number
): string {
  if (!input || typeof input !== "string") return ""
  let sanitized = input
    .trim()
    .replace(/\0/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  return sanitized
}

export function sanitizeNumber(
  input: string | number,
  options?: { min?: number; max?: number; defaultValue?: number }
): number {
  const num = typeof input === "string" ? parseFloat(input) : input
  if (isNaN(num) || !isFinite(num)) return options?.defaultValue ?? 0
  let sanitized = num
  if (options?.min !== undefined && sanitized < options.min)
    sanitized = options.min
  if (options?.max !== undefined && sanitized > options.max)
    sanitized = options.max
  return sanitized
}

export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") return ""
  return filename
    .trim()
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255)
}

export function sanitizeObject<T extends Record<string, unknown>>(
  data: T,
  sanitizers: Partial<Record<keyof T, (value: unknown) => unknown>>
): T {
  const sanitized = { ...data }
  for (const [key, sanitizer] of Object.entries(sanitizers)) {
    if (sanitized[key] !== undefined && sanitizer) {
      (sanitized as Record<string, unknown>)[key] = sanitizer(
        (sanitized as Record<string, unknown>)[key]
      )
    }
  }
  return sanitized
}

// Zod transform helpers
export const zodSanitizeString = (val: string) => sanitizeString(val)
export const zodSanitizeEmail = (val: string) => sanitizeEmail(val)
export const zodSanitizePhoneNumber = (val: string) => sanitizePhoneNumber(val)
export const zodSanitizeMultilineText =
  (maxLength?: number) =>
  (val: string) =>
    sanitizeMultilineText(val, maxLength)
export const zodSanitizeUrl = (val: string) => sanitizeUrl(val)
