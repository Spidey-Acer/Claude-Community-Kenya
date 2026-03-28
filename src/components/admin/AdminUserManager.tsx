"use client"

import { useState, useTransition } from "react"
import {
  Users,
  UserPlus,
  Shield,
  Power,
  KeyRound,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  active: boolean
  emailVerified: boolean
  lastLogin: string | null
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  MEMBER: "Member",
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "text-[#ff3333]",
  ADMIN: "text-[#ffb000]",
  MODERATOR: "text-[#00d4ff]",
  MEMBER: "text-[#888]",
}

const ASSIGNABLE_ROLES = ["ADMIN", "MODERATOR", "MEMBER"] as const

export function AdminUserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[]
  currentUserId: string
}) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")

  // Add user form state
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "ADMIN" as string,
  })

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message })
    if (type === "success") setTimeout(() => setFeedback(null), 3000)
  }

  function handleAddUser() {
    if (!addForm.firstName || !addForm.lastName || !addForm.email || !addForm.password) {
      showFeedback("error", "All fields are required")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/settings/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addForm),
        })
        const data = await res.json()
        if (!data.success) {
          showFeedback("error", data.error || "Failed to create user")
        } else {
          setUsers((prev) => [...prev, {
            ...data.data,
            emailVerified: true,
            lastLogin: null,
            createdAt: data.data.createdAt,
          }])
          setShowAddForm(false)
          setAddForm({ firstName: "", lastName: "", email: "", password: "", role: "ADMIN" })
          showFeedback("success", "Admin user created")
        }
      } catch {
        showFeedback("error", "Network error — please try again")
      }
    })
  }

  function handleToggleActive(userId: string, currentActive: boolean) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/settings/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !currentActive }),
        })
        const data = await res.json()
        if (!data.success) {
          showFeedback("error", data.error || "Failed to update user")
        } else {
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, active: !currentActive } : u))
          )
          showFeedback("success", !currentActive ? "User activated" : "User deactivated")
        }
      } catch {
        showFeedback("error", "Network error — please try again")
      }
    })
  }

  function handleChangeRole(userId: string, newRole: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/settings/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        })
        const data = await res.json()
        if (!data.success) {
          showFeedback("error", data.error || "Failed to update role")
        } else {
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
          )
          setEditingRole(null)
          showFeedback("success", `Role updated to ${ROLE_LABELS[newRole]}`)
        }
      } catch {
        showFeedback("error", "Network error — please try again")
      }
    })
  }

  function handleResetPassword(userId: string) {
    if (newPassword.length < 8) {
      showFeedback("error", "Password must be at least 8 characters")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/settings/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetPassword: newPassword }),
        })
        const data = await res.json()
        if (!data.success) {
          showFeedback("error", data.error || "Failed to reset password")
        } else {
          setResetPasswordFor(null)
          setNewPassword("")
          showFeedback("success", "Password reset successfully")
        }
      } catch {
        showFeedback("error", "Network error — please try again")
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00ff41]" />
          <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Admin Users</h2>
          <span className="text-[10px] font-mono text-[#444]">({users.length})</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] rounded text-[11px] font-mono font-semibold hover:bg-[#00ff41]/20 transition-all"
        >
          {showAddForm ? <X className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
          {showAddForm ? "Cancel" : "Add Admin"}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded border text-[11px] font-mono ${
            feedback.type === "success"
              ? "bg-[#00ff41]/5 border-[#00ff41]/20 text-[#00ff41]"
              : "bg-[#ff3333]/5 border-[#ff3333]/20 text-[#ff3333]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-[#0d0d0d] border border-[#00ff41]/20 rounded-lg p-4 space-y-3">
          <div className="text-[11px] font-mono font-semibold text-[#00ff41] uppercase tracking-wider">
            New Admin User
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#555] mb-1">First Name</label>
              <input
                type="text"
                value={addForm.firstName}
                onChange={(e) => setAddForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#555] mb-1">Last Name</label>
              <input
                type="text"
                value={addForm.lastName}
                onChange={(e) => setAddForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-[#555] mb-1">Email</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#555] mb-1">Password</label>
              <input
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#555] mb-1">Role</label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleAddUser}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] rounded text-xs font-mono font-semibold hover:bg-[#00ff41]/20 disabled:opacity-40 transition-all"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            {isPending ? "Creating..." : "Create User"}
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Last Login</th>
              <th className="px-4 py-3 text-right text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-[#111] transition-colors group">
                <td className="px-4 py-3">
                  <div className="text-sm font-mono text-[#e0e0e0]">
                    {user.firstName} {user.lastName}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-[9px] text-[#00ff41] border border-[#00ff41]/30 px-1 py-0.5 rounded">YOU</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[#444]">{user.email}</div>
                </td>
                <td className="px-4 py-3">
                  {editingRole === user.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        defaultValue={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className="bg-[#0a0a0a] border border-[#00ff41]/30 rounded px-2 py-1 text-[11px] font-mono text-[#e0e0e0] focus:outline-none"
                      >
                        <option value="SUPER_ADMIN">Super Admin</option>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                      <button onClick={() => setEditingRole(null)} className="text-[#555] hover:text-[#888]">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[11px] font-mono font-semibold ${ROLE_COLORS[user.role] ?? "text-[#888]"}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    user.active
                      ? "text-[#00ff41] bg-[#00ff41]/5 border-[#00ff41]/20"
                      : "text-[#ff3333] bg-[#ff3333]/5 border-[#ff3333]/20"
                  }`}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-mono text-[#444]">
                    {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.id !== currentUserId ? (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingRole(editingRole === user.id ? null : user.id)}
                        title="Change role"
                        className="p-1.5 rounded text-[#555] hover:text-[#ffb000] hover:bg-[#ffb000]/10 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setResetPasswordFor(resetPasswordFor === user.id ? null : user.id)
                          setNewPassword("")
                        }}
                        title="Reset password"
                        className="p-1.5 rounded text-[#555] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.active)}
                        title={user.active ? "Deactivate" : "Activate"}
                        disabled={isPending}
                        className={`p-1.5 rounded transition-colors ${
                          user.active
                            ? "text-[#555] hover:text-[#ff3333] hover:bg-[#ff3333]/10"
                            : "text-[#555] hover:text-[#00ff41] hover:bg-[#00ff41]/10"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-[#333]">—</span>
                  )}
                  {/* Reset Password Inline */}
                  {resetPasswordFor === user.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 8)"
                        className="bg-[#0a0a0a] border border-[#222] rounded px-2 py-1 text-[11px] font-mono text-[#e0e0e0] w-40 focus:border-[#00d4ff]/50 focus:outline-none"
                      />
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        disabled={isPending || newPassword.length < 8}
                        className="px-2 py-1 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded text-[10px] font-mono hover:bg-[#00d4ff]/20 disabled:opacity-40 transition-all"
                      >
                        {isPending ? "..." : "Reset"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
