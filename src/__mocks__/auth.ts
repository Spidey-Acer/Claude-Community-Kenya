/**
 * Vitest-only stand-in for `@/auth` — see `vitest.config.ts`'s `resolve.alias`.
 *
 * `@/auth` calls `NextAuth(...)` at module load time, which imports
 * `next-auth`, which imports `next/server` — a specifier Vitest's plain-Node
 * ESM resolver cannot follow outside Next's own bundler ("Cannot find module
 * 'next/server' ... Did you mean to import "next/server.js"?"). That import
 * chain has nothing to do with the pure functions unit tests actually
 * exercise (e.g. `looksLikePerTrackWinners` in `results-input.ts`, reached
 * transitively via `./member`'s `import { auth } from "@/auth"`) — no unit
 * test in this repo calls `auth()` itself, only modules that import it in
 * passing.
 *
 * This stub is never used in the built app: `vitest.config.ts` only applies
 * the alias under `test`, and neither `next build` nor `next dev` reads
 * Vitest's config. If a future test genuinely needs to exercise real
 * authentication, that belongs in an integration test against the actual
 * `@/auth`, not a unit test relying on this mock.
 */
export async function auth(): Promise<null> {
  return null
}

export async function signIn(): Promise<never> {
  throw new Error("@/auth is mocked in unit tests — signIn() is not available here.")
}

export async function signOut(): Promise<never> {
  throw new Error("@/auth is mocked in unit tests — signOut() is not available here.")
}

export const handlers = {
  GET: async () => new Response(null, { status: 501 }),
  POST: async () => new Response(null, { status: 501 }),
}
