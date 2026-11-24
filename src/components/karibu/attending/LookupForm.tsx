"use client"

/**
 * Step 1 of the attending flow: type the email your Luma ticket went to.
 *
 * This is the ONLY file in the attending flow that talks to the server, and it
 * sees nothing but the email: no photo and no name ever reach it. The email is
 * sent in a POST body (never a URL), cleared from the field as soon as the
 * answer arrives, and never kept in state afterwards.
 */

import { useState } from "react"
import { Loader2 } from "lucide-react"

interface LookupFormProps {
  slug: string
  onFound: () => void
}

const NOT_FOUND_COPY = "We could not find that email. Use the email your Luma ticket was sent to."
const BUSY_COPY = "Too many tries. Please wait a while and try again."
const DOWN_COPY = "This is not available right now. Please try again later."
const INPUT =
  "w-full rounded-lg border border-sand-2 bg-paper-card px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"

/** Maps a lookup response to the message to show, or null when the guest was found. */
async function interpret(response: Response): Promise<string | null> {
  if (response.status === 429) return BUSY_COPY
  if (!response.ok) return DOWN_COPY
  const body = (await response.json()) as { found?: boolean }
  return body.found === true ? null : NOT_FOUND_COPY
}

export function LookupForm({ slug, onFound }: LookupFormProps) {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/attending/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const problem = await interpret(response)
      setEmail("")
      if (problem) setMessage(problem)
      else onFound()
    } catch {
      setMessage(DOWN_COPY)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block font-inter text-[14px] font-semibold text-ink" htmlFor="attending-email">
        The email your Luma ticket was sent to
      </label>
      <input
        id="attending-email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className={INPUT}
      />
      <button
        type="submit"
        disabled={busy || email.trim() === ""}
        className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Find me
      </button>
      {message && (
        <p role="status" className="font-inter text-[14px] text-ink-soft">
          {message}
        </p>
      )}
    </form>
  )
}
