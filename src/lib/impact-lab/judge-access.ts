/**
 * Judge access by shared code.
 *
 * Judges do not have accounts — there was no time to create them mid-event —
 * so a shared code plus either a typed name or a pick from the published
 * panel (see `JudgeSignInMode`) is the entry path. This is deliberately
 * weaker than the signed-in staff path, and the difference is contained:
 *
 * - A code-gated caller may ONLY read the judging payload and write their own
 *   score rows. It can never reach runs, teams, participants, or submissions.
 * - The staff path (`checkApiPermission("impact-lab", "view")`) is untouched.
 *   This is an additional branch, never a relaxation of that one.
 *
 * The tradeoff is accepted knowingly: anyone who learns the code can submit
 * scores under any name they type. For one night in one room that is fine;
 * change JUDGE_ACCESS_CODE afterwards.
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

import { ROSTER_IDENTITY_PREFIX } from "./roster"

export const JUDGE_COOKIE = "il_judge"

/** Overridable without a deploy; falls back to the code agreed for the event. */
export const JUDGE_ACCESS_CODE = process.env.JUDGE_ACCESS_CODE || "2077"

/**
 * The cookie is signed. Without a signature anyone could hand-craft the cookie
 * value and skip the code entirely, which would make the gate decorative.
 */
const SIGNING_SECRET =
  process.env.AUTH_SECRET || process.env.CSRF_SECRET || JUDGE_ACCESS_CODE

function sign(payload: string): string {
  return createHmac("sha256", SIGNING_SECRET).update(payload).digest("base64url")
}


/**
 * Constant-time-ish comparison. The code is short and the endpoint is rate
 * limited, so this is belt-and-braces rather than load-bearing — but a plain
 * `===` on a secret is a habit worth not forming.
 */
export function codeMatches(input: string): boolean {
  const a = input.trim()
  const b = JUDGE_ACCESS_CODE
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * A judge's identity for the `(runId, teamId, judgeEmail)` unique constraint.
 *
 * Code-gated judges have no email, so their typed name becomes a stable slug
 * in that column. The `name:` prefix keeps it from ever colliding with a real
 * signed-in judge's email, and the slug keeps "Favor Ruhiu", "favor ruhiu" and
 * "Favor  Ruhiu" as one judge rather than three scorecards for the same person.
 */
export function judgeIdentity(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug ? `name:${slug}` : ""
}

export interface JudgeSession {
  /** The value stored in ImpactLabScore.judgeEmail. */
  identity: string
  /** The name as typed, for display and for the export. */
  displayName: string
}

/**
 * Read the judge session from the signed cookie, or null when absent or
 * malformed. Malformed is treated as absent rather than throwing: a stale
 * cookie must send someone back to the code screen, not error their page.
 */
export async function readJudgeSession(): Promise<JudgeSession | null> {
  const store = await cookies()
  const raw = store.get(JUDGE_COOKIE)?.value
  if (!raw) return null
  try {
    const [body, signature] = raw.split(".")
    if (!body || !signature) return null
    const expected = sign(body)
    const given = Buffer.from(signature)
    const want = Buffer.from(expected)
    if (given.length !== want.length || !timingSafeEqual(given, want)) return null

    const parsed: unknown = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    )
    if (typeof parsed !== "object" || parsed === null) return null
    const { identity, displayName } = parsed as Record<string, unknown>
    if (typeof identity !== "string" || typeof displayName !== "string") return null
    // Two identity namespaces are legitimate: `name:` for a typed name and
    // `roster:` for a judge who picked themselves off the panel. Anything else
    // is a hand-crafted cookie and is treated as no session at all.
    if (!identity.startsWith("name:") && !identity.startsWith(ROSTER_IDENTITY_PREFIX)) return null
    return { identity, displayName }
  } catch {
    return null
  }
}

/** Encode a judge session for the cookie value. */
export function encodeJudgeSession(session: JudgeSession): string {
  const body = Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
  return `${body}.${sign(body)}`
}
