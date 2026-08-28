"use client"

import { ModerationQueue } from "./ModerationQueue"

/** Moderation tab: both questions and contributions for this event, combined. */
export function ModerationTab({ eventId }: { eventId: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
      <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
        Moderation Queue
      </h2>
      <ModerationQueue eventId={eventId} />
    </div>
  )
}
