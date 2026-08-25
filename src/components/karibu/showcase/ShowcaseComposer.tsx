"use client"

/**
 * ShowcaseComposer — the /showcase/submit form.
 *
 * Same submission contract as the rest of the site's Karibu forms (CSRF
 * token fetched on mount, field-level errors read from the API's `details`
 * object — see KaribuSubmitProject) plus the showcase-specific pieces: a
 * media uploader, an emoji picker and a GIF picker on the full description,
 * a cover-image pick from the uploaded media, event linking, and the
 * needs/builtWith chips.
 *
 * Renders one of three states depending on `authState`: a sign-in prompt for
 * guests, a verify-email prompt for unverified members, and the form itself
 * for everyone else. The gate itself runs server-side in page.tsx — this
 * component just renders whichever state it's told.
 */

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Send, Loader2, Plus, X, AlertTriangle, CheckCircle2, LogIn, Mail } from "lucide-react"
import { Reveal } from "@/components/karibu/motion/Reveal"
import { KaribuSelect } from "@/components/karibu/KaribuSelect"
import { MediaUploader } from "@/components/karibu/showcase/MediaUploader"
import { EmojiPicker } from "@/components/karibu/showcase/EmojiPicker"
import { GifPicker } from "@/components/karibu/showcase/GifPicker"
import { NEEDS_OPTIONS, NEED_LABELS, type NeedKey } from "@/lib/showcase/constants"
import type { MediaDescriptor } from "@/lib/showcase/media"

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10"
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay"

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-red-500/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`

export interface ComposerEventOption {
  id: string
  title: string
  date: string
  city: string
}

export type ComposerAuthState =
  | { status: "guest" }
  | { status: "unverified" }
  | { status: "ready"; events: ComposerEventOption[] }

interface ShowcaseComposerProps {
  authState: ComposerAuthState
}

export function ShowcaseComposer({ authState }: ShowcaseComposerProps) {
  if (authState.status === "guest") return <SignInPrompt />
  if (authState.status === "unverified") return <VerifyEmailPrompt />
  return <ComposerForm events={authState.events} />
}

function SignInPrompt() {
  return (
    <section className={`${WRAP} py-24`} aria-label="Sign in to post to the showcase">
      <Reveal>
        <div className="mx-auto max-w-md rounded-2xl border border-sand bg-paper-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-newsreader text-[22px] text-ink">Sign in to post</h1>
          <p className="mx-auto mb-6 max-w-sm font-inter text-sm text-ink-soft">
            The showcase is where members share what they&apos;ve built with Claude. Sign in with your CCK
            account to post.
          </p>
          <Link
            href="/login?callbackUrl=/showcase/submit"
            className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
          >
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

function VerifyEmailPrompt() {
  const [csrfToken, setCsrfToken] = useState("")
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {})
  }, [])

  function handleResend() {
    if (!csrfToken) return
    startTransition(async () => {
      try {
        const res = await fetch("/api/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setStatus("error")
          setMessage(json.error || "Could not send the email. Please try again.")
          return
        }
        setStatus("sent")
        setMessage(json.message || "Verification email sent. Check your inbox.")
      } catch {
        setStatus("error")
        setMessage("Network error. Please check your connection and try again.")
      }
    })
  }

  return (
    <section className={`${WRAP} py-24`} aria-label="Verify your email to post to the showcase">
      <Reveal>
        <div className="mx-auto max-w-md rounded-2xl border border-sand bg-paper-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-newsreader text-[22px] text-ink">Verify your email</h1>
          <p className="mx-auto mb-6 max-w-sm font-inter text-sm text-ink-soft">
            Posting to the showcase needs a verified email address. Check your inbox for the link, or
            resend it below.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isPending || !csrfToken || status === "sent"}
            className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {status === "sent" ? "Sent" : "Resend verification email"}
          </button>
          {status === "sent" && (
            <p className="mt-3 inline-flex items-center gap-1.5 font-inter text-xs text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> {message}
            </p>
          )}
          {status === "error" && (
            <p className="mt-3 inline-flex items-center gap-1.5 font-inter text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" /> {message}
            </p>
          )}
        </div>
      </Reveal>
    </section>
  )
}

/** Generic add/remove pair for the tag-style inputs (project tags, models, skills, mcps). */
function useTagList(max: number) {
  const [items, setItems] = useState<string[]>([])
  const [input, setInput] = useState("")

  function add() {
    const value = input.trim()
    if (value && items.length < max && !items.includes(value)) {
      setItems((prev) => [...prev, value])
      setInput("")
    }
  }

  function remove(value: string) {
    setItems((prev) => prev.filter((v) => v !== value))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      add()
    }
  }

  return { items, setItems, input, setInput, add, remove, onKeyDown }
}

function ComposerForm({ events }: { events: ComposerEventOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [csrfToken, setCsrfToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [title, setTitle] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [fullDescription, setFullDescription] = useState("")
  const [projectUrl, setProjectUrl] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [eventId, setEventId] = useState("")
  const [needs, setNeeds] = useState<NeedKey[]>([])
  const [media, setMedia] = useState<MediaDescriptor[]>([])
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(undefined)
  const [tokensPerRun, setTokensPerRun] = useState("")

  const tags = useTagList(10)
  const models = useTagList(10)
  const skills = useTagList(20)
  const mcps = useTagList(20)

  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {})
  }, [])

  // A cover pick that no longer has a matching upload (removed from the
  // gallery) can't stay selected — the server rejects a coverImageUrl that
  // isn't one of the submitted media URLs.
  useEffect(() => {
    if (coverImageUrl && !media.some((m) => m.url === coverImageUrl)) {
      setCoverImageUrl(undefined)
    }
  }, [media, coverImageUrl])

  function insertEmoji(char: string) {
    const el = descriptionRef.current
    if (!el) {
      setFullDescription((prev) => prev + char)
      return
    }
    const start = el.selectionStart ?? fullDescription.length
    const end = el.selectionEnd ?? fullDescription.length
    const next = fullDescription.slice(0, start) + char + fullDescription.slice(end)
    setFullDescription(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + char.length
    })
  }

  function toggleNeed(key: NeedKey) {
    setNeeds((prev) => (prev.includes(key) ? prev.filter((n) => n !== key) : [...prev, key]))
  }

  const imageMedia = media.filter((m) => m.kind === "image")
  const eventOptions = [
    { value: "", label: "No linked event" },
    ...events.map((e) => ({ value: e.id, label: `${e.title} — ${e.date} (${e.city})` })),
  ]

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const hasBuiltWith = models.items.length > 0 || skills.items.length > 0 || mcps.items.length > 0 || tokensPerRun.trim() !== ""

    startTransition(async () => {
      try {
        const res = await fetch("/api/showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({
            title: title.trim(),
            shortDescription: shortDescription.trim(),
            fullDescription: fullDescription.trim(),
            url: projectUrl.trim() || undefined,
            repoUrl: repoUrl.trim() || undefined,
            tags: tags.items,
            coverImageUrl,
            media,
            eventId: eventId || undefined,
            needs,
            builtWith: hasBuiltWith
              ? {
                  models: models.items,
                  skills: skills.items,
                  mcps: mcps.items,
                  ...(tokensPerRun.trim() ? { tokensPerRun: Number(tokensPerRun) } : {}),
                }
              : undefined,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          if (json.details) setFieldErrors(json.details as Record<string, string>)
          setError(json.error || "Could not publish. Please try again.")
          return
        }
        router.push(`/showcase/${json.data.slug}`)
      } catch {
        setError("Network error. Please check your connection and try again.")
      }
    })
  }

  return (
    <>
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Post to the showcase header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Showcase · Onyesho</div>
          <h1 className="mb-4 max-w-[720px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Built something with <span className="italic text-clay">Claude?</span>
          </h1>
          <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Share it with the community — a screenshot, a demo clip, what you need help with next.
          </p>
        </Reveal>
      </section>

      <section className={`${WRAP} py-10`} aria-label="Showcase post form">
        <Reveal>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-5 font-newsreader text-[22px] text-ink">The basics</h2>
              <div className="space-y-4">
                <Field label="Title *" error={fieldErrors.title}>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    minLength={5}
                    maxLength={150}
                    placeholder="e.g. A Claude-powered farm dashboard"
                    className={inputCls(fieldErrors.title)}
                  />
                </Field>
                <Field label="Short description * (20–300 characters)" error={fieldErrors.shortDescription}>
                  <textarea
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    rows={2}
                    required
                    minLength={20}
                    maxLength={300}
                    placeholder="One or two sentences for the card view."
                    className={`${inputCls(fieldErrors.shortDescription)} resize-none`}
                  />
                </Field>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      Full description * (50–5000 characters)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <EmojiPicker onSelect={insertEmoji} />
                    </div>
                  </div>
                  <textarea
                    ref={descriptionRef}
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    rows={6}
                    required
                    minLength={50}
                    maxLength={5000}
                    placeholder="What does it do, how did you build it, what would you use it for?"
                    className={`${inputCls(fieldErrors.fullDescription)} resize-none`}
                  />
                  {fieldErrors.fullDescription && <FieldError msg={fieldErrors.fullDescription} />}
                  <div className="mt-2">
                    <p className="mb-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      Add a GIF
                    </p>
                    <GifPicker
                      onSelect={(descriptor) => {
                        setMedia((prev) => (prev.length >= 5 ? prev : [...prev, descriptor]))
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[22px] text-ink">Media</h2>
              <MediaUploader value={media} onChange={setMedia} csrfToken={csrfToken} disabled={isPending} />
              {fieldErrors.media && <FieldError msg={fieldErrors.media} />}

              {imageMedia.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    Cover image
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {imageMedia.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setCoverImageUrl(m.url)}
                        className={`overflow-hidden rounded-lg border-2 transition-colors ${
                          coverImageUrl === m.url ? "border-clay" : "border-transparent"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- R2-hosted upload thumbnail, not a Next-optimizable local asset */}
                        <img src={m.url} alt={m.alt || ""} className="h-16 w-16 object-cover" />
                      </button>
                    ))}
                  </div>
                  {fieldErrors.coverImageUrl && <FieldError msg={fieldErrors.coverImageUrl} />}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[22px] text-ink">Links &amp; event</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Project URL" error={fieldErrors.url}>
                  <input
                    type="url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://..."
                    className={inputCls(fieldErrors.url)}
                  />
                </Field>
                <Field label="Repository URL" error={fieldErrors.repoUrl}>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className={inputCls(fieldErrors.repoUrl)}
                  />
                </Field>
              </div>
              {events.length > 0 && (
                <div className="mt-4">
                  <KaribuSelect
                    id="showcase-event"
                    label="Linked event"
                    value={eventId}
                    onChange={setEventId}
                    options={eventOptions}
                    placeholder="No linked event"
                    error={fieldErrors.eventId}
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[22px] text-ink">Tags</h2>
              <TagInputField list={tags} placeholder="e.g. nextjs, mcp, agriculture" maxLength={30} error={fieldErrors.tags} />
            </div>

            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-1 font-newsreader text-[22px] text-ink">What do you need?</h2>
              <p className="mb-4 font-inter text-xs text-ink-muted">Optional — pick what would help you move this forward.</p>
              <div className="flex flex-wrap gap-2">
                {NEEDS_OPTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleNeed(key)}
                    className={`rounded-full border px-3 py-1.5 font-inter text-xs transition-colors ${
                      needs.includes(key)
                        ? "border-clay bg-clay/10 text-clay"
                        : "border-sand-2 text-ink-soft hover:border-clay/50"
                    }`}
                  >
                    {NEED_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-1 font-newsreader text-[22px] text-ink">Built with</h2>
              <p className="mb-4 font-inter text-xs text-ink-muted">Optional — the models, skills and MCPs behind it.</p>
              <div className="space-y-4">
                <Field label="Models">
                  <TagInputField list={models} placeholder="e.g. Opus 5, Sonnet 5" maxLength={60} />
                </Field>
                <Field label="Skills">
                  <TagInputField list={skills} placeholder="e.g. message-drafter" maxLength={60} />
                </Field>
                <Field label="MCPs">
                  <TagInputField list={mcps} placeholder="e.g. Notion, Gmail" maxLength={60} />
                </Field>
                <Field label="Tokens per run (optional)">
                  <input
                    type="number"
                    min={1}
                    value={tokensPerRun}
                    onChange={(e) => setTokensPerRun(e.target.value)}
                    placeholder="e.g. 250000"
                    className={inputCls()}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 font-inter text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !csrfToken}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Publish to the showcase
                </>
              )}
            </button>
          </form>
        </Reveal>
      </section>
    </>
  )
}

interface TagListState {
  items: string[]
  input: string
  setInput: (v: string) => void
  add: () => void
  remove: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

function TagInputField({
  list,
  placeholder,
  maxLength,
  error,
}: {
  list: TagListState
  placeholder: string
  maxLength: number
  error?: string
}) {
  return (
    <div className="space-y-2">
      {list.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {list.items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-sand-2 bg-paper px-2.5 py-1 font-inter text-[11px] text-ink-soft"
            >
              {item}
              <button
                type="button"
                onClick={() => list.remove(item)}
                className="text-ink-muted transition-colors hover:text-clay"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={list.input}
          onChange={(e) => list.setInput(e.target.value)}
          onKeyDown={list.onKeyDown}
          maxLength={maxLength}
          placeholder={placeholder}
          className={inputCls(error)}
        />
        <button
          type="button"
          onClick={list.add}
          className="flex items-center gap-1 rounded-lg border border-sand-2 px-3 py-2 font-inter text-xs text-ink-soft transition-colors hover:border-clay hover:text-clay"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {error && <FieldError msg={error} />}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </label>
      {children}
      {error && <FieldError msg={error} />}
    </div>
  )
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 font-inter text-[11px] text-red-600">{msg}</p>
}
