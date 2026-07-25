"use client"

import { useState } from "react"
import { Users, Network, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { ParticipantsTab } from "./ParticipantsTab"
import { MatchingTab } from "./MatchingTab"
import { RunsTab } from "./RunsTab"

type Tab = "participants" | "matching" | "runs"

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "participants", label: "Participants", icon: Users },
  { key: "matching", label: "Matching", icon: Network },
  { key: "runs", label: "Runs", icon: Save },
]

export function ImpactLabDashboard({ cohort }: { cohort: string }) {
  const [tab, setTab] = useState<Tab>("participants")
  // Bumped when a run is saved so the Runs tab reloads.
  const [runsKey, setRunsKey] = useState(0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 border-b border-[#1e1e1e]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-mono transition-all border-b-2 -mb-px",
              tab === key
                ? "border-[#00ff41] text-[#00ff41]"
                : "border-transparent text-[#666] hover:text-[#999]"
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "participants" && <ParticipantsTab cohort={cohort} />}
      {tab === "matching" && (
        <MatchingTab
          cohort={cohort}
          onSaved={() => {
            setRunsKey((k) => k + 1)
            setTab("runs")
          }}
        />
      )}
      {tab === "runs" && <RunsTab cohort={cohort} refreshKey={runsKey} />}
    </div>
  )
}
