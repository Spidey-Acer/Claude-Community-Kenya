import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { formatDate } from "@/lib/utils"
import { MessageSquare, Mail } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ContactAdminPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  })

  const counts = {
    total: messages.length,
    unread: messages.filter((m) => m.status === "UNREAD").length,
    replied: messages.filter((m) => m.status === "REPLIED").length,
  }

  return (
    <div>
      <AdminHeader title="Contact Messages" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: counts.total, color: "#888" },
            { label: "Unread", value: counts.unread, color: "#ffb000" },
            { label: "Replied", value: counts.replied, color: "#00ff41" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
              <div className="text-xl font-mono font-bold" style={{ color }}>{value}</div>
              <div className="text-[10px] font-mono text-[#555]">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No messages yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#141414]">
              {messages.map((msg) => (
                <div key={msg.id} className="p-5 hover:bg-[#111] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-[#e0e0e0]">{msg.name}</span>
                        <StatusBadge status={msg.status} />
                      </div>
                      <a href={`mailto:${msg.email}`} className="flex items-center gap-1.5 text-[11px] font-mono text-[#00d4ff] hover:underline mt-0.5">
                        <Mail className="w-3 h-3" />
                        {msg.email}
                      </a>
                    </div>
                    <span className="text-[10px] font-mono text-[#333]">{formatDate(msg.createdAt.toISOString())}</span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-[#888] mb-1">{msg.subject}</div>
                  <p className="text-[11px] font-mono text-[#555] leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  {msg.replyText && (
                    <div className="mt-3 pl-3 border-l border-[#00ff41]/30">
                      <div className="text-[10px] font-mono text-[#00ff41] mb-1">Reply sent</div>
                      <p className="text-[11px] font-mono text-[#666]">{msg.replyText}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
