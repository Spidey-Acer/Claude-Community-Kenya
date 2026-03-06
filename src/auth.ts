import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

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

          console.log("[auth] Attempting login for:", email)

          const prisma = await getPrisma()
          console.log("[auth] Prisma client loaded")

          const user = await prisma.user.findUnique({ where: { email } })
          console.log("[auth] User lookup result:", user ? "found" : "not found")

          if (!user || !user.active) return null

          const passwordMatch = await bcrypt.compare(password, user.passwordHash)
          console.log("[auth] Password match:", passwordMatch)

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
