"use client"

import { useState, useTransition } from "react"
import { Flag, Loader2 } from "lucide-react"
// Plain strings, not the Prisma enum: importing generated Prisma types into a
// client component pulls the whole Prisma runtime into the browser bundle.
import { REPORT_REASONS, type ReportReasonValue } from "@/lib/showcase/constants"
import { cn } from "@/lib/utils"

interface ReportButtonProps {
  targetId: string
}


/**
 * Flags a showcase post for moderator review.
 *
 * Opens a small reason menu rather than submitting blind — a report with no
 * reason attached isn't actionable by a moderator. Works signed-out, matching
 * `/api/reports`'s own policy of accepting anonymous reports so flagging
 * abuse never requires an account.
 */
export function ReportButton({ targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function submit(reason: ReportReasonValue) {
    setError(null)
    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ targetType: "SUBMISSION", targetId, reason }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to report")
        setDone(data.message ?? "Thanks — a moderator will take a look.")
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (done) {
    return <p className="font-inter text-[13px] text-ink-muted">{done}</p>
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-sand px-3 py-1.5 font-inter text-[12.5px] text-ink-muted transition-colors hover:border-clay hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Report
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-sand bg-paper-card p-1.5 shadow-lg"
        >
          {error && <p className="px-2.5 py-1.5 font-inter text-[12px] text-clay">{error}</p>}
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => submit(r.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-inter text-[13px] text-ink-soft transition-colors",
                "hover:bg-paper-alt disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay",
              )}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
