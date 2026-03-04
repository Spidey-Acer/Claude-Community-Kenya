import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  providers: [], // Providers defined in auth.ts (non-Edge only)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnLoginPage = nextUrl.pathname === "/admin/login"

      if (isOnAdmin && !isOnLoginPage) {
        if (isLoggedIn) return true
        return false // Redirect to /admin/login
      }

      if (isLoggedIn && isOnLoginPage) {
        return Response.redirect(new URL("/admin", nextUrl))
      }

      return true
    },
  },
} satisfies NextAuthConfig
