import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AdminLoginForm } from "./AdminLoginForm"

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"])

/**
 * Admin login page — server-rendered so authenticated admins are sent
 * straight to /admin without a client-side redirect race. The client form
 * still handles the credentials submit and the "signed in but not an admin"
 * recovery state.
 */
export default async function AdminLoginPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (session?.user && role && ADMIN_ROLES.has(role)) {
    redirect("/admin")
  }
  return <AdminLoginForm />
}
