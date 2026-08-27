"use client"

import { useState, useTransition } from "react"
import { BarChart3, Save, Loader2, CheckCircle } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

interface SiteStats {
  discordMembers: number
  whatsappMembers: number
  linkedinMembers: number
  eventsHeld: number
  citiesActive: string[]
  resourceCount: number
  websiteStatus: string
}

export function SiteStatsEditor({ initialStats }: { initialStats: SiteStats }) {
  const [stats, setStats] = useState<SiteStats>(initialStats)
  const [citiesInput, setCitiesInput] = useState(initialStats.citiesActive.join(", "))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    setSaved(false)

    const citiesActive = citiesInput
      .split(",")
      .map(c => c.trim())
      .filter(Boolean)

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/settings/stats", {
          method: "PATCH",
          headers: await csrfHeaders(),
          body: JSON.stringify({ ...stats, citiesActive }),
        })
        const data = await res.json()
        if (!data.success) {
          setError(data.error || "Failed to save")
          return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch {
        setError("Network error — please try again")
      }
    })
  }

  const totalMembers = stats.discordMembers + stats.whatsappMembers + stats.linkedinMembers

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-[#00ff41]" />
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Community Stats</h2>
        <span className="text-[10px] font-mono text-[#444] ml-auto">
          Total: {totalMembers} members across platforms
        </span>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-5">
        {/* Platform Members */}
        <div>
          <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
            Platform Members
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { key: "discordMembers" as const, label: "Discord", color: "#5865F2" },
              { key: "whatsappMembers" as const, label: "WhatsApp", color: "#25D366" },
              { key: "linkedinMembers" as const, label: "LinkedIn", color: "#0A66C2" },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <label className="text-[11px] font-mono text-[#666] mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={stats[key]}
                  onChange={e => setStats(s => ({ ...s, [key]: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Events & Resources */}
        <div>
          <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
            Activity
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-mono text-[#666] mb-1 block">Events Held</label>
              <input
                type="number"
                min={0}
                value={stats.eventsHeld}
                onChange={e => setStats(s => ({ ...s, eventsHeld: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#666] mb-1 block">Resources</label>
              <input
                type="number"
                min={0}
                value={stats.resourceCount}
                onChange={e => setStats(s => ({ ...s, resourceCount: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-[#666] mb-1 block">Cities (comma-separated)</label>
              <input
                type="text"
                value={citiesInput}
                onChange={e => setCitiesInput(e.target.value)}
                placeholder="Nairobi, Mombasa"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Website Status */}
        <div>
          <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
            Status
          </div>
          <div className="flex items-center gap-3">
            <select
              value={stats.websiteStatus}
              onChange={e => setStats(s => ({ ...s, websiteStatus: e.target.value }))}
              className="bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none transition-colors"
            >
              <option value="live">Live</option>
              <option value="maintenance">Maintenance</option>
              <option value="beta">Beta</option>
            </select>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#444]">
              <span className={`w-2 h-2 rounded-full ${stats.websiteStatus === "live" ? "bg-[#00ff41]" : stats.websiteStatus === "maintenance" ? "bg-[#ffb000]" : "bg-[#00d4ff]"}`} />
              claudekenya.org
            </span>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-sm font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:opacity-50 transition-all"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isPending ? "Saving..." : saved ? "Saved!" : "Save Stats"}
          </button>
          {error && (
            <span className="text-[11px] font-mono text-[#ff3333]">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}
