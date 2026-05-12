import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import {
  AudienceCookieValue,
  isAudienceCookieValue,
} from "@/lib/karibu/types";

const VISITOR_COOKIE = "cck-visitor";
const AUDIENCE_COOKIE = "cck-audience";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Returns the visitor UUID from the `cck-visitor` cookie, or null if absent.
 * Read-only — does not set anything.
 */
export async function getVisitorId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VISITOR_COOKIE)?.value ?? null;
}

/**
 * Returns the existing visitor UUID, or mints a new one and persists it as a
 * 1-year httpOnly cookie. Guarantees a non-null ID for analytics/tracking.
 */
export async function ensureVisitorId(): Promise<string> {
  const existing = await getVisitorId();
  if (existing) return existing;
  const id = randomUUID();
  const store = await cookies();
  store.set(VISITOR_COOKIE, id, {
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return id;
}

/**
 * Returns the validated audience selection from `cck-audience`, or null if
 * the cookie is absent or contains an unrecognised value.
 */
export async function getAudienceCookie(): Promise<AudienceCookieValue | null> {
  const store = await cookies();
  const v = store.get(AUDIENCE_COOKIE)?.value;
  return isAudienceCookieValue(v) ? v : null;
}

/**
 * Writes the audience selection to `cck-audience` with a 1-year TTL.
 * Cookie is intentionally NOT httpOnly so the client can read it for hero
 * hydration without an extra round-trip.
 */
export async function setAudienceCookie(value: AudienceCookieValue): Promise<void> {
  const store = await cookies();
  store.set(AUDIENCE_COOKIE, value, {
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: false, // readable by client for hero hydration
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/**
 * Deletes the `cck-audience` cookie, resetting the visitor to an
 * un-personalised state (e.g. on explicit logout or preference clear).
 */
export async function clearAudienceCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AUDIENCE_COOKIE);
}
