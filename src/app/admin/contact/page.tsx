"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  MessageSquare,
  Mail,
  Eye,
  Reply,
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Send,
  Inbox,
} from "lucide-react"

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: "UNREAD" | "READ" | "REPLIED" | "ARCHIVED"
  replyText: string | null
  repliedAt: string | null
  createdAt: string
  updatedAt: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  UNREAD: { label: "Unread", classes: "bg-[#ffb000]/10 text-[#ffb000] border-[#ffb000]/30" },
  READ: { label: "Read", classes: "bg-[#666]/10 text-[#888] border-[#444]/30" },
  REPLIED: { label: "Replied", classes: "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" },
  ARCHIVED: { label: "Archived", classes: "bg-[#333]/10 text-[#555] border-[#333]/30" },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, classes: "bg-[#333]/10 text-[#666] border-[#333]/30" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${config.classes}`}>
      {config.label}
    </span>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ContactAdminPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [replyText, setReplyText] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchMessages = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/admin/contact?${params}`)
      if (!res.ok) throw new Error("Failed to fetch messages")
      const json = await res.json() as { success: boolean; data: ContactMessage[]; pagination: PaginationData }
      setMessages(json.data)
      setPagination(json.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchMessages(1)
  }, [fetchMessages])

  async function handleStatusUpdate(id: string, status: string, reply?: string) {
    setError(null)
    setActionSuccess(null)

    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json() as { csrfToken: string }

        const body: Record<string, string> = { status }
        if (reply) body.replyText = reply

        const res = await fetch(`/api/admin/contact/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(body),
        })
        const data = await res.json() as { success: boolean; error?: string; data?: ContactMessage }
        if (!res.ok) throw new Error(data.error || "Failed to update")

        setActionSuccess(`Message marked as ${status.toLowerCase()}`)

        if (data.data && selectedMessage?.id === id) {
          setSelectedMessage(data.data)
        }

        setReplyText("")
        void fetchMessages(pagination.page)

        setTimeout(() => setActionSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  function handleSelectMessage(msg: ContactMessage) {
    setSelectedMessage(msg)
    setReplyText("")
    setError(null)
    setActionSuccess(null)

    if (msg.status === "UNREAD") {
      void handleStatusUpdate(msg.id, "READ")
    }
  }

  const counts = {
    total: pagination.total,
    unread: messages.filter((m) => m.status === "UNREAD").length,
    replied: messages.filter((m) => m.status === "REPLIED").length,
  }

  return (
    <div>
      {/* Header */}
      <header className="h-14 border-b border-[#1e1e1e] bg-[#0d0d0d] px-6 flex items-center">
        <h1 className="text-sm font-mono font-semibold text-[#e0e0e0] tracking-wide">Contact Messages</h1>
      </header>

      <div className="p-6 space-y-4">
        {/* Stats Cards */}
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

        {/* Status Filter */}
        <div className="flex gap-2">
          {[
            { label: "All", value: null },
            { label: "Unread", value: "UNREAD" },
            { label: "Read", value: "READ" },
            { label: "Replied", value: "REPLIED" },
            { label: "Archived", value: "ARCHIVED" },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded text-[11px] font-mono font-semibold border transition-all ${
                statusFilter === value
                  ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]"
                  : "bg-[#0d0d0d] border-[#1e1e1e] text-[#555] hover:text-[#888] hover:border-[#333]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="p-2.5 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
            {error}
          </div>
        )}
        {actionSuccess && (
          <div className="p-2.5 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41]">
            {actionSuccess}
          </div>
        )}

        {/* Main Content */}
        <div className="flex gap-4">
          {/* Message List */}
          <div className={`bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden ${selectedMessage ? "w-1/2" : "w-full"} transition-all`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="w-6 h-6 text-[#00ff41] animate-spin mb-3" />
                <p className="text-xs font-mono text-[#555]">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="w-8 h-8 text-[#333] mb-3" />
                <p className="text-sm font-mono text-[#555]">No messages found</p>
              </div>
            ) : (
              <div className="divide-y divide-[#141414]">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left p-4 hover:bg-[#111] transition-colors ${
                      selectedMessage?.id === msg.id ? "bg-[#111] border-l-2 border-l-[#00ff41]" : ""
                    } ${msg.status === "UNREAD" ? "bg-[#0f0f0f]" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-semibold ${msg.status === "UNREAD" ? "text-[#e0e0e0]" : "text-[#999]"}`}>
                          {msg.name}
                        </span>
                        <StatusBadge status={msg.status} />
                      </div>
                      <span className="text-[10px] font-mono text-[#333] shrink-0 ml-2">{formatDate(msg.createdAt)}</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-[#888] mb-1 truncate">{msg.subject}</div>
                    <p className="text-[11px] font-mono text-[#555] leading-relaxed truncate">{msg.message}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e1e1e]">
                <span className="text-[10px] font-mono text-[#444]">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => void fetchMessages(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded border border-[#1e1e1e] text-[#555] hover:text-[#888] hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void fetchMessages(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded border border-[#1e1e1e] text-[#555] hover:text-[#888] hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedMessage && (
            <div className="w-1/2 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden flex flex-col">
              {/* Detail Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#00ff41]" />
                  <span className="text-xs font-mono font-semibold text-[#e0e0e0]">Message Detail</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedMessage(null)
                    setReplyText("")
                  }}
                  className="p-1 rounded hover:bg-[#1e1e1e] text-[#555] hover:text-[#888] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Sender Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-mono font-bold text-[#e0e0e0]">{selectedMessage.name}</h2>
                    <StatusBadge status={selectedMessage.status} />
                  </div>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-[#00d4ff] hover:underline"
                  >
                    <Mail className="w-3 h-3" />
                    {selectedMessage.email}
                  </a>
                  <div className="text-[10px] font-mono text-[#444]">
                    Received: {formatDateTime(selectedMessage.createdAt)}
                  </div>
                </div>

                {/* Subject & Message */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-semibold text-[#888]">{selectedMessage.subject}</div>
                  <div className="bg-[#111] border border-[#1a1a1a] rounded p-4">
                    <p className="text-[12px] font-mono text-[#ccc] leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>
                </div>

                {/* Existing Reply */}
                {selectedMessage.replyText && (
                  <div className="pl-3 border-l-2 border-[#00ff41]/30 space-y-1">
                    <div className="text-[10px] font-mono text-[#00ff41]">
                      Reply sent {selectedMessage.repliedAt ? formatDateTime(selectedMessage.repliedAt) : ""}
                    </div>
                    <p className="text-[11px] font-mono text-[#888] leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.replyText}
                    </p>
                  </div>
                )}

                {/* Reply Form */}
                {selectedMessage.status !== "ARCHIVED" && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label
                        htmlFor="reply-text"
                        className="block text-[11px] font-mono text-[#555] mb-1.5"
                      >
                        {selectedMessage.status === "REPLIED" ? "Update Reply" : "Reply"}
                      </label>
                      <textarea
                        id="reply-text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={4}
                        placeholder="Type your reply to this message..."
                        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedMessage.status !== "ARCHIVED" && (
                <div className="px-5 py-3 border-t border-[#1e1e1e] space-y-2">
                  <div className="flex gap-2">
                    {selectedMessage.status === "UNREAD" && (
                      <button
                        onClick={() => void handleStatusUpdate(selectedMessage.id, "READ")}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#666]/10 hover:bg-[#666]/20 border border-[#444]/30 rounded text-[11px] font-mono font-semibold text-[#888] transition-all disabled:opacity-50"
                      >
                        <Eye className="w-3 h-3" />
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (replyText.trim()) {
                          void handleStatusUpdate(selectedMessage.id, "REPLIED", replyText.trim())
                        }
                      }}
                      disabled={isPending || !replyText.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Send Reply
                    </button>
                    <button
                      onClick={() => void handleStatusUpdate(selectedMessage.id, "ARCHIVED")}
                      disabled={isPending}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#333]/10 hover:bg-[#333]/20 border border-[#333]/30 rounded text-[11px] font-mono font-semibold text-[#555] transition-all disabled:opacity-50"
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
