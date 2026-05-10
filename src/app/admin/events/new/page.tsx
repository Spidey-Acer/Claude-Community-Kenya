"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Save, Loader2, Plus, X, Upload, Trash2 } from "lucide-react"
import { AUDIENCES, INTENTS, type Audience, type Intent } from "@/lib/karibu/types"

const EVENT_TYPES = ["MEETUP", "WORKSHOP", "CAREER_TALK", "HACKATHON", "CONFERENCE"] as const
const EVENT_STATUSES = ["UPCOMING", "REGISTRATION_OPEN", "SOLD_OUT", "COMPLETED", "CANCELLED"] as const

const AUDIENCE_LABELS: Record<Audience, string> = {
  dev: "Developer",
  non_tech_pro: "Non-tech professional",
  student: "Student",
  founder: "Founder",
  creator: "Creator / Educator",
}

const INTENT_LABELS: Record<Intent, string> = {
  learn_basics: "Learn basics",
  find_event: "Find an event",
  find_collaborators: "Find collaborators",
  build: "Build something",
  hire_or_partner: "Hire / partner",
  other: "Other",
}

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

export default function NewEventPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
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
  const [posterUrl, setPosterUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [agenda, setAgenda] = useState<string[]>([])
  const [highlights, setHighlights] = useState<string[]>([])
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [intents, setIntents] = useState<Intent[]>([])

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
          posterUrl: posterUrl || undefined,
          agenda: agenda.filter(Boolean),
          highlights: highlights.filter(Boolean),
          audiences,
          intents,
        }

        if (attendeeCount) {
          body.attendeeCount = parseInt(attendeeCount, 10)
        }

        const res = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(body),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create event")
        setSuccess(true)
        router.push("/admin/events")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div>
      <header className="h-14 border-b border-[#1e1e1e] bg-[#0d0d0d] px-6 flex items-center"><h1 className="text-sm font-mono font-semibold text-[#e0e0e0] tracking-wide">New Event</h1></header>
      <div className="p-6 max-w-3xl space-y-4">
        <Link href="/admin/events" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to events
        </Link>

        {error && (
          <div className="p-3 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41]">
            Event created successfully. Redirecting...
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

          {/* Event Poster */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Event Poster</h2>
            <PosterUpload
              posterUrl={posterUrl}
              onUpload={setPosterUrl}
              onRemove={() => setPosterUrl("")}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
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

          {/* Audiences & Intents */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Personalization Tags</h2>
            <fieldset className="space-y-2">
              <legend className="font-mono text-xs text-[#555]">Audiences</legend>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCES.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-xs font-mono text-[#888] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={audiences.includes(a)}
                      onChange={(e) =>
                        setAudiences(e.target.checked ? [...audiences, a] : audiences.filter((x) => x !== a))
                      }
                      className="accent-[#00ff41]"
                    />
                    {AUDIENCE_LABELS[a]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="font-mono text-xs text-[#555]">Intents</legend>
              <div className="grid grid-cols-2 gap-2">
                {INTENTS.map((i) => (
                  <label key={i} className="flex items-center gap-2 text-xs font-mono text-[#888] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={intents.includes(i)}
                      onChange={(e) =>
                        setIntents(e.target.checked ? [...intents, i] : intents.filter((x) => x !== i))
                      }
                      className="accent-[#00ff41]"
                    />
                    {INTENT_LABELS[i]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/admin/events"
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
              Create Event
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

function PosterUpload({
  posterUrl, onUpload, onRemove, isUploading, setIsUploading,
}: {
  posterUrl: string; onUpload: (url: string) => void; onRemove: () => void; isUploading: boolean; setIsUploading: (v: boolean) => void
}) {
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const csrfRes = await fetch("/api/csrf-token")
      const { csrfToken } = await csrfRes.json()

      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "events")

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      onUpload(data.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  if (posterUrl) {
    return (
      <div className="space-y-3">
        <div className="relative w-full max-w-xs overflow-hidden rounded-lg border border-[#1e1e1e]">
          <Image src={posterUrl} alt="Event poster" width={320} height={180} className="w-full h-auto object-cover" />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 text-[11px] font-mono text-[#ff3333] hover:text-[#ff5555] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Remove poster
        </button>
      </div>
    )
  }

  return (
    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#1e1e1e] rounded-lg cursor-pointer hover:border-[#00ff41]/30 transition-colors">
      {isUploading ? (
        <Loader2 className="w-5 h-5 text-[#00ff41] animate-spin" />
      ) : (
        <>
          <Upload className="w-5 h-5 text-[#555] mb-2" />
          <span className="text-[11px] font-mono text-[#555]">Click to upload poster</span>
          <span className="text-[10px] font-mono text-[#333] mt-1">JPEG, PNG, WebP, GIF — max 5MB</span>
        </>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
    </label>
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
