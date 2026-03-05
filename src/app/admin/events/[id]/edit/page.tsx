"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react"

const EVENT_TYPES = ["MEETUP", "WORKSHOP", "CAREER_TALK", "HACKATHON", "CONFERENCE"] as const
const EVENT_STATUSES = ["UPCOMING", "REGISTRATION_OPEN", "SOLD_OUT", "COMPLETED", "CANCELLED"] as const

const TYPE_LABELS: Record<string, string> = {
  MEETUP: "Meetup",
  WORKSHOP: "Workshop",
  CAREER_TALK: "Career Talk",
  HACKATHON: "Hackathon",
  CONFERENCE: "Conference",
}

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Upcoming",
  REGISTRATION_OPEN: "Registration Open",
  SOLD_OUT: "Sold Out",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

interface EventData {
  id: string
  title: string
  description: string
  fullDescription: string | null
  date: string
  time: string
  venue: string
  city: string
  type: string
  status: string
  host: string | null
  partnerOrg: string | null
  registrationUrl: string | null
  lumaUrl: string | null
  featured: boolean
  attendeeCount: number | null
  highlights: string[] | null
  agenda: string[] | null
}

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [fullDescription, setFullDescription] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [venue, setVenue] = useState("")
  const [city, setCity] = useState("")
  const [type, setType] = useState("MEETUP")
  const [status, setStatus] = useState("UPCOMING")
  const [host, setHost] = useState("")
  const [partnerOrg, setPartnerOrg] = useState("")
  const [registrationUrl, setRegistrationUrl] = useState("")
  const [lumaUrl, setLumaUrl] = useState("")
  const [featured, setFeatured] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState("")
  const [agenda, setAgenda] = useState<string[]>([])
  const [highlights, setHighlights] = useState<string[]>([])

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/admin/events/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to fetch event")
        const ev: EventData = json.data
        setTitle(ev.title)
        setDescription(ev.description)
        setFullDescription(ev.fullDescription ?? "")
        setDate(ev.date.split("T")[0])
        setTime(ev.time)
        setVenue(ev.venue)
        setCity(ev.city)
        setType(ev.type)
        setStatus(ev.status)
        setHost(ev.host ?? "")
        setPartnerOrg(ev.partnerOrg ?? "")
        setRegistrationUrl(ev.registrationUrl ?? "")
        setLumaUrl(ev.lumaUrl ?? "")
        setFeatured(ev.featured)
        setAttendeeCount(ev.attendeeCount !== null ? String(ev.attendeeCount) : "")
        setAgenda(ev.agenda ?? [])
        setHighlights(ev.highlights ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event")
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const body: Record<string, unknown> = {
          title,
          description,
          fullDescription: fullDescription || undefined,
          date: new Date(date).toISOString(),
          time,
          venue,
          city,
          type,
          status,
          host: host || undefined,
          partnerOrg: partnerOrg || undefined,
          registrationUrl: registrationUrl || undefined,
          lumaUrl: lumaUrl || undefined,
          featured,
          agenda: agenda.filter(Boolean),
          highlights: highlights.filter(Boolean),
        }

        if (attendeeCount) {
          body.attendeeCount = parseInt(attendeeCount, 10)
        }

        const res = await fetch(`/api/admin/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(body),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update event")
        setSuccess(true)
        router.push(`/admin/events/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (loading) {
    return (
      <div>
        <header className="h-14 border-b border-[#1e1e1e] bg-[#0d0d0d] px-6 flex items-center"><h1 className="text-sm font-mono font-semibold text-[#e0e0e0] tracking-wide">Edit Event</h1></header>
        <div className="p-6 flex items-center gap-2 text-sm font-mono text-[#555]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading event...
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="h-14 border-b border-[#1e1e1e] bg-[#0d0d0d] px-6 flex items-center"><h1 className="text-sm font-mono font-semibold text-[#e0e0e0] tracking-wide">Edit Event</h1></header>
      <div className="p-6 max-w-3xl space-y-4">
        <Link href={`/admin/events/${id}`} className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to event
        </Link>

        {error && (
          <div className="p-3 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41]">
            Event updated successfully. Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Description */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Basic Info</h2>
            <FieldInput label="Title" value={title} onChange={setTitle} required />
            <FieldTextarea label="Description" value={description} onChange={setDescription} rows={3} required />
            <FieldTextarea label="Full Description" value={fullDescription} onChange={setFullDescription} rows={5} />
          </div>

          {/* Date, Time, Venue */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Schedule & Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="Date" type="date" value={date} onChange={setDate} required />
              <FieldInput label="Time" value={time} onChange={setTime} placeholder="e.g. 2:00 PM - 5:00 PM" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="Venue" value={venue} onChange={setVenue} required />
              <FieldInput label="City" value={city} onChange={setCity} required />
            </div>
          </div>

          {/* Type, Status, Featured */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Classification</h2>
            <div className="grid grid-cols-2 gap-4">
              <FieldSelect label="Type" value={type} onChange={setType} options={EVENT_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))} />
              <FieldSelect label="Status" value={status} onChange={setStatus} options={EVENT_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="Attendee Count" type="number" value={attendeeCount} onChange={setAttendeeCount} placeholder="Optional" />
              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 bg-[#111] border border-[#1e1e1e] rounded accent-[#00ff41]"
                />
                <label htmlFor="featured" className="text-xs font-mono text-[#888]">Featured event</label>
              </div>
            </div>
          </div>

          {/* Organizer & Links */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Organizer & Links</h2>
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="Host" value={host} onChange={setHost} placeholder="Optional" />
              <FieldInput label="Partner Org" value={partnerOrg} onChange={setPartnerOrg} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="Registration URL" type="url" value={registrationUrl} onChange={setRegistrationUrl} placeholder="Optional" />
              <FieldInput label="Luma URL" type="url" value={lumaUrl} onChange={setLumaUrl} placeholder="Optional" />
            </div>
          </div>

          {/* Agenda */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Agenda</h2>
            <DynamicList items={agenda} onChange={setAgenda} placeholder="e.g. 2:00 PM - Welcome & Introductions" />
          </div>

          {/* Highlights */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Highlights</h2>
            <DynamicList items={highlights} onChange={setHighlights} placeholder="e.g. Live coding demo" />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              href={`/admin/events/${id}`}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-xs font-mono text-[#888] transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-xs font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Reusable Form Components ────────────────────────────────────────── */

function FieldInput({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean
}) {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-[11px] font-mono text-[#555] mb-1.5">
        {label}{required && <span className="text-[#ff3333] ml-0.5">*</span>}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
      />
    </div>
  )
}

function FieldTextarea({
  label, value, onChange, rows = 3, required,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; required?: boolean
}) {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-[11px] font-mono text-[#555] mb-1.5">
        {label}{required && <span className="text-[#ff3333] ml-0.5">*</span>}
      </label>
      <textarea
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 resize-none"
      />
    </div>
  )
}

function FieldSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function DynamicList({
  items, onChange, placeholder,
}: {
  items: string[]; onChange: (items: string[]) => void; placeholder?: string
}) {
  function addItem() {
    onChange([...items, ""])
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, value: string) {
    const updated = [...items]
    updated[index] = value
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#333] w-5 text-right">{i + 1}.</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            className="p-1.5 text-[#555] hover:text-[#ff3333] transition-colors"
            aria-label={`Remove item ${i + 1}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-[#00ff41] transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add item
      </button>
    </div>
  )
}
