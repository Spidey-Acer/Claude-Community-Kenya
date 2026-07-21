import type { NextAuthConfig } from "next-auth"

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"])

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], // Providers defined in auth.ts (non-Edge only)
  callbacks: {
    // Expose `role` on the session in the EDGE runtime. The proxy/middleware
    // (proxy.ts) gates /admin on session.user.role; without this callback the
    // edge session has no role, so every admin request 307-redirects to
    // /admin/login while the Node-rendered login page (which DOES see the role)
    // sends the user back to /admin — an infinite loop that locked admins out.
    // auth.ts defines a richer session callback for Node; this is the edge-safe
    // minimum that must exist in the shared config the middleware runs.
    session({ session, token }) {
      if (session.user && typeof token.role === "string") {
        ;(session.user as { role?: string }).role = token.role
      }
      return session
    },
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
