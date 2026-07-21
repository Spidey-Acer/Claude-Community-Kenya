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
const REVALIDATE_MS = 5 * 60 * 1000

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
          const parsedCredentials = z
            .object({
              email: z.string().email(),
              password: z.string().min(6),
            })
            .safeParse(credentials)

          if (!parsedCredentials.success) {
            console.error("[auth] Invalid credentials format")
            return null
          }

          const { email, password } = parsedCredentials.data

          const prisma = await getPrisma()
          const user = await prisma.user.findUnique({ where: { email } })

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
      // Initial sign-in: seed the token from the authorized user.
      if (user && typeof user === "object" && "role" in user) {
        token.role = (user as { role?: string }).role
        token.loginTime = Date.now()
        token.sessionId = crypto.randomUUID()
        token.checkedAt = Date.now()
        return token
      }

      // Subsequent requests: re-check the account against the database.
      //
      // Without this the token is trusted for its full 24h maxAge, so
      // deactivating or demoting an admin had no effect until it expired —
      // a revoked admin kept full access for up to a day. Re-reading on every
      // request would put a query in front of every authenticated page, so
      // re-check on an interval instead: revocation takes effect within
      // REVALIDATE_MS rather than 24 hours.
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0
      if (Date.now() - checkedAt < REVALIDATE_MS) return token

      if (!token.sub) return null

      try {
        const prisma = await getPrisma()
        const current = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { active: true, role: true },
        })

        // Deleted or deactivated — drop the session immediately.
        if (!current || !current.active) return null

        token.role = current.role
        token.checkedAt = Date.now()
        return token
      } catch (error) {
        // Fail open on a database blip. Signing every user out because the DB
        // hiccuped is a worse outcome than a stale role for one more interval;
        // checkedAt is deliberately left unchanged so the next request retries.
        console.error("[auth] Session re-validation failed:", error)
        return token
      }
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
