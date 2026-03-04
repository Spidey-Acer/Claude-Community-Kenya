import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; classes: string }> = {
  PENDING: { label: "Pending", classes: "bg-[#ffb000]/10 text-[#ffb000] border-[#ffb000]/30" },
  UNDER_REVIEW: { label: "Under Review", classes: "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30" },
  APPROVED: { label: "Approved", classes: "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" },
  REJECTED: { label: "Rejected", classes: "bg-[#ff3333]/10 text-[#ff3333] border-[#ff3333]/30" },
  UNREAD: { label: "Unread", classes: "bg-[#ffb000]/10 text-[#ffb000] border-[#ffb000]/30" },
  READ: { label: "Read", classes: "bg-[#666]/10 text-[#888] border-[#444]/30" },
  REPLIED: { label: "Replied", classes: "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" },
  ARCHIVED: { label: "Archived", classes: "bg-[#333]/10 text-[#555] border-[#333]/30" },
  UPCOMING: { label: "Upcoming", classes: "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30" },
  REGISTRATION_OPEN: { label: "Open", classes: "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" },
  SOLD_OUT: { label: "Sold Out", classes: "bg-[#ffb000]/10 text-[#ffb000] border-[#ffb000]/30" },
  COMPLETED: { label: "Completed", classes: "bg-[#666]/10 text-[#888] border-[#444]/30" },
  CANCELLED: { label: "Cancelled", classes: "bg-[#ff3333]/10 text-[#ff3333] border-[#ff3333]/30" },
  DRAFT: { label: "Draft", classes: "bg-[#666]/10 text-[#888] border-[#444]/30" },
  PUBLISHED: { label: "Published", classes: "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, classes: "bg-[#333]/10 text-[#666] border-[#333]/30" }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border", config.classes)}>
      {config.label}
    </span>
  )
}
