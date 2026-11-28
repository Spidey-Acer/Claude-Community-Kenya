import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

/**
 * How long a JWT's cached role/active flag is trusted before it is re-read from
 * the database. The window is the worst-case delay between revoking an admin
 * and that revocation taking effect.
 */
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma")
  return prisma
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          // Normalise the email exactly as signup and forgot-password store it
          // (sanitizeEmail: lowercase, no whitespace). Without this, a phone
          // keyboard's "John@gmail.com" never matched the stored
          // "john@gmail.com": new accounts bounced straight to /login and a
          // password reset could not help (incident 2026-11-28).
          const parsedCredentials = z
            .object({
              email: z.preprocess(
                (v) => (typeof v === "string" ? v.toLowerCase().replace(/\s/g, "") : v),
                z.string().email()
              ),
              password: z.string().min(6),
            })
            .safeParse(credentials)

          if (!parsedCredentials.success) {
            console.error("[auth] Invalid credentials format")
            return null
          }

          const { email, password } = parsedCredentials.data

          const prisma = await getPrisma()
          // Exact match first (every account created through signup is stored
          // lowercase); case-insensitive fallback for older accounts created
          // by admin or seed with mixed case.
          const user =
            (await prisma.user.findUnique({ where: { email } })) ??
            (await prisma.user.findFirst({
              where: { email: { equals: email, mode: "insensitive" } },
            }))

          if (!user || !user.active) return null

          const passwordMatch = await bcrypt.compare(password, user.passwordHash)

          if (!passwordMatch) return null

          // Update last login (non-blocking)
          prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          }).catch(console.error)

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          }
        } catch (error) {
          console.error("[auth] Authorize error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Seed the token from the authorized user at sign-in only. Do NOT mutate
      // the token on subsequent requests: rotating the JWT (and thus the session
      // cookie) on every navigation makes the edge proxy and the Node page layer
      // read different session states, which produced an /admin ↔ /admin/login
      // redirect loop in production. Interval-based DB re-validation was reverted
      // for this reason and must be re-implemented without per-request cookie
      // rotation (e.g. a short maxAge, or a session-version check that doesn't
      // re-issue the token).
      if (user && typeof user === "object" && "role" in user) {
        token.role = (user as { role?: string }).role
        token.loginTime = Date.now()
        token.sessionId = crypto.randomUUID()
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.role === "string") {
        const u = session.user as {
          role?: string
          id?: string
          sessionId?: string
          loginTime?: number
        }
        u.role = token.role
        u.id = token.sub || ""
        u.sessionId = (token.sessionId as string) || ""
        u.loginTime = (token.loginTime as number) || Date.now()
      }
      return session
    },
  },
})
