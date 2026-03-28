"use client"

import { useState, useTransition } from "react"
import { Lock, Loader2, CheckCircle, AlertTriangle } from "lucide-react"

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  function handleSave() {
    setError(null)
    setSaved(false)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/settings/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        })
        const data = await res.json()
        if (!data.success) {
          setError(data.error || "Failed to change password")
        } else {
          setSaved(true)
          setCurrentPassword("")
          setNewPassword("")
          setConfirmPassword("")
          setTimeout(() => setSaved(false), 3000)
        }
      } catch {
        setError("Network error — please try again")
      }
    })
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-[#00ff41]" />
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Change Password</h2>
      </div>

      <div className="space-y-3 max-w-sm">
        <div>
          <label className="block text-[11px] font-mono text-[#555] uppercase tracking-wider mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] placeholder:text-[#333] focus:border-[#00ff41]/50 focus:outline-none focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono text-[#555] uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] placeholder:text-[#333] focus:border-[#00ff41]/50 focus:outline-none focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
            placeholder="Min 8 characters"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono text-[#555] uppercase tracking-wider mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] placeholder:text-[#333] focus:border-[#00ff41]/50 focus:outline-none focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
            placeholder="Re-enter new password"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
          className="flex items-center gap-2 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] rounded text-xs font-mono font-semibold hover:bg-[#00ff41]/20 hover:border-[#00ff41]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          {isPending ? "Updating..." : saved ? "Password Changed" : "Update Password"}
        </button>
        {error && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#ff3333]">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
