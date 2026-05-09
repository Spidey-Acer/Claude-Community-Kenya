import type { NextAuthConfig } from "next-auth"

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"])

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], // Providers defined in auth.ts (non-Edge only)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = (auth?.user as { role?: string } | undefined)?.role
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAdminLogin = nextUrl.pathname === "/admin/login"
      const isOnLogin = nextUrl.pathname === "/login"

      // Admin area: must be logged in AND have an admin-tier role.
      if (isOnAdmin && !isOnAdminLogin) {
        if (!isLoggedIn) return false
        return role ? ADMIN_ROLES.has(role) : false
      }

      // Member dashboard: must be logged in (any role).
      if (isOnDashboard) {
        return isLoggedIn
      }

      // Login pages are always reachable; the page component handles
      // the redirect-when-already-authed UX.
      if (isOnLogin || isOnAdminLogin) return true

      return true
    },
  },
} satisfies NextAuthConfig
